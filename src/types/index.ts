
export interface Company {
  name: string;
  website?: string;
  description: string;
  painPoints?: string[]; 
  icp?: string;           
}

export interface Persona {
  id: string;
  username: string;
  info: string;           // Full persona description
  role?: string;          // e.g., "founder", "marketer", "student"
  tone?: string;          // e.g., "curious", "data-driven", "casual"
  allowedClaims?: string[]; // What this persona can credibly claim
  forbidden?: string[];     // Topics/language to avoid
  maxPostsPerWeek: number;  // Posting frequency limit
}

export interface Subreddit {
  name: string;           // e.g., "r/PowerPoint"
  rules?: string[];       // Subreddit-specific rules
  maxPostsPerWeek: number; // Default: 1 per the algorithm
  culture?: string;       // Description of subreddit culture/norms
}

export interface Theme {
  id: string;             // e.g., "K1"
  keyword: string;        // e.g., "best ai presentation maker"
  category?: ThemeCategory;
}

export type ThemeCategory = 'education' | 'story' | 'question' | 'case-study' | 'comparison';

export interface PlannerInput {
  company: Company;
  personas: Persona[];
  subreddits: Subreddit[];
  themes: Theme[];
  postsPerWeek: number;
  weekStart?: Date;       // Defaults to next Monday
}

export interface PlannedComment {
  id: string;
  persona: Persona;
  delayMinutes: number;   // Delay from post time
  seedText: string;       // The comment content/idea
  parentCommentId?: string; // For threaded replies
  timing: Date;           // Actual scheduled time
}

export interface PlannedPost {
  id: string;
  day: Date;
  dayOfWeek: string;      // e.g., "Tuesday"
  subreddit: Subreddit;
  persona: Persona;       // The OP
  title: string;          // Post title
  bodyPreview: string;    // Post body idea/preview
  postBody?: string;      // Full post body (when full-content mode is used)
  postType: PostType;
  themeIds: string[];     // Which themes this targets
  comments: PlannedComment[];
  qualityScore: number;   // 0-10
  qualityFactors: QualityFactor[];
  scheduledTime: Date;    // Exact posting time
}

export type PostType = 'question' | 'story' | 'discussion' | 'comparison' | 'rant' | 'advice-seeking';

export interface QualityFactor {
  factor: string;
  score: number;          // 0-10
  reason: string;
}

export interface CalendarWeek {
  id: string;
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  entries: PlannedPost[];
  generatedAt: Date;
}


export interface ThemeUsageRecord {
  themeId: string;
  lastUsedDate: Date;
  usageCount: number;
  subredditsUsedIn: string[];
}

export interface PersonaActivityRecord {
  personaId: string;
  lastPostDate?: Date;
  lastCommentDate?: Date;
  postsThisWeek: number;
  postDates: Date[];      // For 48h gap calculation
}

export interface SubredditPostRecord {
  subredditName: string;
  postsThisWeek: number;
  lastPostDate?: Date;
  postDates: Date[];
}

export interface PlannerHistory {
  themeUsage: ThemeUsageRecord[];
  personaActivity: PersonaActivityRecord[];
  subredditPosts: SubredditPostRecord[];
  generatedWeeks: CalendarWeek[];
  lastUpdated: Date;
}

export interface GuardrailViolation {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  affectedEntity?: string;
}

export interface GuardrailCheck {
  passed: boolean;
  violations: GuardrailViolation[];
}


export interface GenerateCalendarRequest {
  input: PlannerInput;
  forceRegenerate?: boolean;
}

export interface GenerateCalendarResponse {
  success: boolean;
  calendar?: CalendarWeek;
  error?: string;
  guardrailViolations?: GuardrailViolation[];
}

// ============================================
// UI State Types
// ============================================

export interface FormState {
  company: Company;
  personas: Persona[];
  subreddits: Subreddit[];
  themes: Theme[];
  postsPerWeek: number;
}

export interface CalendarViewState {
  currentWeek: CalendarWeek | null;
  previousWeeks: CalendarWeek[];
  isGenerating: boolean;
  error: string | null;
}
