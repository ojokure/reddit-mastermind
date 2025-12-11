import {
  LLMProvider,
  LLMMessage,
  LLMQualityScore,
  QualityEvaluationContext,
} from './types';
import { getOpenAIProvider } from './openai-provider';

const QUALITY_SYSTEM_PROMPT = `You are an expert Reddit content evaluator. Your job is to score content for authenticity, naturalness, and engagement potential.

You understand:
- What makes Reddit content feel genuine vs manufactured
- How marketing speak and corporate language sounds out of place
- What types of posts get engagement vs get ignored or downvoted
- Subreddit-specific norms and expectations

Score each dimension from 0-10:
- naturalness: Does it read like a real person wrote it? No robotic language, marketing speak, or unnaturally perfect grammar.
- authenticity: Does it feel like a genuine question/story/discussion? Not like a planted marketing post.
- engagement: Would real Reddit users upvote this, comment on it, find it valuable?

Be critical. Most content should score 5-7. Reserve 8+ for truly excellent content. Anything below 5 has serious issues.

Always respond with valid JSON in this exact format:
{
  "score": <weighted average 0-10>,
  "naturalness": <0-10>,
  "authenticity": <0-10>,
  "engagement": <0-10>,
  "feedback": "<2-3 sentences explaining your evaluation>",
  "suggestions": ["<specific improvement>", "<specific improvement>"]
}`;

/**
 * Get LLM-based quality score for content
 */
export async function getLLMQualityScore(
  context: QualityEvaluationContext,
  provider?: LLMProvider
): Promise<LLMQualityScore> {
  const llm = provider || getOpenAIProvider();
  
  if (!llm.isConfigured()) {
    // Return neutral score if LLM not configured
    return getDefaultScore();
  }

  const userPrompt = buildEvaluationPrompt(context);
  
  const messages: LLMMessage[] = [
    { role: 'system', content: QUALITY_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  try {
    const result = await llm.complete(messages, {
      temperature: 0.3, // Lower temperature for more consistent scoring
      maxTokens: 500,
    });

    // Parse JSON response
    const parsed = JSON.parse(result.content);
    
    return {
      score: clampScore(parsed.score),
      naturalness: clampScore(parsed.naturalness),
      authenticity: clampScore(parsed.authenticity),
      engagement: clampScore(parsed.engagement),
      feedback: parsed.feedback || 'No feedback provided',
      suggestions: parsed.suggestions || [],
    };
  } catch (error) {
    console.error('LLM quality scoring failed:', error);
    return getDefaultScore();
  }
}

/**
 * Evaluate a full post with comments
 */
export async function evaluateFullThread(
  post: {
    title: string;
    body: string;
    subreddit: string;
    persona: string;
  },
  comments: string[],
  companyName: string,
  provider?: LLMProvider
): Promise<{
  postScore: LLMQualityScore;
  threadScore: LLMQualityScore;
  overallScore: number;
}> {
  // Score the post itself
  const postScore = await getLLMQualityScore({
    title: post.title,
    body: post.body,
    subreddit: post.subreddit,
    persona: post.persona,
    companyName,
  }, provider);

  // Score the full thread
  const threadScore = await getLLMQualityScore({
    title: post.title,
    body: post.body,
    subreddit: post.subreddit,
    persona: post.persona,
    comments,
    companyName,
  }, provider);

  // Calculate overall score (weighted)
  const overallScore = (postScore.score * 0.6 + threadScore.score * 0.4);

  return {
    postScore,
    threadScore,
    overallScore: Math.round(overallScore * 10) / 10,
  };
}


function buildEvaluationPrompt(context: QualityEvaluationContext): string {
  let prompt = `Evaluate this Reddit content for quality:

**Subreddit**: ${context.subreddit}
**Posted by persona**: ${context.persona}
**Company that might benefit**: ${context.companyName}

**Post Title**: ${context.title}

**Post Body**:
${context.body}
`;

  if (context.comments && context.comments.length > 0) {
    prompt += `
**Comments on this post**:
${context.comments.map((c, i) => `${i + 1}. ${c}`).join('\n\n')}

Consider the full thread - do the comments feel natural? Does the conversation flow authentically?
`;
  }

  prompt += `
Important checks:
1. Does this look like astroturfing or planted marketing?
2. Would a real Reddit user be suspicious of this content?
3. Is the ${context.companyName} mention (if any) too on-the-nose?
4. Does the persona's writing match their described background?

Provide your JSON evaluation.`;

  return prompt;
}


function clampScore(score: number): number {
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

function getDefaultScore(): LLMQualityScore {
  return {
    score: 7,
    naturalness: 7,
    authenticity: 7,
    engagement: 7,
    feedback: 'LLM scoring not available. Using default score.',
    suggestions: [],
  };
}

/**
 * Quick check if content passes minimum quality threshold
 */
export async function passesQualityCheck(
  context: QualityEvaluationContext,
  minScore: number = 7,
  provider?: LLMProvider
): Promise<{ passes: boolean; score: LLMQualityScore }> {
  const score = await getLLMQualityScore(context, provider);
  return {
    passes: score.score >= minScore,
    score,
  };
}
