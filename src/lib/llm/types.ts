
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface LLMCompletionResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  name: string;
  complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMCompletionResult>;
  isConfigured(): boolean;
}


export interface GeneratedPostContent {
  title: string;
  body: string;
  keywords: string[];
}

export interface GeneratedComment {
  text: string;
  tone: string;
  replyTo?: string; // comment ID this replies to
}

export interface GeneratedThread {
  post: GeneratedPostContent;
  comments: GeneratedComment[];
}

export interface ContentGenerationContext {
  company: {
    name: string;
    description: string;
    painPoints?: string[];
  };
  persona: {
    username: string;
    info: string;
    role?: string;
    tone?: string;
  };
  subreddit: {
    name: string;
    culture?: string;
  };
  theme: {
    keyword: string;
    category?: string;
  };
  postType: string;
}

export interface CommentGenerationContext extends ContentGenerationContext {
  postTitle: string;
  postBody: string;
  commenterPersona: {
    username: string;
    info: string;
    role?: string;
    tone?: string;
  };
  isFirstComment: boolean;
  parentComment?: string;
  existingComments?: string[];
}

export interface LLMQualityScore {
  score: number; // 0-10
  naturalness: number;
  authenticity: number;
  engagement: number;
  feedback: string;
  suggestions?: string[];
}

export interface QualityEvaluationContext {
  title: string;
  body: string;
  subreddit: string;
  persona: string;
  comments?: string[];
  companyName: string;
}

export type ContentGenerationMode = 'titles-only' | 'full-content';

export interface GenerationConfig {
  mode: ContentGenerationMode;
  useLLMScoring: boolean;
  llmProvider?: string;
}
