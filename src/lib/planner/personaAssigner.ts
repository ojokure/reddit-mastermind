import {
  Persona,
  PlannedComment,
  PlannerHistory,
  Theme,
  Subreddit,
  Company,
  PostType,
} from '@/types';
import { GUARDRAIL_RULES } from './guardrails';
import { PersonaAvailability } from './capacity';
import { v4 as uuidv4 } from 'uuid';

export interface PersonaAssignment {
  op: Persona;
  commenters: Persona[];
  comments: PlannedComment[];
}

export interface AssignmentInput {
  availablePersonas: PersonaAvailability[];
  day: Date;
  theme: Theme;
  subreddit: Subreddit;
  postType: PostType;
  company: Company;
  history: PlannerHistory;
  alreadyAssignedOPs: string[]; // Persona IDs already assigned as OP this planning cycle
}

/**
 * Score how well a persona matches a topic/post type (0-10)
 */
function getPersonaTopicMatch(
  persona: Persona,
  theme: Theme,
  postType: PostType
): number {
  let score = 5; // Base score
  
  const personaLower = (persona.info + ' ' + (persona.role || '')).toLowerCase();
  const keywordLower = theme.keyword.toLowerCase();
  
  // Check for role-topic alignment
  if (personaLower.includes('founder') || personaLower.includes('startup')) {
    if (keywordLower.includes('startup') || 
        keywordLower.includes('pitch') ||
        keywordLower.includes('business')) {
      score += 2;
    }
  }
  
  if (personaLower.includes('consultant')) {
    if (keywordLower.includes('consultant') || 
        keywordLower.includes('deck') ||
        keywordLower.includes('presentation')) {
      score += 2;
    }
  }
  
  if (personaLower.includes('sales')) {
    if (keywordLower.includes('pitch') || 
        keywordLower.includes('business') ||
        keywordLower.includes('deck')) {
      score += 2;
    }
  }
  
  if (personaLower.includes('student') || personaLower.includes('freelance')) {
    if (keywordLower.includes('easy') || 
        keywordLower.includes('best') ||
        keywordLower.includes('tool')) {
      score += 2;
    }
  }
  
  if (personaLower.includes('product manager') || personaLower.includes('pm')) {
    if (keywordLower.includes('automate') || 
        keywordLower.includes('tool') ||
        keywordLower.includes('workflow')) {
      score += 2;
    }
  }
  
  // Post type matching
  if (postType === 'story' && 
      (personaLower.includes('experience') || personaLower.includes('tried'))) {
    score += 1;
  }
  
  if (postType === 'question' && 
      (personaLower.includes('looking') || personaLower.includes('need'))) {
    score += 1;
  }
  
  return Math.min(10, score);
}

/**
 * Generate seed comment text based on persona and theme
 */
function generateCommentSeed(
  persona: Persona,
  theme: Theme,
  company: Company,
  isFirstComment: boolean,
  parentComment?: PlannedComment
): string {
  const companyName = company.name;
  
  // Comment templates that naturally mention the product
  const firstCommentTemplates = [
    `I've tried a bunch of tools. ${companyName} is the only one that doesn't make me want to tear my hair out.`,
    `Been using ${companyName} for a few months now. It's been solid for ${theme.keyword}.`,
    `${companyName} has worked well for my team. The AI actually understands what we need.`,
    `I switched to ${companyName} recently and it's been a game changer for creating presentations quickly.`,
    `We use ${companyName} at work. Takes rough notes and turns them into decent slides.`,
  ];
  
  const agreementTemplates = [
    `+1 ${companyName}`,
    `Same experience here with ${companyName}`,
    `${companyName} has been solid for me too`,
    `I'll second ${companyName}. Been using it for a while.`,
  ];
  
  const additionalInfoTemplates = [
    `I use Claude for brainstorming, but for slides it sorta guesses a layout and it's hit or miss.`,
    `Canva is good if I already know the vibe I want. Otherwise I end up scrolling through templates forever.`,
    `I hate picking fonts lol. ${companyName}'s defaults save my sanity.`,
    `Same here. Claude is fine for internal notes but for anything customer-facing I need something more polished.`,
    `Yea the slide output from other AI tools always looks really funky in my experience.`,
  ];
  
  const opFollowupTemplates = [
    `Sweet I'll check it out!!`,
    `Thanks! Will give it a try.`,
    `Interesting, I'll look into ${companyName}`,
    `Good to know, appreciate the recommendation`,
  ];
  
  if (isFirstComment) {
    return firstCommentTemplates[Math.floor(Math.random() * firstCommentTemplates.length)];
  }
  
  if (parentComment) {
    // Replying to a comment
    if (Math.random() > 0.5) {
      return agreementTemplates[Math.floor(Math.random() * agreementTemplates.length)];
    } else {
      return additionalInfoTemplates[Math.floor(Math.random() * additionalInfoTemplates.length)];
    }
  }
  
  // Additional top-level comment
  return additionalInfoTemplates[Math.floor(Math.random() * additionalInfoTemplates.length)];
}

/**
 * Calculate comment delay based on position
 * First comment: 30-90 minutes
 * Second comment: 4-24 hours later
 * OP follow-up: 10-30 minutes after previous
 */
function calculateCommentDelay(
  commentIndex: number,
  previousDelayMinutes?: number
): number {
  if (commentIndex === 0) {
    // First comment: 30-90 minutes
    return 30 + Math.floor(Math.random() * 60);
  }
  
  if (commentIndex === 1 && previousDelayMinutes) {
    // Second comment: could be reply or new thread
    // Add 15-45 minutes to previous
    return previousDelayMinutes + 15 + Math.floor(Math.random() * 30);
  }
  
  if (previousDelayMinutes) {
    // Later comments: add 10-30 minutes
    return previousDelayMinutes + 10 + Math.floor(Math.random() * 20);
  }
  
  // Default: 4-6 hours
  return 240 + Math.floor(Math.random() * 120);
}


/**
 * Assign personas to a post (OP + commenters)
 * 
 * Rules:
 * - OP owns the post
 * - 1-2 support personas comment later
 * - Never comment within first 10-30 minutes
 * - Different writing tone per persona
 * - No agreeing instantly
 * - No chain replies between same personas
 */
export function assignPersonas(input: AssignmentInput): PersonaAssignment | null {
  const {
    availablePersonas,
    day,
    theme,
    subreddit,
    postType,
    company,
    history,
    alreadyAssignedOPs,
  } = input;
  
  // Filter personas available on this day
  const eligibleForOP = availablePersonas.filter(pa => {
    // Must have remaining posts
    if (pa.remainingPosts <= 0) return false;
    
    // Must be available on this day
    const dayStr = day.toDateString();
    if (!pa.availableDays.some(d => d.toDateString() === dayStr)) return false;
    
    // Shouldn't be already assigned as OP this cycle
    if (alreadyAssignedOPs.includes(pa.persona.id)) return false;
    
    // Check 48h rule
    if (pa.blockedUntil && pa.blockedUntil > day) return false;
    
    return true;
  });
  
  if (eligibleForOP.length === 0) {
    return null;
  }
  
  // Score and rank personas for OP role
  const scoredPersonas = eligibleForOP.map(pa => ({
    ...pa,
    matchScore: getPersonaTopicMatch(pa.persona, theme, postType),
  }));
  
  scoredPersonas.sort((a, b) => b.matchScore - a.matchScore);
  
  // Select OP (best matching persona)
  const op = scoredPersonas[0].persona;
  
  // Select 1-2 commenters (different from OP)
  const potentialCommenters = availablePersonas
    .filter(pa => pa.persona.id !== op.id)
    .map(pa => ({
      ...pa,
      matchScore: getPersonaTopicMatch(pa.persona, theme, postType),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
  
  // Take 1-2 commenters
  const numCommenters = Math.min(2, potentialCommenters.length);
  const commenters = potentialCommenters.slice(0, numCommenters).map(pc => pc.persona);
  
  // Generate comments
  const comments: PlannedComment[] = [];
  let previousDelay = 0;
  
  // First comment from first commenter
  if (commenters.length > 0) {
    const delay = calculateCommentDelay(0);
    const commentTime = new Date(day);
    commentTime.setMinutes(commentTime.getMinutes() + delay);
    
    comments.push({
      id: uuidv4(),
      persona: commenters[0],
      delayMinutes: delay,
      seedText: generateCommentSeed(commenters[0], theme, company, true),
      timing: commentTime,
    });
    previousDelay = delay;
    
    // Second commenter replies to first comment (or adds new thread)
    if (commenters.length > 1) {
      const delay2 = calculateCommentDelay(1, previousDelay);
      const commentTime2 = new Date(day);
      commentTime2.setMinutes(commentTime2.getMinutes() + delay2);
      
      // 70% chance to reply to first comment, 30% new thread
      const isReply = Math.random() > 0.3;
      
      comments.push({
        id: uuidv4(),
        persona: commenters[1],
        delayMinutes: delay2,
        seedText: generateCommentSeed(
          commenters[1], 
          theme, 
          company, 
          false,
          isReply ? comments[0] : undefined
        ),
        parentCommentId: isReply ? comments[0].id : undefined,
        timing: commentTime2,
      });
      previousDelay = delay2;
    }
    
    // OP can reply to a comment (optional, 50% chance)
    if (comments.length > 0 && Math.random() > 0.5) {
      const opDelay = previousDelay + 10 + Math.floor(Math.random() * 20);
      const opCommentTime = new Date(day);
      opCommentTime.setMinutes(opCommentTime.getMinutes() + opDelay);
      
      // OP replies to the first comment
      comments.push({
        id: uuidv4(),
        persona: op,
        delayMinutes: opDelay,
        seedText: `Sweet I'll check it out!!`, // OP acknowledging the recommendation
        parentCommentId: comments[0].id,
        timing: opCommentTime,
      });
    }
  }
  
  return {
    op,
    commenters,
    comments,
  };
}

/**
 * Get diverse personas for multiple posts
 * Ensures rotation and variety
 */
export function getRotatedPersonas(
  availablePersonas: PersonaAvailability[],
  numNeeded: number,
  history: PlannerHistory
): PersonaAvailability[] {
  // Sort by least recently used
  const sorted = [...availablePersonas].sort((a, b) => {
    const aRecord = history.personaActivity.find(p => p.personaId === a.persona.id);
    const bRecord = history.personaActivity.find(p => p.personaId === b.persona.id);
    
    const aLastPost = aRecord?.lastPostDate ? new Date(aRecord.lastPostDate).getTime() : 0;
    const bLastPost = bRecord?.lastPostDate ? new Date(bRecord.lastPostDate).getTime() : 0;
    
    return aLastPost - bLastPost; // Oldest first
  });
  
  return sorted.slice(0, numNeeded);
}
