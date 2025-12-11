import {
  Theme,
  Subreddit,
  Persona,
  Company,
  PlannerHistory,
  PostType,
  ThemeCategory,
} from '@/types';
import { GUARDRAIL_RULES } from './guardrails';

export interface TopicSelection {
  theme: Theme;
  subreddit: Subreddit;
  postType: PostType;
  title: string;
  bodyPreview: string;
  relevanceScore: number;
}

export interface TopicSelectorInput {
  themes: Theme[];
  subreddits: Subreddit[];
  company: Company;
  history: PlannerHistory;
  numTopicsNeeded: number;
}


/**
 * Score how well a theme fits a subreddit (0-10)
 */
function getThemeSubredditCompatibility(
  theme: Theme,
  subreddit: Subreddit,
  company: Company
): number {
  let score = 5; // Base score
  
  const keywordLower = theme.keyword.toLowerCase();
  const subredditLower = subreddit.name.toLowerCase();
  
  // Check for direct mentions of subreddit topic in keyword
  if (subredditLower.includes('powerpoint')) {
    if (keywordLower.includes('powerpoint') || 
        keywordLower.includes('presentation') || 
        keywordLower.includes('slides') ||
        keywordLower.includes('slide deck')) {
      score += 3;
    }
  }
  
  if (subredditLower.includes('canva')) {
    if (keywordLower.includes('canva') || 
        keywordLower.includes('design') ||
        keywordLower.includes('alternative')) {
      score += 3;
    }
  }
  
  if (subredditLower.includes('claude')) {
    if (keywordLower.includes('claude') || 
        keywordLower.includes('ai')) {
      score += 3;
    }
  }
  
  if (subredditLower.includes('startup')) {
    if (keywordLower.includes('startup') || 
        keywordLower.includes('pitch deck') ||
        keywordLower.includes('business')) {
      score += 3;
    }
  }
  
  if (subredditLower.includes('consult')) {
    if (keywordLower.includes('consultant') || 
        keywordLower.includes('business') ||
        keywordLower.includes('deck')) {
      score += 3;
    }
  }
  
  if (subredditLower.includes('saas')) {
    if (keywordLower.includes('tool') || 
        keywordLower.includes('automate') ||
        keywordLower.includes('saas')) {
      score += 3;
    }
  }
  
  // Comparison themes work well in product-specific subreddits
  if (theme.category === 'comparison') {
    if (subredditLower.includes('canva') || 
        subredditLower.includes('claude') ||
        subredditLower.includes('powerpoint')) {
      score += 2;
    }
  }
  
  return Math.min(10, score);
}

/**
 * Map theme category to appropriate post type
 */
function categoryToPostType(category?: ThemeCategory): PostType {
  switch (category) {
    case 'question':
      return 'question';
    case 'comparison':
      return 'comparison';
    case 'story':
      return 'story';
    case 'education':
      return 'discussion';
    case 'case-study':
      return 'story';
    default:
      return 'question';
  }
}

/**
 * Generate a natural-sounding post title based on theme and subreddit
 */
function generateTitle(
  theme: Theme,
  subreddit: Subreddit,
  postType: PostType,
  company: Company
): string {
  const keyword = theme.keyword;
  
  // Templates by post type
  const questionTemplates = [
    `What's the ${keyword}?`,
    `Best ${keyword}?`,
    `Looking for ${keyword} recommendations`,
    `${keyword} - what do you use?`,
    `Anyone have experience with ${keyword}?`,
  ];
  
  const comparisonTemplates = [
    `${keyword} - what's everyone's take?`,
    `${keyword}?`,
    `Comparing options: ${keyword}`,
    `${keyword} - worth switching?`,
  ];
  
  const storyTemplates = [
    `My experience with ${keyword}`,
    `Finally found a good ${keyword}`,
    `Struggling with ${keyword}`,
    `${keyword} - my journey`,
  ];
  
  const discussionTemplates = [
    `Let's talk about ${keyword}`,
    `${keyword} - best practices?`,
    `How do you handle ${keyword}?`,
    `${keyword} workflow tips`,
  ];
  
  let templates: string[];
  switch (postType) {
    case 'question':
      templates = questionTemplates;
      break;
    case 'comparison':
      templates = comparisonTemplates;
      break;
    case 'story':
      templates = storyTemplates;
      break;
    case 'discussion':
      templates = discussionTemplates;
      break;
    default:
      templates = questionTemplates;
  }
  
  // Pick a random template
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // Clean up the title (capitalize first letter, etc.)
  return template.charAt(0).toUpperCase() + template.slice(1);
}

/**
 * Generate a preview of the post body
 */
function generateBodyPreview(
  theme: Theme,
  subreddit: Subreddit,
  postType: PostType,
  persona: Persona,
  company: Company
): string {
  const keyword = theme.keyword;
  
  // Body previews by post type and persona role
  const questionBodies = [
    `I've been looking into ${keyword} and there are so many options. What do you all recommend?`,
    `Just like it says in the title, I need help finding ${keyword}. I've tried a few but nothing sticks.`,
    `My team needs ${keyword} urgently. What's working for you?`,
    `Curious what the community thinks about ${keyword}. Any favorites?`,
  ];
  
  const comparisonBodies = [
    `Trying to figure out which option is best for ${keyword}. Anyone compared these?`,
    `I keep seeing different recommendations for ${keyword}. What's the actual difference?`,
    `Been researching ${keyword} and can't decide. What's your experience?`,
  ];
  
  const storyBodies = [
    `I finally found something that works for ${keyword}. Wanted to share my experience...`,
    `After months of frustration with ${keyword}, here's what I learned...`,
    `Just wanted to share my journey finding ${keyword}. It was harder than expected...`,
  ];
  
  let bodies: string[];
  switch (postType) {
    case 'question':
      bodies = questionBodies;
      break;
    case 'comparison':
      bodies = comparisonBodies;
      break;
    case 'story':
      bodies = storyBodies;
      break;
    default:
      bodies = questionBodies;
  }
  
  return bodies[Math.floor(Math.random() * bodies.length)];
}

/**
 * Select topics for the week
 * 
 * Algorithm:
 * 1. Score all theme-subreddit combinations
 * 2. Filter out recently used themes
 * 3. Ensure subreddit diversity (no duplicates)
 * 4. Return top N selections
 */
export function selectTopics(input: TopicSelectorInput): TopicSelection[] {
  const { themes, subreddits, company, history, numTopicsNeeded } = input;
  
  // Generate all possible combinations with scores
  const combinations: TopicSelection[] = [];
  
  for (const theme of themes) {
    // Check if theme was used recently
    const themeRecord = history.themeUsage.find(t => t.themeId === theme.id);
    let themeRecency = 1.0; // Full weight if never used
    
    if (themeRecord?.lastUsedDate) {
      const weeksSinceUse = Math.floor(
        (Date.now() - new Date(themeRecord.lastUsedDate).getTime()) / 
        (1000 * 60 * 60 * 24 * 7)
      );
      
      if (weeksSinceUse < GUARDRAIL_RULES.MIN_WEEKS_BEFORE_THEME_REUSE) {
        themeRecency = 0.3; // Penalize recently used themes
      } else {
        themeRecency = Math.min(1.0, weeksSinceUse / 10); // Older themes get priority
      }
    }
    
    for (const subreddit of subreddits) {
      const compatibility = getThemeSubredditCompatibility(theme, subreddit, company);
      const postType = categoryToPostType(theme.category);
      
      // Calculate final relevance score
      const relevanceScore = compatibility * themeRecency;
      
      // Generate title and body preview (will be refined by LLM later)
      const title = generateTitle(theme, subreddit, postType, company);
      const bodyPreview = generateBodyPreview(
        theme, 
        subreddit, 
        postType, 
        { id: '', username: '', info: '', maxPostsPerWeek: 2 }, // Placeholder persona
        company
      );
      
      combinations.push({
        theme,
        subreddit,
        postType,
        title,
        bodyPreview,
        relevanceScore,
      });
    }
  }
  
  // Sort by relevance score
  combinations.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Select top combinations ensuring subreddit diversity
  const selected: TopicSelection[] = [];
  const usedSubreddits = new Set<string>();
  const usedThemes = new Set<string>();
  
  for (const combo of combinations) {
    if (selected.length >= numTopicsNeeded) break;
    
    // Skip if subreddit already used
    if (usedSubreddits.has(combo.subreddit.name)) continue;
    
    // Skip if theme already used (prefer diversity)
    if (usedThemes.has(combo.theme.id)) continue;
    
    selected.push(combo);
    usedSubreddits.add(combo.subreddit.name);
    usedThemes.add(combo.theme.id);
  }
  
  // If we still need more and ran out of unique combos, allow theme reuse
  if (selected.length < numTopicsNeeded) {
    for (const combo of combinations) {
      if (selected.length >= numTopicsNeeded) break;
      if (usedSubreddits.has(combo.subreddit.name)) continue;
      
      selected.push(combo);
      usedSubreddits.add(combo.subreddit.name);
    }
  }
  
  return selected;
}

/**
 * Refresh titles and bodies for a topic selection
 * Can be called multiple times to get variety
 */
export function refreshTopicContent(
  selection: TopicSelection,
  persona: Persona,
  company: Company
): TopicSelection {
  return {
    ...selection,
    title: generateTitle(selection.theme, selection.subreddit, selection.postType, company),
    bodyPreview: generateBodyPreview(
      selection.theme,
      selection.subreddit,
      selection.postType,
      persona,
      company
    ),
  };
}
