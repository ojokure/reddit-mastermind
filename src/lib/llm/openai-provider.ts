import OpenAI from 'openai';
import {
  LLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
} from './types';


const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1000;

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI | null = null;
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true, // Allow client-side usage for demo
      });
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey && !!this.client;
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult> {
    if (!this.client) {
      throw new Error('OpenAI client not configured. Please set OPENAI_API_KEY.');
    }

    const response = await this.client.chat.completions.create({
      model: options?.model || DEFAULT_MODEL,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
    });

    const choice = response.choices[0];
    
    return {
      content: choice.message.content || '',
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }
}

let providerInstance: OpenAIProvider | null = null;

export function getOpenAIProvider(apiKey?: string): OpenAIProvider {
  if (!providerInstance || apiKey) {
    providerInstance = new OpenAIProvider(apiKey);
  }
  return providerInstance;
}

export function resetOpenAIProvider(): void {
  providerInstance = null;
}

/**
 * Check if OpenAI API key is configured via environment variables
 */
export function hasEnvApiKey(): boolean {
  return !!(process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
}
