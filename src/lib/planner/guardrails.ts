import {
  GuardrailCheck,
  GuardrailViolation,
  Persona,
  PlannedPost,
  PlannedComment,
  PlannerHistory,
  CalendarWeek,
} from '@/types';


export const GUARDRAIL_RULES = {
  // Posting frequency limits
  MAX_POSTS_PER_SUBREDDIT_PER_WEEK: 1,
  MAX_POSTS_PER_PERSONA_PER_DAY: 1,
  MIN_HOURS_BETWEEN_SAME_PERSONA_POSTS: 48,
  MAX_PERSONAS_PER_POST: 2, 
  
  // Comment timing
  MIN_COMMENT_DELAY_MINUTES: 10,
  MAX_FIRST_COMMENT_DELAY_MINUTES: 90,
  MIN_SECOND_COMMENT_DELAY_HOURS: 4,
  MAX_SECOND_COMMENT_DELAY_HOURS: 24,
  
  // Content rules
  MIN_QUALITY_SCORE: 6, 
  MIN_WEEKS_BEFORE_THEME_REUSE: 3,
  
  // Comment content rules
  MAX_COMMENTS_PER_POST: 3,
  NO_SELF_REPLIES: true,
  NO_CHAIN_REPLIES_SAME_PERSONA: true,
  NO_PRODUCT_MENTION_IN_OP: true,
  NO_LINKS_IN_FIRST_TWO_COMMENTS: true,
} as const;


/**
 * Check if a persona can post on a given date
 */
export function canPersonaPostOnDate(
  persona: Persona,
  date: Date,
  history: PlannerHistory,
  plannedPosts: PlannedPost[]
): GuardrailCheck {
  const violations: GuardrailViolation[] = [];
  
  // Check posts this week for persona
  const personaRecord = history.personaActivity.find(p => p.personaId === persona.id);
  const weeklyPostCount = (personaRecord?.postsThisWeek || 0) + 
    plannedPosts.filter(p => p.persona.id === persona.id).length;
  
  if (weeklyPostCount >= persona.maxPostsPerWeek) {
    violations.push({
      rule: 'MAX_POSTS_PER_WEEK',
      severity: 'error',
      message: `${persona.username} has reached max posts (${persona.maxPostsPerWeek}) for this week`,
      affectedEntity: persona.id,
    });
  }
  
  // Check 48h gap between posts
  const recentPostDates = [
    ...(personaRecord?.postDates || []),
    ...plannedPosts.filter(p => p.persona.id === persona.id).map(p => p.day),
  ];
  
  for (const postDate of recentPostDates) {
    const hoursDiff = Math.abs(date.getTime() - new Date(postDate).getTime()) / (1000 * 60 * 60);
    if (hoursDiff < GUARDRAIL_RULES.MIN_HOURS_BETWEEN_SAME_PERSONA_POSTS) {
      violations.push({
        rule: 'MIN_48H_GAP',
        severity: 'error',
        message: `${persona.username} must wait 48h between posts. Last post was ${hoursDiff.toFixed(1)}h ago`,
        affectedEntity: persona.id,
      });
      break;
    }
  }
  
  // Check max 1 post per day
  const postsOnSameDay = plannedPosts.filter(p => 
    p.persona.id === persona.id && 
    isSameDay(p.day, date)
  ).length;
  
  if (postsOnSameDay >= GUARDRAIL_RULES.MAX_POSTS_PER_PERSONA_PER_DAY) {
    violations.push({
      rule: 'MAX_POSTS_PER_DAY',
      severity: 'error',
      message: `${persona.username} can only post once per day`,
      affectedEntity: persona.id,
    });
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Check if a subreddit can receive a post this week
 */
export function canPostToSubreddit(
  subredditName: string,
  history: PlannerHistory,
  plannedPosts: PlannedPost[]
): GuardrailCheck {
  const violations: GuardrailViolation[] = [];
  
  const subredditRecord = history.subredditPosts.find(s => s.subredditName === subredditName);
  const currentWeekPosts = (subredditRecord?.postsThisWeek || 0) +
    plannedPosts.filter(p => p.subreddit.name === subredditName).length;
  
  if (currentWeekPosts >= GUARDRAIL_RULES.MAX_POSTS_PER_SUBREDDIT_PER_WEEK) {
    violations.push({
      rule: 'MAX_POSTS_PER_SUBREDDIT',
      severity: 'error',
      message: `${subredditName} already has a post scheduled this week`,
      affectedEntity: subredditName,
    });
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Check if a theme can be used (not used in last 3 weeks)
 */
export function canUseTheme(
  themeId: string,
  history: PlannerHistory
): GuardrailCheck {
  const violations: GuardrailViolation[] = [];
  
  const themeRecord = history.themeUsage.find(t => t.themeId === themeId);
  if (themeRecord?.lastUsedDate) {
    const weeksSinceUse = Math.floor(
      (Date.now() - new Date(themeRecord.lastUsedDate).getTime()) / (1000 * 60 * 60 * 24 * 7)
    );
    
    if (weeksSinceUse < GUARDRAIL_RULES.MIN_WEEKS_BEFORE_THEME_REUSE) {
      violations.push({
        rule: 'THEME_REUSE_TOO_SOON',
        severity: 'warning', // Warning, not error - can be overridden
        message: `Theme ${themeId} was used ${weeksSinceUse} weeks ago. Recommend waiting ${GUARDRAIL_RULES.MIN_WEEKS_BEFORE_THEME_REUSE} weeks`,
        affectedEntity: themeId,
      });
    }
  }
  
  return {
    passed: violations.filter(v => v.severity === 'error').length === 0,
    violations,
  };
}

/**
 * Validate comment assignment for a post
 */
export function validateComments(
  post: PlannedPost,
  comments: PlannedComment[]
): GuardrailCheck {
  const violations: GuardrailViolation[] = [];
  
  // Check max comments per post
  if (comments.length > GUARDRAIL_RULES.MAX_COMMENTS_PER_POST) {
    violations.push({
      rule: 'MAX_COMMENTS_PER_POST',
      severity: 'warning',
      message: `Post has ${comments.length} comments, max recommended is ${GUARDRAIL_RULES.MAX_COMMENTS_PER_POST}`,
      affectedEntity: post.id,
    });
  }
  
  // Check no self-replies (OP replying to OP's own comment immediately)
  for (const comment of comments) {
    if (comment.persona.id === post.persona.id && !comment.parentCommentId) {
      // Looking at sample data, OP (riley_ops) does reply to comment chains
      // The rule is: OP shouldn't post the FIRST comment
      const isFirstComment = comments.indexOf(comment) === 0;
      if (isFirstComment) {
        violations.push({
          rule: 'NO_SELF_FIRST_COMMENT',
          severity: 'error',
          message: `OP (${post.persona.username}) cannot post the first comment on their own post`,
          affectedEntity: comment.id,
        });
      }
    }
  }
  
  // Check no chain replies between same personas
  for (const comment of comments) {
    if (comment.parentCommentId) {
      const parentComment = comments.find(c => c.id === comment.parentCommentId);
      if (parentComment && parentComment.persona.id === comment.persona.id) {
        violations.push({
          rule: 'NO_CHAIN_REPLIES_SAME_PERSONA',
          severity: 'error',
          message: `${comment.persona.username} cannot reply to their own comment`,
          affectedEntity: comment.id,
        });
      }
    }
  }
  
  // Check comment timing
  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    
    if (i === 0) {
      // First comment timing
      if (comment.delayMinutes < GUARDRAIL_RULES.MIN_COMMENT_DELAY_MINUTES) {
        violations.push({
          rule: 'COMMENT_TOO_EARLY',
          severity: 'error',
          message: `First comment must be at least ${GUARDRAIL_RULES.MIN_COMMENT_DELAY_MINUTES} minutes after post`,
          affectedEntity: comment.id,
        });
      }
      if (comment.delayMinutes > GUARDRAIL_RULES.MAX_FIRST_COMMENT_DELAY_MINUTES) {
        violations.push({
          rule: 'FIRST_COMMENT_TOO_LATE',
          severity: 'warning',
          message: `First comment at ${comment.delayMinutes} minutes may be too late for engagement`,
          affectedEntity: comment.id,
        });
      }
    }
  }
  
  // Check max personas in comments (plus OP)
  const uniquePersonaIds = new Set([
    post.persona.id,
    ...comments.map(c => c.persona.id),
  ]);
  
  if (uniquePersonaIds.size > GUARDRAIL_RULES.MAX_PERSONAS_PER_POST + 1) {
    violations.push({
      rule: 'TOO_MANY_PERSONAS',
      severity: 'warning',
      message: `Post involves ${uniquePersonaIds.size} personas. Max recommended is ${GUARDRAIL_RULES.MAX_PERSONAS_PER_POST + 1}`,
      affectedEntity: post.id,
    });
  }
  
  return {
    passed: violations.filter(v => v.severity === 'error').length === 0,
    violations,
  };
}

/**
 * Check post content for violations
 */
export function validatePostContent(
  title: string,
  body: string,
  companyName: string
): GuardrailCheck {
  const violations: GuardrailViolation[] = [];
  
  // Check for product mention in OP
  if (GUARDRAIL_RULES.NO_PRODUCT_MENTION_IN_OP) {
    const titleLower = title.toLowerCase();
    const bodyLower = body.toLowerCase();
    const companyLower = companyName.toLowerCase();
    
    // Note: In sample data, the title DOES mention Slideforge in comparison posts
    // The rule should be: don't mention as promotion, but comparison is OK
    // We'll flag direct promotional mentions
    const promotionalPatterns = [
      `try ${companyLower}`,
      `use ${companyLower}`,
      `${companyLower} is the best`,
      `${companyLower} is amazing`,
      `check out ${companyLower}`,
    ];
    
    for (const pattern of promotionalPatterns) {
      if (titleLower.includes(pattern) || bodyLower.includes(pattern)) {
        violations.push({
          rule: 'NO_PROMOTIONAL_MENTION',
          severity: 'error',
          message: `Post contains promotional mention of ${companyName}`,
        });
        break;
      }
    }
  }
  
  // Check for marketing language
  const marketingPhrases = [
    'check it out',
    'you should try',
    'amazing tool',
    'best tool ever',
    'game changer',
    'revolutionary',
    '10x your',
  ];
  
  const contentLower = (title + ' ' + body).toLowerCase();
  for (const phrase of marketingPhrases) {
    if (contentLower.includes(phrase)) {
      violations.push({
        rule: 'MARKETING_LANGUAGE',
        severity: 'warning',
        message: `Post may contain marketing language: "${phrase}"`,
      });
    }
  }
  
  return {
    passed: violations.filter(v => v.severity === 'error').length === 0,
    violations,
  };
}

/**
 * Check comment content for violations
 */
export function validateCommentContent(
  commentText: string,
  commentIndex: number, // 0-indexed
  companyName: string
): GuardrailCheck {
  const violations: GuardrailViolation[] = [];
  
  // Check for links in first two comments
  if (GUARDRAIL_RULES.NO_LINKS_IN_FIRST_TWO_COMMENTS && commentIndex < 2) {
    const hasLink = /https?:\/\/|www\./i.test(commentText);
    if (hasLink) {
      violations.push({
        rule: 'NO_LINKS_EARLY',
        severity: 'error',
        message: 'Links not allowed in first two comments',
      });
    }
  }
  
  // Check for overly agreeable comments
  const tooAgreeablePhrases = [
    'totally agree',
    'exactly right',
    'couldn\'t agree more',
    'this is so true',
  ];
  
  const commentLower = commentText.toLowerCase();
  for (const phrase of tooAgreeablePhrases) {
    if (commentLower.includes(phrase)) {
      violations.push({
        rule: 'TOO_AGREEABLE',
        severity: 'warning',
        message: `Comment may be too agreeable: "${phrase}". Consider adding unique perspective.`,
      });
    }
  }
  
  return {
    passed: violations.filter(v => v.severity === 'error').length === 0,
    violations,
  };
}

/**
 * Validate an entire calendar week for guardrail compliance
 */
export function validateCalendarWeek(
  calendar: CalendarWeek,
  companyName: string
): GuardrailCheck {
  const allViolations: GuardrailViolation[] = [];
  
  for (const post of calendar.entries) {
    // Validate post content
    const postCheck = validatePostContent(post.title, post.bodyPreview, companyName);
    allViolations.push(...postCheck.violations);
    
    // Validate comments
    const commentCheck = validateComments(post, post.comments);
    allViolations.push(...commentCheck.violations);
    
    // Validate each comment's content
    post.comments.forEach((comment, index) => {
      const contentCheck = validateCommentContent(comment.seedText, index, companyName);
      allViolations.push(...contentCheck.violations);
    });
  }
  
  // Check for duplicate subreddits in the week
  const subredditCounts = new Map<string, number>();
  for (const post of calendar.entries) {
    const count = subredditCounts.get(post.subreddit.name) || 0;
    subredditCounts.set(post.subreddit.name, count + 1);
  }
  
  for (const [subreddit, count] of subredditCounts) {
    if (count > GUARDRAIL_RULES.MAX_POSTS_PER_SUBREDDIT_PER_WEEK) {
      allViolations.push({
        rule: 'DUPLICATE_SUBREDDIT',
        severity: 'error',
        message: `${subreddit} has ${count} posts scheduled. Max is ${GUARDRAIL_RULES.MAX_POSTS_PER_SUBREDDIT_PER_WEEK}`,
        affectedEntity: subreddit,
      });
    }
  }
  
  // Check quality scores
  for (const post of calendar.entries) {
    if (post.qualityScore < GUARDRAIL_RULES.MIN_QUALITY_SCORE) {
      allViolations.push({
        rule: 'LOW_QUALITY_SCORE',
        severity: 'error',
        message: `Post "${post.title}" has quality score ${post.qualityScore}/10. Minimum is ${GUARDRAIL_RULES.MIN_QUALITY_SCORE}`,
        affectedEntity: post.id,
      });
    }
  }
  
  return {
    passed: allViolations.filter(v => v.severity === 'error').length === 0,
    violations: allViolations,
  };
}


function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
