import {
  PlannerHistory,
  CalendarWeek,
  ThemeUsageRecord,
  PersonaActivityRecord,
  SubredditPostRecord,
} from '@/types';

/**
 * Abstract storage interface for planner data
 * Implement this interface for different storage backends
 */
export interface IStorageProvider {
  name: string;
  
  // History operations
  getHistory(): Promise<PlannerHistory>;
  saveHistory(history: PlannerHistory): Promise<void>;
  clearHistory(): Promise<void>;
  
  // Calendar operations
  getCalendars(): Promise<CalendarWeek[]>;
  getCalendarByWeek(weekStart: Date): Promise<CalendarWeek | null>;
  getLatestCalendar(): Promise<CalendarWeek | null>;
  saveCalendar(calendar: CalendarWeek): Promise<void>;
  deleteCalendar(calendarId: string): Promise<void>;
  
  // Record operations
  getThemeUsage(themeId: string): Promise<ThemeUsageRecord | null>;
  getPersonaActivity(personaId: string): Promise<PersonaActivityRecord | null>;
  getSubredditPosts(subredditName: string): Promise<SubredditPostRecord | null>;
  
  // Utility
  isAvailable(): boolean;
  initialize?(): Promise<void>;
}

export interface StorageConfig {
  provider: 'localStorage' | 'supabase' | 'memory';
  supabaseUrl?: string;
  supabaseKey?: string;
}


const providers: Map<string, IStorageProvider> = new Map();
let activeProvider: IStorageProvider | null = null;

/**
 * Register a storage provider
 */
export function registerStorageProvider(provider: IStorageProvider): void {
  providers.set(provider.name, provider);
}

/**
 * Get a storage provider by name
 */
export function getStorageProvider(name: string): IStorageProvider | null {
  return providers.get(name) || null;
}

/**
 * Set the active storage provider
 */
export function setActiveStorageProvider(provider: IStorageProvider): void {
  activeProvider = provider;
}

/**
 * Get the active storage provider
 */
export function getActiveStorageProvider(): IStorageProvider | null {
  return activeProvider;
}

/**
 * Initialize storage with configuration
 */
export async function initializeStorage(config: StorageConfig): Promise<IStorageProvider> {
  const provider = providers.get(config.provider);
  
  if (!provider) {
    throw new Error(`Storage provider "${config.provider}" not found. Available: ${Array.from(providers.keys()).join(', ')}`);
  }
  
  if (provider.initialize) {
    await provider.initialize();
  }
  
  setActiveStorageProvider(provider);
  return provider;
}

// ============================================
// Helper Types for Supabase (future)
// ============================================

export interface SupabaseStorageConfig extends StorageConfig {
  provider: 'supabase';
  supabaseUrl: string;
  supabaseKey: string;
  tableName?: string;
}

/**
 * Placeholder for Supabase implementation
 * To implement, create a class that implements IStorageProvider
 * and register it with registerStorageProvider
 */
export const SUPABASE_SCHEMA = {
  calendars: {
    table: 'calendars',
    columns: [
      'id uuid primary key',
      'week_number integer',
      'week_start timestamp',
      'week_end timestamp',
      'entries jsonb',
      'generated_at timestamp',
      'created_at timestamp default now()',
    ],
  },
  history: {
    table: 'planner_history',
    columns: [
      'id uuid primary key',
      'theme_usage jsonb',
      'persona_activity jsonb',
      'subreddit_posts jsonb',
      'last_updated timestamp',
    ],
  },
};
