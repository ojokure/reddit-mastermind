// Main calendar generation
export {
  generateCalendar,
  generateNextWeekCalendar,
  regenerateCalendar,
  getCalendarSummary,
  DEFAULT_GENERATION_OPTIONS,
  type CalendarGenerationResult,
  type GenerationOptions,
} from './calendarGenerator';

// Capacity calculation
export {
  calculateWeeklyCapacity,
  getOptimalPostingDays,
  isDayAvailableForPersona,
  type WeeklyCapacity,
  type PersonaAvailability,
} from './capacity';

// Topic selection
export {
  selectTopics,
  refreshTopicContent,
  type TopicSelection,
  type TopicSelectorInput,
} from './topicSelector';

// Persona assignment
export {
  assignPersonas,
  getRotatedPersonas,
  type PersonaAssignment,
  type AssignmentInput,
} from './personaAssigner';

// Scheduling
export {
  selectPostingDays,
  generatePostTime,
  scheduleComments,
  getDayOfWeekName,
  getWeekStart,
  getNextWeekStart,
  spreadPosts,
  formatDateTime,
  formatRelativeTime,
  POSTING_WINDOWS,
  DAY_WEIGHTS,
} from './scheduler';

// Quality scoring
export {
  calculateQualityScore,
  calculateHybridQualityScore,
  validatePostQuality,
  getImprovementSuggestions,
  MIN_QUALITY_SCORE,
  QUALITY_WEIGHTS,
  type QualityScoreResult,
  type HybridQualityScoreResult,
} from './qualityScorer';

// Guardrails
export {
  canPersonaPostOnDate,
  canPostToSubreddit,
  canUseTheme,
  validateComments,
  validatePostContent,
  validateCommentContent,
  validateCalendarWeek,
  GUARDRAIL_RULES,
} from './guardrails';
