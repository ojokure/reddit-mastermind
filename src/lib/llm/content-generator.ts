import {
  LLMProvider,
  LLMMessage,
  ContentGenerationContext,
  CommentGenerationContext,
  GeneratedPostContent,
  GeneratedComment,
} from './types';
import { getOpenAIProvider } from './openai-provider';

// ============================================
// System Prompts
// ============================================

const SYSTEM_PROMPT_POST = `You are an expert at writing authentic Reddit posts that sound natural and human. You understand Reddit culture, subreddit-specific norms, and how to write engaging content that doesn't feel like marketing.

Key principles:
- Write in first person from the persona's perspective
- Use casual, conversational language appropriate for Reddit
- Never use obvious marketing language or buzzwords
- Ask genuine questions that invite discussion
- Share real experiences and opinions
- Match the tone of the specific subreddit
- Keep posts concise but detailed enough to be helpful
- Never directly promote or link to products in the main post
- Use light humor or relatable frustrations when appropriate

Your output should be JSON in this exact format:
{
  "title": "the post title",
  "body": "the full post body",
  "keywords": ["relevant", "search", "terms"]
}`;

const SYSTEM_PROMPT_COMMENT = `You are an expert at writing authentic Reddit comments that sound natural and human. You understand how real users engage in Reddit threads - sometimes agreeing, sometimes adding nuance, sometimes sharing their own experiences.

Key principles:
- Write as the commenter persona, not the original poster
- Comments should add value - share experiences, opinions, or helpful info
- Don't be overly agreeable or sycophantic
- Vary tone between comments - some casual, some more detailed
- Product mentions should feel organic, like genuine recommendations
- Match the energy and length of typical Reddit comments
- Use Reddit-style formatting when appropriate (line breaks, etc.)
- Don't use emojis excessively
- Mild disagreement or alternative perspectives are natural

Output only the comment text, nothing else.`;

const SYSTEM_PROMPT_QUALITY = `You are an expert at evaluating Reddit content for authenticity and quality. You can detect marketing speak, unnatural language, and content that would get downvoted or ignored.

Evaluate content on these criteria (each 0-10):
- naturalness: Does it sound like a real person wrote it?
- authenticity: Does it feel genuine, not manufactured?
- engagement: Would real users upvote and reply to this?

Provide your evaluation as JSON:
{
  "score": <overall 0-10>,
  "naturalness": <0-10>,
  "authenticity": <0-10>,
  "engagement": <0-10>,
  "feedback": "<brief explanation>",
  "suggestions": ["improvement 1", "improvement 2"]
}`;

// ============================================
// Content Generation Functions
// ============================================

/**
 * Generate a full Reddit post (title + body) using LLM
 */
export async function generatePostContent(
  context: ContentGenerationContext,
  provider?: LLMProvider
): Promise<GeneratedPostContent> {
  const llm = provider || getOpenAIProvider();
  
  if (!llm.isConfigured()) {
    // Fallback to basic generation if LLM not configured
    return generatePostContentFallback(context);
  }

  const userPrompt = buildPostPrompt(context);
  
  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT_POST },
    { role: 'user', content: userPrompt },
  ];

  try {
    const result = await llm.complete(messages, {
      temperature: 0.8,
      maxTokens: 800,
    });

    // Parse JSON response
    const parsed = JSON.parse(result.content);
    return {
      title: parsed.title || 'Untitled Post',
      body: parsed.body || '',
      keywords: parsed.keywords || [],
    };
  } catch (error) {
    console.error('LLM post generation failed:', error);
    return generatePostContentFallback(context);
  }
}

/**
 * Generate a Reddit comment using LLM
 */
export async function generateComment(
  context: CommentGenerationContext,
  provider?: LLMProvider
): Promise<GeneratedComment> {
  const llm = provider || getOpenAIProvider();
  
  if (!llm.isConfigured()) {
    return generateCommentFallback(context);
  }

  const userPrompt = buildCommentPrompt(context);
  
  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT_COMMENT },
    { role: 'user', content: userPrompt },
  ];

  try {
    const result = await llm.complete(messages, {
      temperature: 0.85,
      maxTokens: 400,
    });

    return {
      text: result.content.trim(),
      tone: context.commenterPersona.tone || 'casual',
      replyTo: context.parentComment,
    };
  } catch (error) {
    console.error('LLM comment generation failed:', error);
    return generateCommentFallback(context);
  }
}

/**
 * Generate multiple comments for a thread
 */
export async function generateCommentThread(
  baseContext: CommentGenerationContext,
  numComments: number,
  commenterPersonas: Array<{ username: string; info: string; role?: string; tone?: string }>,
  provider?: LLMProvider
): Promise<GeneratedComment[]> {
  const comments: GeneratedComment[] = [];
  const existingComments: string[] = [];

  for (let i = 0; i < numComments && i < commenterPersonas.length; i++) {
    const persona = commenterPersonas[i];
    const isFirst = i === 0;
    
    // Determine if this comment should be a reply to a previous one
    const shouldReply = !isFirst && comments.length > 0 && Math.random() > 0.4;
    const parentComment = shouldReply ? comments[comments.length - 1].text : undefined;

    const context: CommentGenerationContext = {
      ...baseContext,
      commenterPersona: persona,
      isFirstComment: isFirst,
      parentComment,
      existingComments: [...existingComments],
    };

    const comment = await generateComment(context, provider);
    comments.push(comment);
    existingComments.push(comment.text);
  }

  return comments;
}

// ============================================
// Prompt Builders
// ============================================

function buildPostPrompt(context: ContentGenerationContext): string {
  let prompt = `Write a Reddit post for the following context:

**Subreddit**: ${context.subreddit.name}
${context.subreddit.culture ? `**Subreddit culture**: ${context.subreddit.culture}` : ''}

**Persona writing the post**: ${context.persona.username}
**Persona background**: ${context.persona.info}
${context.persona.tone ? `**Persona tone**: ${context.persona.tone}` : ''}

**Topic/Theme**: ${context.theme.keyword}
**Post type**: ${context.postType}

**Company context** (DO NOT directly promote, but this is the product that might naturally come up in comments):
- Name: ${context.company.name}
- What it does: ${context.company.description}
${context.company.painPoints ? `- Pain points it solves: ${context.company.painPoints.join(', ')}` : ''}

Write an authentic post that:
1. Fits naturally in ${context.subreddit.name}
2. Sounds like ${context.persona.username} based on their background
3. Is related to "${context.theme.keyword}"
4. Is a ${context.postType} post
5. Does NOT mention ${context.company.name} directly
6. Invites genuine discussion`;

  // Add improvement hints if this is a retry
  if (context.improvementHints && context.improvementHints.length > 0) {
    prompt += `

**IMPORTANT - Previous version scored too low. Please address these issues:**
${context.improvementHints.map((hint, i) => `${i + 1}. ${hint}`).join('\n')}

Make sure to specifically address each of these points while keeping the post natural.`;
  }

  prompt += `

Return JSON with title, body, and relevant keywords.`;

  return prompt;
}

function buildCommentPrompt(context: CommentGenerationContext): string {
  let prompt = `Write a Reddit comment for this thread:

**Subreddit**: ${context.subreddit.name}

**Original Post Title**: ${context.postTitle}
**Original Post Body**: ${context.postBody}

**You are commenting as**: ${context.commenterPersona.username}
**Your background**: ${context.commenterPersona.info}
${context.commenterPersona.tone ? `**Your tone**: ${context.commenterPersona.tone}` : ''}

**Company context** (you can mention this naturally if it fits):
- Name: ${context.company.name}
- What it does: ${context.company.description}
`;

  if (context.isFirstComment) {
    prompt += `
**This is the FIRST comment on the thread.**
Provide a helpful, authentic response. If ${context.company.name} is relevant, you can mention it as a genuine recommendation based on your experience.`;
  } else if (context.parentComment) {
    prompt += `
**You are REPLYING to this comment**:
"${context.parentComment}"

Add to the conversation naturally. You can agree, slightly disagree, or share your own perspective.`;
  } else {
    prompt += `
**Add a new comment to the thread.**
Share your perspective or experience related to the post topic.`;
  }

  if (context.existingComments && context.existingComments.length > 0) {
    prompt += `

**Other comments already in thread**:
${context.existingComments.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

Don't repeat what others have said. Add new value.`;
  }

  prompt += `

Write only the comment text, nothing else.`;

  return prompt;
}

// ============================================
// Fallback Generators (no LLM)
// ============================================

function generatePostContentFallback(context: ContentGenerationContext): GeneratedPostContent {
  const { theme, persona, subreddit, postType, company } = context;
  
  const titleTemplates: Record<string, string[]> = {
    question: [
      `What's the best ${theme.keyword}?`,
      `${theme.keyword} - what do you all use?`,
      `Looking for ${theme.keyword} recommendations`,
      `Anyone have experience with ${theme.keyword}?`,
    ],
    comparison: [
      `${theme.keyword} - what's everyone's take?`,
      `Comparing options for ${theme.keyword}`,
      `${theme.keyword}?`,
    ],
    story: [
      `My experience with ${theme.keyword}`,
      `Finally figured out ${theme.keyword}`,
      `${theme.keyword} journey - what worked for me`,
    ],
    discussion: [
      `Let's talk about ${theme.keyword}`,
      `${theme.keyword} - best practices?`,
      `How do you handle ${theme.keyword}?`,
    ],
  };

  const bodyTemplates: Record<string, string[]> = {
    question: [
      `Hey ${subreddit.name}, I've been looking into ${theme.keyword} and there are so many options out there. I work in ${persona.role || 'tech'} and need something reliable.\n\nWhat are you all using? Any recommendations would be super helpful. Thanks in advance!`,
      `Just like it says in the title - I need help with ${theme.keyword}. I've tried a few things but nothing has really stuck.\n\nMy main requirements are:\n- Easy to use\n- Actually saves time\n- Doesn't cost a fortune\n\nWhat's working for you?`,
    ],
    comparison: [
      `I keep seeing different recommendations for ${theme.keyword}. Some people swear by one thing, others say something else entirely.\n\nWhat's the actual difference? I'm trying to figure out what would work best for my use case.\n\nFor context: ${persona.info.slice(0, 100)}...`,
    ],
    story: [
      `So I've been struggling with ${theme.keyword} for a while now. After trying way too many options, I think I've finally found something that works.\n\nWanted to share my experience in case it helps anyone else in the same boat.\n\nBasically, the main issues I ran into were...`,
    ],
    discussion: [
      `Been thinking about ${theme.keyword} lately and curious what this community thinks.\n\nHow do you all approach this? Any tips or best practices you've picked up?\n\nI'm especially interested in hearing from people who ${persona.role ? `work in ${persona.role}` : 'have dealt with this before'}.`,
    ],
  };

  const titles = titleTemplates[postType] || titleTemplates.question;
  const bodies = bodyTemplates[postType] || bodyTemplates.question;

  return {
    title: titles[Math.floor(Math.random() * titles.length)],
    body: bodies[Math.floor(Math.random() * bodies.length)],
    keywords: [theme.keyword],
  };
}

function generateCommentFallback(context: CommentGenerationContext): GeneratedComment {
  const { company, commenterPersona, isFirstComment, parentComment } = context;
  
  const firstCommentTemplates = [
    `I've tried a bunch of tools for this. ${company.name} is the only one that doesn't make me want to tear my hair out. Been using it for a few months now.`,
    `${company.name} has worked well for my team. The AI actually understands what we need, which is rare.`,
    `We switched to ${company.name} at work and it's been solid. Takes rough notes and turns them into decent output.`,
    `Been using ${company.name} recently and it's been a game changer for this exact use case.`,
  ];

  const replyTemplates = [
    `+1 ${company.name}. Same experience here.`,
    `I'll second ${company.name}. Been using it for a while.`,
    `Yeah ${company.name} is solid. I put stuff through it and then tweak from there.`,
  ];

  const additionalTemplates = [
    `I've had mixed results with other tools but ${company.name}'s defaults are pretty good.`,
    `Same here. Most AI tools are hit or miss but ${company.name} has been consistent.`,
    `The thing I like about ${company.name} is it doesn't require a lot of back and forth.`,
  ];

  let templates: string[];
  if (isFirstComment) {
    templates = firstCommentTemplates;
  } else if (parentComment) {
    templates = replyTemplates;
  } else {
    templates = additionalTemplates;
  }

  return {
    text: templates[Math.floor(Math.random() * templates.length)],
    tone: commenterPersona.tone || 'casual',
    replyTo: parentComment,
  };
}
