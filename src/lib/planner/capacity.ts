import {
  PlannerInput,
  PlannerHistory,
  Persona,
  Subreddit,
} from '@/types';
import { GUARDRAIL_RULES } from './guardrails';


export interface WeeklyCapacity {
  totalSlots: number;
  availableSubreddits: Subreddit[];
  availablePersonas: PersonaAvailability[];
  constraintReason?: string;
}

export interface PersonaAvailability {
  persona: Persona;
  remainingPosts: number;
  availableDays: Date[];
  blockedUntil?: Date;
}

/**
 * Calculate the weekly capacity based on inputs and guardrails
 * 
 * Rules from outline.md:
 * - Max 1 post per subreddit per week
 * - Max 1 post per persona per day
 * - Min 48h gap between same persona posting
 * - No more than 2 personas interacting per post
 * 
 * slots = min(postsPerWeek, subreddits.length, personas.length * 3)
 */
export function calculateWeeklyCapacity(
  input: PlannerInput,
  history: PlannerHistory,
  weekStart: Date
): WeeklyCapacity {
  const { postsPerWeek, subreddits, personas } = input;
  
  // Get available subreddits (not already posted to this week)
  const availableSubreddits = getAvailableSubreddits(subreddits, history, weekStart);
  
  // Get available personas with their constraints
  const availablePersonas = getPersonaAvailability(personas, history, weekStart);
  
  // Calculate max possible slots
  // Each persona can post max ~3 times per week (due to 48h rule: Mon, Wed, Fri pattern)
  const maxPersonaSlots = availablePersonas.reduce(
    (sum, pa) => sum + pa.remainingPosts,
    0
  );
  
  // The limiting factor determines our capacity
  const totalSlots = Math.min(
    postsPerWeek,
    availableSubreddits.length,
    maxPersonaSlots
  );
  
  // Determine what's limiting us
  let constraintReason: string | undefined;
  if (totalSlots < postsPerWeek) {
    if (availableSubreddits.length === totalSlots) {
      constraintReason = `Limited by available subreddits (${availableSubreddits.length})`;
    } else if (maxPersonaSlots === totalSlots) {
      constraintReason = `Limited by persona availability (${maxPersonaSlots} slots)`;
    }
  }
  
  return {
    totalSlots,
    availableSubreddits,
    availablePersonas,
    constraintReason,
  };
}

/**
 * Get subreddits that haven't been posted to this week
 */
function getAvailableSubreddits(
  subreddits: Subreddit[],
  history: PlannerHistory,
  weekStart: Date
): Subreddit[] {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  return subreddits.filter(subreddit => {
    const record = history.subredditPosts.find(
      s => s.subredditName === subreddit.name
    );
    
    if (!record) return true;
    
    // Check if posts this week exceed limit
    const postsThisWeek = record.postDates.filter(date => {
      const postDate = new Date(date);
      return postDate >= weekStart && postDate < weekEnd;
    }).length;
    
    return postsThisWeek < subreddit.maxPostsPerWeek;
  });
}

/**
 * Calculate persona availability for the week
 */
function getPersonaAvailability(
  personas: Persona[],
  history: PlannerHistory,
  weekStart: Date
): PersonaAvailability[] {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  return personas.map(persona => {
    const record = history.personaActivity.find(
      p => p.personaId === persona.id
    );
    
    // Calculate remaining posts for this week
    let postsThisWeek = 0;
    const blockedDays: Set<string> = new Set();
    
    if (record) {
      // Count posts already made this week
      postsThisWeek = record.postDates.filter(date => {
        const postDate = new Date(date);
        return postDate >= weekStart && postDate < weekEnd;
      }).length;
      
      // Mark days as blocked based on 48h rule
      for (const postDate of record.postDates) {
        const date = new Date(postDate);
        // Block the day of post and next day
        blockedDays.add(date.toDateString());
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        blockedDays.add(nextDay.toDateString());
      }
    }
    
    const remainingPosts = Math.max(0, persona.maxPostsPerWeek - postsThisWeek);
    
    // Get available days (Mon-Sun of the week, excluding blocked days)
    const availableDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      
      if (!blockedDays.has(day.toDateString())) {
        availableDays.push(day);
      }
    }
    
    // Calculate blocked until date (48h after last post)
    let blockedUntil: Date | undefined;
    if (record?.lastPostDate) {
      blockedUntil = new Date(record.lastPostDate);
      blockedUntil.setHours(
        blockedUntil.getHours() + GUARDRAIL_RULES.MIN_HOURS_BETWEEN_SAME_PERSONA_POSTS
      );
    }
    
    return {
      persona,
      remainingPosts,
      availableDays,
      blockedUntil,
    };
  });
}

/**
 * Get the optimal posting days for the week
 * Weighted towards Tue-Thu for better engagement
 */
export function getOptimalPostingDays(
  weekStart: Date,
  numSlots: number
): Date[] {
  const days: { date: Date; weight: number }[] = [];
  
  // Day weights (0 = Sunday, 1 = Monday, etc.)
  const dayWeights: Record<number, number> = {
    0: 0.3,  // Sunday - low engagement
    1: 0.6,  // Monday - moderate
    2: 1.0,  // Tuesday - high
    3: 1.0,  // Wednesday - high
    4: 1.0,  // Thursday - high
    5: 0.5,  // Friday - lower (weekend starts)
    6: 0.3,  // Saturday - low
  };
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayOfWeek = day.getDay();
    days.push({
      date: day,
      weight: dayWeights[dayOfWeek],
    });
  }
  
  // Sort by weight (highest first) and take numSlots
  days.sort((a, b) => b.weight - a.weight);
  
  // Take the top slots and sort by date
  const selectedDays = days.slice(0, numSlots).map(d => d.date);
  selectedDays.sort((a, b) => a.getTime() - b.getTime());
  
  return selectedDays;
}

/**
 * Check if a specific day is available for a persona
 */
export function isDayAvailableForPersona(
  persona: Persona,
  day: Date,
  history: PlannerHistory,
  plannedPostDates: Date[] // Posts already planned for this persona
): boolean {
  const record = history.personaActivity.find(p => p.personaId === persona.id);
  const allPostDates = [...(record?.postDates || []), ...plannedPostDates];
  
  for (const postDate of allPostDates) {
    const date = new Date(postDate);
    const hoursDiff = Math.abs(day.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff < GUARDRAIL_RULES.MIN_HOURS_BETWEEN_SAME_PERSONA_POSTS) {
      return false;
    }
  }
  
  return true;
}
