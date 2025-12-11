import {
  PlannedPost,
  QualityFactor,
  Persona,
  Theme,
  Subreddit,
  Company,
} from '@/types';
import { GUARDRAIL_RULES } from './guardrails';
import { getLLMQualityScore, LLMQualityScore } from '@/lib/llm';


export const QUALITY_WEIGHTS = {
  openEndedQuestion: 1.5,      // Is the question open-ended?
  notSelfPromotional: 2.0,    // Does it avoid self-promotion?
  nativeToSubreddit: 1.5,     // Does it sound native to the subreddit?
  personaCredibility: 1.5,    // Does persona match topic credibility?
  commentNaturalness: 1.5,    // Do comments sound natural?
  engagementPotential: 1.0,   // Is it likely to drive discussion?
  uniqueness: 1.0,            // Is the topic/angle unique?
} as const;

export const MIN_QUALITY_SCORE = GUARDRAIL_RULES.MIN_QUALITY_SCORE; // 7/10


/**
 * Check if the post title is open-ended
 */
function scoreOpenEndedQuestion(title: string, body: string): QualityFactor {
  let score = 6;  // let's start at 6 (acceptable baseline)
  const content = (title + ' ' + body).toLowerCase();
  
  // Open-ended indicators
  const openEndedPatterns = [
    'what do you',
    'how do you',
    'what\'s the best',
    'anyone have experience',
    'what are your',
    'looking for recommendations',
    'what would you',
    'curious what',
  ];
  
  // Closed question patterns (reduces score)
  const closedPatterns = [
    'is this good',
    'should i use',
    'yes or no',
    'which one',
  ];
  
  for (const pattern of openEndedPatterns) {
    if (content.includes(pattern)) {
      score += 2;
      break;
    }
  }
  
  for (const pattern of closedPatterns) {
    if (content.includes(pattern)) {
      score -= 1;
    }
  }
  
  // Questions with '?' are better
  if (title.includes('?')) {
    score += 1;
  }
  
  return {
    factor: 'Open-ended Question',
    score: Math.min(10, Math.max(0, score)),
    reason: score >= 7 
      ? 'Post asks an open-ended question that invites discussion'
      : 'Consider making the question more open-ended',
  };
}

/**
 * Check for self-promotional content
 */
function scoreNotSelfPromotional(
  title: string,
  body: string,
  companyName: string
): QualityFactor {
  let score = 10; // Start high, deduct for issues
  const content = (title + ' ' + body).toLowerCase();
  const companyLower = companyName.toLowerCase();
  
  // Direct promotion patterns
  const promotionalPatterns = [
    `try ${companyLower}`,
    `use ${companyLower}`,
    `${companyLower} is the best`,
    `${companyLower} is amazing`,
    `check out ${companyLower}`,
    'discount code',
    'use my link',
    'affiliate',
    'sponsored',
  ];
  
  for (const pattern of promotionalPatterns) {
    if (content.includes(pattern)) {
      score -= 3;
    }
  }
  
  // Marketing buzzwords
  const buzzwords = [
    'revolutionary',
    'game changer',
    '10x',
    'ultimate',
    'best ever',
  ];
  
  for (const word of buzzwords) {
    if (content.includes(word)) {
      score -= 1;
    }
  }
  
  // Mention of company in comparison context is OK
  if (content.includes('vs') && content.includes(companyLower)) {
    score += 2; // Neutral comparison is fine
  }
  
  return {
    factor: 'Not Self-Promotional',
    score: Math.min(10, Math.max(0, score)),
    reason: score >= 7 
      ? 'Content avoids self-promotion'
      : 'Content may appear promotional. Remove direct product mentions.',
  };
}

/**
 * Check if content sounds native to the subreddit
 */
function scoreNativeToSubreddit(
  title: string,
  body: string,
  subreddit: Subreddit
): QualityFactor {
  let score = 6;
  const content = (title + ' ' + body).toLowerCase();
  const subredditLower = subreddit.name.toLowerCase();
  
  // Subreddit-specific terms that show familiarity
  if (subredditLower.includes('powerpoint')) {
    if (content.includes('slides') || content.includes('deck') || content.includes('presentation')) {
      score += 2;
    }
  }
  
  if (subredditLower.includes('canva')) {
    if (content.includes('template') || content.includes('design') || content.includes('brand')) {
      score += 2;
    }
  }
  
  if (subredditLower.includes('startup')) {
    if (content.includes('pitch') || content.includes('investor') || content.includes('mvp')) {
      score += 2;
    }
  }
  
  // Casual language that sounds human
  const casualIndicators = ['lol', 'tbh', 'imo', 'honestly', 'fwiw'];
  for (const indicator of casualIndicators) {
    if (content.includes(indicator)) {
      score += 1;
      break;
    }
  }
  
  // Overly formal language (sounds corporate)
  const formalIndicators = [
    'therefore',
    'furthermore',
    'in conclusion',
    'we are pleased',
  ];
  for (const indicator of formalIndicators) {
    if (content.includes(indicator)) {
      score -= 2;
    }
  }
  
  return {
    factor: 'Native to Subreddit',
    score: Math.min(10, Math.max(0, score)),
    reason: score >= 7 
      ? 'Content sounds authentic to the subreddit culture'
      : 'Consider using more subreddit-specific language',
  };
}

/**
 * Check persona-topic credibility match
 */
function scorePersonaCredibility(
  persona: Persona,
  theme: Theme,
  postType: string
): QualityFactor {
  let score = 6;
  const personaLower = (persona.info + ' ' + (persona.role || '')).toLowerCase();
  const keywordLower = theme.keyword.toLowerCase();
  
  // Check for role-topic alignment
  if (personaLower.includes('consultant') && 
      (keywordLower.includes('deck') || keywordLower.includes('presentation'))) {
    score += 2;
  }
  
  if (personaLower.includes('sales') && 
      (keywordLower.includes('pitch') || keywordLower.includes('business'))) {
    score += 2;
  }
  
  if (personaLower.includes('product manager') && 
      keywordLower.includes('tool')) {
    score += 2;
  }
  
  if (personaLower.includes('student') && 
      (keywordLower.includes('presentation') || keywordLower.includes('slides'))) {
    score += 1;
  }
  
  // Story posts need experiential personas
  if (postType === 'story' && 
      (personaLower.includes('tried') || personaLower.includes('experience'))) {
    score += 1;
  }
  
  return {
    factor: 'Persona Credibility',
    score: Math.min(10, Math.max(0, score)),
    reason: score >= 7 
      ? 'Persona has credibility to speak on this topic'
      : 'Consider using a persona with more relevant experience',
  };
}

/**
 * Score comment naturalness
 */
function scoreCommentNaturalness(post: PlannedPost): QualityFactor {
  let score = 7;
  const comments = post.comments;
  
  if (comments.length === 0) {
    return {
      factor: 'Comment Naturalness',
      score: 6,
      reason: 'No comments planned yet.',
    };
  }
  
  // Check timing
  const firstComment = comments[0];
  if (firstComment.delayMinutes >= 20 && firstComment.delayMinutes <= 90) {
    score += 1;
  } else {
    score -= 1;
  }
  
  // Check variety in commenters
  const uniqueCommenters = new Set(comments.map(c => c.persona.id));
  if (uniqueCommenters.size >= 2) {
    score += 1;
  }
  
  // Check for overly short or long comments
  for (const comment of comments) {
    if (comment.seedText.length < 10) {
      score -= 1;
    } else if (comment.seedText.length > 500) {
      score -= 1;
    }
  }
  
  // Check for varied comment content
  const commentTexts = comments.map(c => c.seedText.toLowerCase());
  const hasVariety = new Set(commentTexts).size === commentTexts.length;
  if (hasVariety) {
    score += 1;
  }
  
  return {
    factor: 'Comment Naturalness',
    score: Math.min(10, Math.max(0, score)),
    reason: score >= 7 
      ? 'Comments appear natural and well-timed'
      : 'Comment timing or content could be more natural',
  };
}

/**
 * Score engagement potential
 */
function scoreEngagementPotential(
  title: string,
  body: string,
  postType: string
): QualityFactor {
  let score = 6;
  const content = (title + ' ' + body).toLowerCase();
  
  // Controversial or opinion-seeking topics engage well
  const engagingPatterns = [
    'vs',
    'compared to',
    'better than',
    'what do you think',
    'unpopular opinion',
    'hot take',
  ];
  
  for (const pattern of engagingPatterns) {
    if (content.includes(pattern)) {
      score += 1;
    }
  }
  
  // Personal stories engage well
  if (postType === 'story') {
    score += 1;
  }
  
  // Questions tend to get more responses
  if (title.endsWith('?')) {
    score += 1;
  }
  
  return {
    factor: 'Engagement Potential',
    score: Math.min(10, Math.max(0, score)),
    reason: score >= 7 
      ? 'Post has good potential to drive engagement'
      : 'Consider adding elements that invite discussion',
  };
}

export interface QualityScoreResult {
  totalScore: number;
  passed: boolean;
  factors: QualityFactor[];
  summary: string;
}

/**
 * Calculate the overall quality score for a post
 * Returns a score from 0-10
 */
export function calculateQualityScore(
  post: Partial<PlannedPost>,
  company: Company
): QualityScoreResult {
  const factors: QualityFactor[] = [];
  
  const title = post.title || '';
  const body = post.bodyPreview || '';
  const subreddit = post.subreddit;
  const persona = post.persona;
  const themeIds = post.themeIds || [];
  const postType = post.postType || 'question';
  
  // Run all quality checks
  factors.push(scoreOpenEndedQuestion(title, body));
  factors.push(scoreNotSelfPromotional(title, body, company.name));
  
  if (subreddit) {
    factors.push(scoreNativeToSubreddit(title, body, subreddit));
  }
  
  if (persona && post.themeIds) {
    // Create a mock theme for scoring
    const mockTheme: Theme = {
      id: themeIds[0] || '',
      keyword: title.toLowerCase(),
    };
    factors.push(scorePersonaCredibility(persona, mockTheme, postType));
  }
  
  if (post.comments) {
    factors.push(scoreCommentNaturalness(post as PlannedPost));
  }
  
  factors.push(scoreEngagementPotential(title, body, postType));
  
  // Calculate weighted average
  let totalWeight = 0;
  let weightedSum = 0;
  
  const weights: Record<string, number> = {
    'Open-ended Question': QUALITY_WEIGHTS.openEndedQuestion,
    'Not Self-Promotional': QUALITY_WEIGHTS.notSelfPromotional,
    'Native to Subreddit': QUALITY_WEIGHTS.nativeToSubreddit,
    'Persona Credibility': QUALITY_WEIGHTS.personaCredibility,
    'Comment Naturalness': QUALITY_WEIGHTS.commentNaturalness,
    'Engagement Potential': QUALITY_WEIGHTS.engagementPotential,
  };
  
  for (const factor of factors) {
    const weight = weights[factor.factor] || 1.0;
    weightedSum += factor.score * weight;
    totalWeight += weight;
  }
  
  const totalScore = Math.round((weightedSum / totalWeight) * 10) / 10;
  const passed = totalScore >= MIN_QUALITY_SCORE;
  
  // Generate summary
  const lowScoreFactors = factors.filter(f => f.score < 7);
  const summary = passed
    ? `Quality score: ${totalScore}/10. Post meets quality standards.`
    : `Quality score: ${totalScore}/10. Issues: ${lowScoreFactors.map(f => f.factor).join(', ')}`;
  
  return {
    totalScore,
    passed,
    factors,
    summary,
  };
}

/**
 * Get suggestions to improve a low-quality post
 */
export function getImprovementSuggestions(result: QualityScoreResult): string[] {
  const suggestions: string[] = [];
  
  for (const factor of result.factors) {
    if (factor.score < 7) {
      suggestions.push(factor.reason);
    }
  }
  
  return suggestions;
}


export interface HybridQualityScoreResult extends QualityScoreResult {
  ruleBasedScore: number;
  llmScore?: LLMQualityScore;
  hybridScore: number;
  llmFeedback?: string;
  llmSuggestions?: string[];
}

/**
 * Calculate hybrid quality score combining rule-based and LLM scoring
 * 
 * @param post - The post to score
 * @param company - Company context
 * @param useLLM - Whether to use LLM scoring (default: false)
 * @param llmWeight - Weight of LLM score in final calculation (0-1, default: 0.3)
 */
export async function calculateHybridQualityScore(
  post: Partial<PlannedPost>,
  company: Company,
  useLLM: boolean = false,
  llmWeight: number = 0.3
): Promise<HybridQualityScoreResult> {
  // Get rule-based score
  const ruleBasedResult = calculateQualityScore(post, company);
  
  // If not using LLM, return rule-based only
  if (!useLLM) {
    return {
      ...ruleBasedResult,
      ruleBasedScore: ruleBasedResult.totalScore,
      hybridScore: ruleBasedResult.totalScore,
    };
  }
  
  // Get LLM score
  let llmScore: LLMQualityScore | undefined;
  let hybridScore = ruleBasedResult.totalScore;
  
  try {
    const title = post.title || '';
    const body = post.bodyPreview || '';
    const subredditName = post.subreddit?.name || 'Unknown';
    const personaName = post.persona?.username || 'Unknown';
    const commentTexts = post.comments?.map(c => c.seedText) || [];
    
    llmScore = await getLLMQualityScore({
      title,
      body,
      subreddit: subredditName,
      persona: personaName,
      comments: commentTexts,
      companyName: company.name,
    });
    
    // Calculate hybrid score: (1 - llmWeight) * ruleScore + llmWeight * llmScore
    hybridScore = Math.round(
      ((1 - llmWeight) * ruleBasedResult.totalScore + llmWeight * llmScore.score) * 10
    ) / 10;
    
    // Add LLM factor to factors list
    ruleBasedResult.factors.push({
      factor: 'LLM Polish Score',
      score: llmScore.score,
      reason: llmScore.feedback,
    });
    
  } catch (error) {
    console.error('LLM scoring failed, using rule-based only:', error);
    // Continue with rule-based score only
  }
  
  const passed = hybridScore >= MIN_QUALITY_SCORE;
  
  return {
    ...ruleBasedResult,
    totalScore: hybridScore,
    passed,
    ruleBasedScore: ruleBasedResult.totalScore,
    llmScore,
    hybridScore,
    llmFeedback: llmScore?.feedback,
    llmSuggestions: llmScore?.suggestions,
    summary: passed
      ? `Hybrid score: ${hybridScore}/10 (Rule: ${ruleBasedResult.totalScore}, LLM: ${llmScore?.score || 'N/A'}). Post meets quality standards.`
      : `Hybrid score: ${hybridScore}/10. Needs improvement.`,
  };
}

/**
 * Quick validation using both rule-based and LLM scoring
 */
export async function validatePostQuality(
  post: Partial<PlannedPost>,
  company: Company,
  useLLM: boolean = false,
  minScore: number = MIN_QUALITY_SCORE
): Promise<{
  isValid: boolean;
  score: number;
  feedback: string;
  suggestions: string[];
}> {
  const result = await calculateHybridQualityScore(post, company, useLLM);
  
  const suggestions = getImprovementSuggestions(result);
  if (result.llmSuggestions) {
    suggestions.push(...result.llmSuggestions);
  }
  
  return {
    isValid: result.hybridScore >= minScore,
    score: result.hybridScore,
    feedback: result.summary,
    suggestions,
  };
}
