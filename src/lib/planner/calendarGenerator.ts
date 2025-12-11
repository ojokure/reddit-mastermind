import { v4 as uuidv4 } from 'uuid';
import {
  PlannerInput,
  CalendarWeek,
  PlannedPost,
  PlannedComment,
  PlannerHistory,
  GuardrailViolation,
} from '@/types';
import { calculateWeeklyCapacity, getOptimalPostingDays } from './capacity';
import { selectTopics, TopicSelection } from './topicSelector';
import { assignPersonas, PersonaAssignment } from './personaAssigner';
import { 
  selectPostingDays, 
  generatePostTime, 
  scheduleComments, 
  getDayOfWeekName,
  getWeekStart,
  getNextWeekStart,
  spreadPosts,
} from './scheduler';
import { 
  calculateQualityScore, 
  calculateHybridQualityScore,
  MIN_QUALITY_SCORE 
} from './qualityScorer';
import { validateCalendarWeek, GUARDRAIL_RULES } from './guardrails';
import { 
  getHistory, 
  saveHistory, 
  recordCalendarWeek,
  resetWeeklyCounters,
} from '../storage/historyStorage';
import {
  generatePostContent,
  generateCommentThread,
  ContentGenerationContext,
  CommentGenerationContext,
  ContentGenerationMode,
  getOpenAIProvider,
} from '../llm';

// ============================================
// Generation Options
// ============================================

export interface GenerationOptions {
  mode: ContentGenerationMode;  // 'titles-only' | 'full-content'
  useLLMScoring: boolean;       // Use LLM for quality scoring
  llmWeight?: number;           // Weight of LLM score (0-1, default 0.3)
  openAIApiKey?: string;        // Optional API key override
}

export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  mode: 'titles-only',
  useLLMScoring: false,
  llmWeight: 0.3,
};

// ============================================
// Calendar Generation Result
// ============================================

export interface CalendarGenerationResult {
  success: boolean;
  calendar?: CalendarWeek;
  error?: string;
  warnings: string[];
  guardrailViolations: GuardrailViolation[];
  stats: {
    postsGenerated: number;
    postsRejected: number;
    averageQualityScore: number;
    llmTokensUsed?: number;
  };
  generationMode: ContentGenerationMode;
}

// ============================================
// Main Calendar Generation
// ============================================

/**
 * Generate a content calendar for the specified week
 */
export async function generateCalendar(
  input: PlannerInput,
  weekStart?: Date,
  options: GenerationOptions = DEFAULT_GENERATION_OPTIONS
): Promise<CalendarGenerationResult> {
  const warnings: string[] = [];
  const allViolations: GuardrailViolation[] = [];
  let postsRejected = 0;
  
  // Initialize LLM provider if API key provided
  if (options.openAIApiKey) {
    getOpenAIProvider(options.openAIApiKey);
  }
  
  const isFullContentMode = options.mode === 'full-content';
  const llmProvider = getOpenAIProvider();
  const llmAvailable = llmProvider.isConfigured();
  
  if (isFullContentMode && !llmAvailable) {
    warnings.push('Full content mode requested but OpenAI API key not configured. Using titles-only mode.');
  }
  
  // Determine week start
  const targetWeekStart = weekStart || getNextWeekStart();
  const targetWeekEnd = new Date(targetWeekStart);
  targetWeekEnd.setDate(targetWeekEnd.getDate() + 6);
  
  // Get history
  let history = getHistory();
  
  // Reset weekly counters if this is a new week
  history = resetWeeklyCounters(history);
  
  // Step 1: Calculate weekly capacity
  const capacity = calculateWeeklyCapacity(input, history, targetWeekStart);
  
  if (capacity.totalSlots === 0) {
    return {
      success: false,
      error: 'No available slots for posting this week. Check subreddit and persona limits.',
      warnings,
      guardrailViolations: [],
      stats: {
        postsGenerated: 0,
        postsRejected: 0,
        averageQualityScore: 0,
      },
      generationMode: options.mode,
    };
  }
  
  if (capacity.constraintReason) {
    warnings.push(capacity.constraintReason);
  }
  
  const numPosts = Math.min(input.postsPerWeek, capacity.totalSlots);
  
  // Step 2: Select posting days
  const postingDays = selectPostingDays(targetWeekStart, numPosts);
  
  // Step 3: Select topics
  const topics = selectTopics({
    themes: input.themes,
    subreddits: input.subreddits,
    company: input.company,
    history,
    numTopicsNeeded: numPosts,
  });
  
  if (topics.length < numPosts) {
    warnings.push(`Only ${topics.length} valid topics found. Requested ${numPosts} posts.`);
  }
  
  // Step 4: Generate posts
  const posts: PlannedPost[] = [];
  const assignedOPs: string[] = [];
  
  for (let i = 0; i < Math.min(topics.length, postingDays.length); i++) {
    const topic = topics[i];
    const day = postingDays[i];
    
    // Assign personas
    const assignment = assignPersonas({
      availablePersonas: capacity.availablePersonas,
      day,
      theme: topic.theme,
      subreddit: topic.subreddit,
      postType: topic.postType,
      company: input.company,
      history,
      alreadyAssignedOPs: assignedOPs,
    });
    
    if (!assignment) {
      warnings.push(`Could not assign persona for post ${i + 1}. Skipping.`);
      postsRejected++;
      continue;
    }
    
    assignedOPs.push(assignment.op.id);
    
    // Generate post content (LLM or fallback)
    let postTitle = topic.title;
    let postBody = topic.bodyPreview;
    
    if (isFullContentMode && llmAvailable) {
      try {
        const contentContext: ContentGenerationContext = {
          company: {
            name: input.company.name,
            description: input.company.description,
            painPoints: input.company.painPoints,
          },
          persona: {
            username: assignment.op.username,
            info: assignment.op.info,
            role: assignment.op.role,
            tone: assignment.op.tone,
          },
          subreddit: {
            name: topic.subreddit.name,
            culture: topic.subreddit.culture,
          },
          theme: {
            keyword: topic.theme.keyword,
            category: topic.theme.category,
          },
          postType: topic.postType,
        };
        
        const generatedContent = await generatePostContent(contentContext, llmProvider);
        postTitle = generatedContent.title;
        postBody = generatedContent.body;
      } catch (error) {
        console.error('LLM content generation failed:', error);
        warnings.push(`Post ${i + 1}: LLM generation failed, using fallback content`);
      }
    }
    
    // Generate post time
    const scheduledTime = generatePostTime(day);
    
    // Generate comments (LLM or fallback)
    let scheduledComments: PlannedComment[];
    
    if (isFullContentMode && llmAvailable) {
      try {
        const commentContext: CommentGenerationContext = {
          company: {
            name: input.company.name,
            description: input.company.description,
            painPoints: input.company.painPoints,
          },
          persona: {
            username: assignment.op.username,
            info: assignment.op.info,
            role: assignment.op.role,
            tone: assignment.op.tone,
          },
          subreddit: {
            name: topic.subreddit.name,
            culture: topic.subreddit.culture,
          },
          theme: {
            keyword: topic.theme.keyword,
            category: topic.theme.category,
          },
          postType: topic.postType,
          postTitle,
          postBody,
          commenterPersona: assignment.commenters[0] || assignment.op,
          isFirstComment: true,
        };
        
        const commenterPersonas = assignment.commenters.map(c => ({
          username: c.username,
          info: c.info,
          role: c.role,
          tone: c.tone,
        }));
        
        const generatedComments = await generateCommentThread(
          commentContext,
          assignment.comments.length,
          commenterPersonas,
          llmProvider
        );
        
        // Map generated comments to PlannedComment with timing
        scheduledComments = assignment.comments.map((originalComment, idx) => {
          const generated = generatedComments[idx];
          const commentTime = new Date(scheduledTime);
          commentTime.setMinutes(commentTime.getMinutes() + originalComment.delayMinutes);
          
          return {
            ...originalComment,
            seedText: generated?.text || originalComment.seedText,
            timing: commentTime,
          };
        });
      } catch (error) {
        console.error('LLM comment generation failed:', error);
        scheduledComments = scheduleComments(scheduledTime, assignment.comments);
      }
    } else {
      scheduledComments = scheduleComments(scheduledTime, assignment.comments);
    }
    
    // Create post object
    const isFullContent = isFullContentMode && llmAvailable;
    const post: PlannedPost = {
      id: uuidv4(),
      day,
      dayOfWeek: getDayOfWeekName(day),
      subreddit: topic.subreddit,
      persona: assignment.op,
      title: postTitle,
      bodyPreview: isFullContent ? postBody.substring(0, 150) + (postBody.length > 150 ? '...' : '') : postBody,
      postBody: isFullContent ? postBody : undefined,
      postType: topic.postType,
      themeIds: [topic.theme.id],
      comments: scheduledComments,
      qualityScore: 0,
      qualityFactors: [],
      scheduledTime,
    };
    
    // Step 5: Calculate quality score (hybrid if LLM scoring enabled)
    const useLLMScoring = options.useLLMScoring && llmAvailable;
    const qualityResult = await calculateHybridQualityScore(
      post, 
      input.company, 
      useLLMScoring,
      options.llmWeight
    );
    post.qualityScore = qualityResult.hybridScore;
    post.qualityFactors = qualityResult.factors;
    
    // Reject low-quality posts
    if (!qualityResult.passed) {
      warnings.push(
        `Post "${post.title}" rejected (quality: ${qualityResult.hybridScore}/10). ` +
        `Min required: ${MIN_QUALITY_SCORE}/10`
      );
      postsRejected++;
      continue;
    }
    
    posts.push(post);
  }
  
  if (posts.length === 0) {
    return {
      success: false,
      error: 'No posts passed quality checks. Try different themes or personas.',
      warnings,
      guardrailViolations: allViolations,
      stats: {
        postsGenerated: 0,
        postsRejected,
        averageQualityScore: 0,
      },
      generationMode: options.mode,
    };
  }
  
  // Step 6: Spread posts temporally
  const spreadPostsList = spreadPosts(posts);
  
  // Step 7: Create calendar week
  const calendar: CalendarWeek = {
    id: uuidv4(),
    weekNumber: getWeekNumber(targetWeekStart),
    weekStart: targetWeekStart,
    weekEnd: targetWeekEnd,
    entries: spreadPostsList,
    generatedAt: new Date(),
  };
  
  // Step 8: Validate entire calendar
  const validation = validateCalendarWeek(calendar, input.company.name);
  allViolations.push(...validation.violations);
  
  if (!validation.passed) {
    const errors = validation.violations.filter(v => v.severity === 'error');
    warnings.push(`Calendar has ${errors.length} guardrail violations`);
  }
  
  // Step 9: Save to history
  history = recordCalendarWeek(history, calendar);
  saveHistory(history);
  
  // Calculate average quality score
  const avgQuality = posts.reduce((sum, p) => sum + p.qualityScore, 0) / posts.length;
  
  return {
    success: true,
    calendar,
    warnings,
    guardrailViolations: allViolations,
    stats: {
      postsGenerated: posts.length,
      postsRejected,
      averageQualityScore: Math.round(avgQuality * 10) / 10,
    },
    generationMode: isFullContentMode && llmAvailable ? 'full-content' : 'titles-only',
  };
}

/**
 * Generate calendar for the next week based on previous week
 */
export async function generateNextWeekCalendar(
  input: PlannerInput,
  options: GenerationOptions = DEFAULT_GENERATION_OPTIONS
): Promise<CalendarGenerationResult> {
  const history = getHistory();
  
  // Find the most recent calendar
  const lastCalendar = history.generatedWeeks[history.generatedWeeks.length - 1];
  
  let nextWeekStart: Date;
  if (lastCalendar) {
    nextWeekStart = new Date(lastCalendar.weekEnd);
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);
  } else {
    nextWeekStart = getNextWeekStart();
  }
  
  return generateCalendar(input, nextWeekStart, options);
}

/**
 * Regenerate a calendar (discards previous and creates new)
 */
export async function regenerateCalendar(
  input: PlannerInput,
  weekStart: Date,
  options: GenerationOptions = DEFAULT_GENERATION_OPTIONS
): Promise<CalendarGenerationResult> {
  // Remove the existing calendar for this week from history
  let history = getHistory();
  history.generatedWeeks = history.generatedWeeks.filter(c => {
    const start = new Date(c.weekStart);
    return start.getTime() !== weekStart.getTime();
  });
  saveHistory(history);
  
  // Generate new calendar
  return generateCalendar(input, weekStart, options);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Get summary of a calendar for display
 */
export function getCalendarSummary(calendar: CalendarWeek): {
  postCount: number;
  subreddits: string[];
  personas: string[];
  dateRange: string;
  avgQuality: number;
} {
  const subreddits = [...new Set(calendar.entries.map(p => p.subreddit.name))];
  const personas = [...new Set(calendar.entries.map(p => p.persona.username))];
  
  const startStr = calendar.weekStart.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  const endStr = calendar.weekEnd.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  
  const avgQuality = calendar.entries.reduce((sum, p) => sum + p.qualityScore, 0) / 
    (calendar.entries.length || 1);
  
  return {
    postCount: calendar.entries.length,
    subreddits,
    personas,
    dateRange: `${startStr} - ${endStr}`,
    avgQuality: Math.round(avgQuality * 10) / 10,
  };
}
