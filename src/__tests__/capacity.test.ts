import { calculateWeeklyCapacity, getOptimalPostingDays } from '@/lib/planner/capacity';
import { PlannerInput, PlannerHistory, Persona, Subreddit, Theme } from '@/types';

const createPersona = (id: string, maxPosts = 2): Persona => ({
  id,
  username: id,
  info: 'Test persona',
  maxPostsPerWeek: maxPosts,
});

const createSubreddit = (name: string): Subreddit => ({
  name,
  maxPostsPerWeek: 1,
});

const emptyHistory = (): PlannerHistory => ({
  themeUsage: [],
  personaActivity: [],
  subredditPosts: [],
  generatedWeeks: [],
  lastUpdated: new Date(),
});

describe('Capacity Calculation', () => {
  describe('calculateWeeklyCapacity', () => {
    it('calculates slots based on minimum of posts, subreddits, and persona capacity', () => {
      const input: PlannerInput = {
        company: { name: 'Test', description: 'Test company' },
        personas: [createPersona('p1'), createPersona('p2')],
        subreddits: [createSubreddit('r/a'), createSubreddit('r/b'), createSubreddit('r/c')],
        themes: [{ id: 'K1', keyword: 'test' }],
        postsPerWeek: 5, // Request 5
      };

      const result = calculateWeeklyCapacity(input, emptyHistory(), new Date());

      // Limited by subreddits (3) since personas can do 4 total (2 each)
      expect(result.totalSlots).toBe(3);
      expect(result.availableSubreddits).toHaveLength(3);
    });

    it('returns 0 slots when subreddits are exhausted', () => {
      const history = emptyHistory();
      history.subredditPosts = [
        { subredditName: 'r/a', postsThisWeek: 1, postDates: [new Date()] },
        { subredditName: 'r/b', postsThisWeek: 1, postDates: [new Date()] },
      ];

      const input: PlannerInput = {
        company: { name: 'Test', description: 'Test company' },
        personas: [createPersona('p1')],
        subreddits: [createSubreddit('r/a'), createSubreddit('r/b')],
        themes: [{ id: 'K1', keyword: 'test' }],
        postsPerWeek: 2,
      };

      const result = calculateWeeklyCapacity(input, history, new Date());

      expect(result.totalSlots).toBe(0);
      expect(result.availableSubreddits).toHaveLength(0);
    });

    it('respects persona weekly limits', () => {
      const weekStart = new Date('2024-01-08');
      const withinWeek = new Date('2024-01-09');
      
      const history = emptyHistory();
      // Add posts within the week being calculated
      history.personaActivity = [
        { 
          personaId: 'p1', 
          postsThisWeek: 2, 
          postDates: [withinWeek, withinWeek], // Two posts in the week
        },
      ];

      const input: PlannerInput = {
        company: { name: 'Test', description: 'Test company' },
        personas: [createPersona('p1', 2), createPersona('p2', 2)],
        subreddits: [createSubreddit('r/a'), createSubreddit('r/b'), createSubreddit('r/c')],
        themes: [{ id: 'K1', keyword: 'test' }],
        postsPerWeek: 4,
      };

      const result = calculateWeeklyCapacity(input, history, weekStart);
      
      // p2 should have full capacity since no history
      const p2Availability = result.availablePersonas.find(p => p.persona.id === 'p2');
      expect(p2Availability?.remainingPosts).toBe(2);
      
      // Total slots should be limited
      expect(result.totalSlots).toBeLessThanOrEqual(3); // Limited by subreddits
    });
  });

  describe('getOptimalPostingDays', () => {
    it('prefers Tuesday-Thursday for higher engagement', () => {
      // Start on a Monday
      const monday = new Date('2024-01-08'); // This is a Monday
      const days = getOptimalPostingDays(monday, 3);

      // Should prefer Tue, Wed, Thu
      const dayNames = days.map(d => d.toLocaleDateString('en-US', { weekday: 'long' }));
      
      expect(dayNames).toContain('Tuesday');
      expect(dayNames).toContain('Wednesday');
      expect(dayNames).toContain('Thursday');
    });

    it('returns requested number of days', () => {
      const monday = new Date('2024-01-08');
      
      expect(getOptimalPostingDays(monday, 1)).toHaveLength(1);
      expect(getOptimalPostingDays(monday, 3)).toHaveLength(3);
      expect(getOptimalPostingDays(monday, 5)).toHaveLength(5);
    });

    it('returns days in chronological order', () => {
      const monday = new Date('2024-01-08');
      const days = getOptimalPostingDays(monday, 4);

      for (let i = 1; i < days.length; i++) {
        expect(days[i].getTime()).toBeGreaterThan(days[i - 1].getTime());
      }
    });
  });
});
