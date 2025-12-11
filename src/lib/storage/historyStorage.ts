import {
  PlannerHistory,
  CalendarWeek,
  ThemeUsageRecord,
  PersonaActivityRecord,
  SubredditPostRecord,
  PlannedPost,
} from '@/types';
import { 
  IStorageProvider, 
  registerStorageProvider,
  setActiveStorageProvider,
} from './storage-interface';

const STORAGE_KEYS = {
  HISTORY: 'reddit-planner-history',
  CALENDARS: 'reddit-planner-calendars',
} as const;


function getEmptyHistory(): PlannerHistory {
  return {
    themeUsage: [],
    personaActivity: [],
    subredditPosts: [],
    generatedWeeks: [],
    lastUpdated: new Date(),
  };
}


/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Serialize dates for storage
 */
function serializeHistory(history: PlannerHistory): string {
  return JSON.stringify(history, (key, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  });
}

/**
 * Deserialize dates from storage
 */
function deserializeHistory(json: string): PlannerHistory {
  return JSON.parse(json, (key, value) => {
    // Convert date strings back to Date objects
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value);
    }
    return value;
  });
}


/**
 * Get the current planning history
 */
export function getHistory(): PlannerHistory {
  if (!isLocalStorageAvailable()) {
    return getEmptyHistory();
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!stored) {
      return getEmptyHistory();
    }
    return deserializeHistory(stored);
  } catch (error) {
    console.error('Error reading history from localStorage:', error);
    return getEmptyHistory();
  }
}

/**
 * Save the planning history
 */
export function saveHistory(history: PlannerHistory): void {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage not available');
    return;
  }
  
  try {
    history.lastUpdated = new Date();
    localStorage.setItem(STORAGE_KEYS.HISTORY, serializeHistory(history));
  } catch (error) {
    console.error('Error saving history to localStorage:', error);
  }
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  if (!isLocalStorageAvailable()) return;
  
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    localStorage.removeItem(STORAGE_KEYS.CALENDARS);
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}

/**
 * Record theme usage after calendar generation
 */
export function recordThemeUsage(
  history: PlannerHistory,
  themeId: string,
  subredditName: string,
  date: Date
): PlannerHistory {
  const existing = history.themeUsage.find(t => t.themeId === themeId);
  
  if (existing) {
    existing.lastUsedDate = date;
    existing.usageCount += 1;
    if (!existing.subredditsUsedIn.includes(subredditName)) {
      existing.subredditsUsedIn.push(subredditName);
    }
  } else {
    history.themeUsage.push({
      themeId,
      lastUsedDate: date,
      usageCount: 1,
      subredditsUsedIn: [subredditName],
    });
  }
  
  return history;
}

/**
 * Record persona activity after calendar generation
 */
export function recordPersonaActivity(
  history: PlannerHistory,
  personaId: string,
  postDate: Date,
  isPost: boolean
): PlannerHistory {
  const existing = history.personaActivity.find(p => p.personaId === personaId);
  
  if (existing) {
    if (isPost) {
      existing.lastPostDate = postDate;
      existing.postsThisWeek += 1;
      existing.postDates.push(postDate);
    } else {
      existing.lastCommentDate = postDate;
    }
  } else {
    history.personaActivity.push({
      personaId,
      lastPostDate: isPost ? postDate : undefined,
      lastCommentDate: !isPost ? postDate : undefined,
      postsThisWeek: isPost ? 1 : 0,
      postDates: isPost ? [postDate] : [],
    });
  }
  
  return history;
}

/**
 * Record subreddit post after calendar generation
 */
export function recordSubredditPost(
  history: PlannerHistory,
  subredditName: string,
  postDate: Date
): PlannerHistory {
  const existing = history.subredditPosts.find(s => s.subredditName === subredditName);
  
  if (existing) {
    existing.postsThisWeek += 1;
    existing.lastPostDate = postDate;
    existing.postDates.push(postDate);
  } else {
    history.subredditPosts.push({
      subredditName,
      postsThisWeek: 1,
      lastPostDate: postDate,
      postDates: [postDate],
    });
  }
  
  return history;
}

/**
 * Record a generated calendar week
 */
export function recordCalendarWeek(
  history: PlannerHistory,
  calendar: CalendarWeek
): PlannerHistory {
  // Update theme usage
  for (const post of calendar.entries) {
    for (const themeId of post.themeIds) {
      recordThemeUsage(history, themeId, post.subreddit.name, post.day);
    }
  }
  
  // Update persona activity
  for (const post of calendar.entries) {
    recordPersonaActivity(history, post.persona.id, post.day, true);
    
    for (const comment of post.comments) {
      recordPersonaActivity(history, comment.persona.id, comment.timing, false);
    }
  }
  
  // Update subreddit posts
  for (const post of calendar.entries) {
    recordSubredditPost(history, post.subreddit.name, post.day);
  }
  
  // Add calendar to history
  history.generatedWeeks.push(calendar);
  
  // Keep only last 12 weeks of history
  if (history.generatedWeeks.length > 12) {
    history.generatedWeeks = history.generatedWeeks.slice(-12);
  }
  
  return history;
}

/**
 * Reset weekly counters (call at the start of a new week)
 */
export function resetWeeklyCounters(history: PlannerHistory): PlannerHistory {
  for (const record of history.personaActivity) {
    record.postsThisWeek = 0;
    // Keep only posts from the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    record.postDates = record.postDates.filter(d => new Date(d) > weekAgo);
  }
  
  for (const record of history.subredditPosts) {
    record.postsThisWeek = 0;
    // Keep only posts from the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    record.postDates = record.postDates.filter(d => new Date(d) > weekAgo);
  }
  
  return history;
}

/**
 * Get all saved calendars
 */
export function getSavedCalendars(): CalendarWeek[] {
  const history = getHistory();
  return history.generatedWeeks;
}

/**
 * Get the most recent calendar
 */
export function getLatestCalendar(): CalendarWeek | null {
  const calendars = getSavedCalendars();
  return calendars.length > 0 ? calendars[calendars.length - 1] : null;
}

/**
 * Get calendar for a specific week
 */
export function getCalendarForWeek(weekStart: Date): CalendarWeek | null {
  const calendars = getSavedCalendars();
  return calendars.find(c => {
    const start = new Date(c.weekStart);
    return (
      start.getFullYear() === weekStart.getFullYear() &&
      start.getMonth() === weekStart.getMonth() &&
      start.getDate() === weekStart.getDate()
    );
  }) || null;
}

/**
 * LocalStorage implementation of IStorageProvider
 * This can be swapped with SupabaseStorageProvider for production
 */
export class LocalStorageProvider implements IStorageProvider {
  name = 'localStorage';

  isAvailable(): boolean {
    return isLocalStorageAvailable();
  }

  async getHistory(): Promise<PlannerHistory> {
    return getHistory();
  }

  async saveHistory(history: PlannerHistory): Promise<void> {
    saveHistory(history);
  }

  async clearHistory(): Promise<void> {
    clearHistory();
  }

  async getCalendars(): Promise<CalendarWeek[]> {
    return getSavedCalendars();
  }

  async getCalendarByWeek(weekStart: Date): Promise<CalendarWeek | null> {
    return getCalendarForWeek(weekStart);
  }

  async getLatestCalendar(): Promise<CalendarWeek | null> {
    return getLatestCalendar();
  }

  async saveCalendar(calendar: CalendarWeek): Promise<void> {
    let history = getHistory();
    
    // Check if calendar for this week already exists
    const existingIndex = history.generatedWeeks.findIndex(c => {
      const start = new Date(c.weekStart);
      const newStart = new Date(calendar.weekStart);
      return start.getTime() === newStart.getTime();
    });

    if (existingIndex >= 0) {
      // Replace existing
      history.generatedWeeks[existingIndex] = calendar;
    } else {
      // Add new
      history = recordCalendarWeek(history, calendar);
    }
    
    saveHistory(history);
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    const history = getHistory();
    history.generatedWeeks = history.generatedWeeks.filter(c => c.id !== calendarId);
    saveHistory(history);
  }

  async getThemeUsage(themeId: string): Promise<ThemeUsageRecord | null> {
    const history = getHistory();
    return history.themeUsage.find(t => t.themeId === themeId) || null;
  }

  async getPersonaActivity(personaId: string): Promise<PersonaActivityRecord | null> {
    const history = getHistory();
    return history.personaActivity.find(p => p.personaId === personaId) || null;
  }

  async getSubredditPosts(subredditName: string): Promise<SubredditPostRecord | null> {
    const history = getHistory();
    return history.subredditPosts.find(s => s.subredditName === subredditName) || null;
  }
}

const localStorageProvider = new LocalStorageProvider();
registerStorageProvider(localStorageProvider);
setActiveStorageProvider(localStorageProvider);

export { localStorageProvider };
