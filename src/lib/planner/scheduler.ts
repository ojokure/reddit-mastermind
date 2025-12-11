import { PlannedPost, PlannedComment } from '@/types';

/**
 * Time windows for posting (in hours, 24h format)
 * Based on typical Reddit engagement patterns
 */
export const POSTING_WINDOWS = {
  morning: { start: 8, end: 10 },   // 8am-10am
  midday: { start: 11, end: 13 },   // 11am-1pm
  afternoon: { start: 14, end: 16 }, // 2pm-4pm
  evening: { start: 18, end: 20 },  // 6pm-8pm
} as const;

type TimeWindow = keyof typeof POSTING_WINDOWS;

/**
 * Day-of-week weights for scheduling
 * Higher weight = more likely to schedule on that day
 */
export const DAY_WEIGHTS: Record<number, { weight: number; windows: TimeWindow[] }> = {
  0: { weight: 0.3, windows: ['afternoon', 'evening'] },      // Sunday
  1: { weight: 0.6, windows: ['morning', 'midday'] },         // Monday
  2: { weight: 1.0, windows: ['morning', 'midday', 'afternoon'] }, // Tuesday
  3: { weight: 1.0, windows: ['morning', 'midday', 'afternoon'] }, // Wednesday
  4: { weight: 1.0, windows: ['morning', 'midday', 'afternoon'] }, // Thursday
  5: { weight: 0.5, windows: ['morning', 'midday'] },         // Friday
  6: { weight: 0.3, windows: ['afternoon', 'evening'] },      // Saturday
};

/**
 * Get optimal days for posting based on number of slots
 */
export function selectPostingDays(
  weekStart: Date,
  numPosts: number
): Date[] {
  const days: { date: Date; weight: number }[] = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayOfWeek = day.getDay();
    
    days.push({
      date: day,
      weight: DAY_WEIGHTS[dayOfWeek].weight,
    });
  }
  
  // Sort by weight descending
  days.sort((a, b) => b.weight - a.weight);
  
  // Take top N days and re-sort by date
  const selected = days.slice(0, numPosts).map(d => d.date);
  selected.sort((a, b) => a.getTime() - b.getTime());
  
  return selected;
}

/**
 * Generate a random posting time for a given day
 * Uses appropriate time windows for that day of week
 * Adds ±90 minute randomization
 */
export function generatePostTime(day: Date): Date {
  const dayOfWeek = day.getDay();
  const dayConfig = DAY_WEIGHTS[dayOfWeek];
  
  // Pick a random time window for this day
  const window = dayConfig.windows[Math.floor(Math.random() * dayConfig.windows.length)];
  const windowConfig = POSTING_WINDOWS[window];
  
  // Random hour within window
  const hour = windowConfig.start + Math.floor(Math.random() * (windowConfig.end - windowConfig.start));
  
  // Random minute (0-59)
  const minute = Math.floor(Math.random() * 60);
  
  // Apply ±90 minute randomization
  const randomOffset = Math.floor(Math.random() * 180) - 90; // -90 to +90 minutes
  
  const postTime = new Date(day);
  postTime.setHours(hour, minute, 0, 0);
  postTime.setMinutes(postTime.getMinutes() + randomOffset);
  
  // Ensure we don't go to a different day
  if (postTime.getDate() !== day.getDate()) {
    postTime.setDate(day.getDate());
    postTime.setHours(hour, minute, 0, 0);
  }
  
  return postTime;
}

/**
 * Schedule comments for a post with appropriate delays
 * 
 * Timing rules:
 * - First reply: +30-90 mins
 * - Second reply: +4-24 hours (or chain reply earlier)
 * - OP reply: +10-30 mins after being mentioned
 */
export function scheduleComments(
  postTime: Date,
  comments: PlannedComment[]
): PlannedComment[] {
  return comments.map((comment, index) => {
    const commentTime = new Date(postTime);
    commentTime.setMinutes(commentTime.getMinutes() + comment.delayMinutes);
    
    return {
      ...comment,
      timing: commentTime,
    };
  });
}

/**
 * Get the day of week name
 */
export function getDayOfWeekName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Ensure posts are spread out within the week
 * Minimum 24 hours between posts
 */
export function spreadPosts(posts: PlannedPost[]): PlannedPost[] {
  const sorted = [...posts].sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    
    const hoursDiff = (curr.scheduledTime.getTime() - prev.scheduledTime.getTime()) / (1000 * 60 * 60);
    
    // If less than 24 hours apart, push the current post forward
    if (hoursDiff < 24) {
      const newTime = new Date(prev.scheduledTime);
      newTime.setHours(newTime.getHours() + 24 + Math.floor(Math.random() * 12));
      
      sorted[i] = {
        ...curr,
        scheduledTime: newTime,
        day: newTime,
        dayOfWeek: getDayOfWeekName(newTime),
        comments: scheduleComments(newTime, curr.comments),
      };
    }
  }
  
  return sorted;
}

/**
 * Format a date for display
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format relative time from now
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    return 'soon';
  }
}

/**
 * Get the start of the current week (Monday)
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the start of next week (Monday)
 */
export function getNextWeekStart(date: Date = new Date()): Date {
  const weekStart = getWeekStart(date);
  weekStart.setDate(weekStart.getDate() + 7);
  return weekStart;
}
