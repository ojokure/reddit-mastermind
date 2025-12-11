// Storage interface
export {
  type IStorageProvider,
  type StorageConfig,
  type SupabaseStorageConfig,
  registerStorageProvider,
  getStorageProvider,
  setActiveStorageProvider,
  getActiveStorageProvider,
  initializeStorage,
  SUPABASE_SCHEMA,
} from './storage-interface';

// LocalStorage provider
export {
  LocalStorageProvider,
  localStorageProvider,
  getHistory,
  saveHistory,
  clearHistory,
  getSavedCalendars,
  getLatestCalendar,
  getCalendarForWeek,
  recordThemeUsage,
  recordPersonaActivity,
  recordSubredditPost,
  recordCalendarWeek,
  resetWeeklyCounters,
} from './historyStorage';
