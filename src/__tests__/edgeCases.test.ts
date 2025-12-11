import { selectTopics } from '@/lib/planner/topicSelector';
import { PlannerHistory, Theme, Subreddit, Company } from '@/types';

const mockCompany: Company = {
  name: 'TestCo',
  description: 'A test company',
};

const emptyHistory = (): PlannerHistory => ({
  themeUsage: [],
  personaActivity: [],
  subredditPosts: [],
  generatedWeeks: [],
  lastUpdated: new Date(),
});

describe('Edge Cases', () => {
  describe('Topic Selection', () => {
    it('handles more posts requested than themes available', () => {
      const themes: Theme[] = [
        { id: 'K1', keyword: 'test keyword' },
      ];
      const subreddits: Subreddit[] = [
        { name: 'r/a', maxPostsPerWeek: 1 },
        { name: 'r/b', maxPostsPerWeek: 1 },
        { name: 'r/c', maxPostsPerWeek: 1 },
      ];

      const topics = selectTopics({
        themes,
        subreddits,
        company: mockCompany,
        history: emptyHistory(),
        numTopicsNeeded: 3, // More than themes
      });

      // Should still return topics, potentially reusing theme
      expect(topics.length).toBeGreaterThan(0);
      expect(topics.length).toBeLessThanOrEqual(3);
    });

    it('handles more posts requested than subreddits available', () => {
      const themes: Theme[] = [
        { id: 'K1', keyword: 'keyword 1' },
        { id: 'K2', keyword: 'keyword 2' },
        { id: 'K3', keyword: 'keyword 3' },
      ];
      const subreddits: Subreddit[] = [
        { name: 'r/only', maxPostsPerWeek: 1 },
      ];

      const topics = selectTopics({
        themes,
        subreddits,
        company: mockCompany,
        history: emptyHistory(),
        numTopicsNeeded: 3,
      });

      // Should only return 1 topic (limited by subreddits)
      expect(topics.length).toBe(1);
    });

    it('ensures subreddit diversity (no duplicates)', () => {
      const themes: Theme[] = [
        { id: 'K1', keyword: 'keyword 1' },
        { id: 'K2', keyword: 'keyword 2' },
        { id: 'K3', keyword: 'keyword 3' },
      ];
      const subreddits: Subreddit[] = [
        { name: 'r/a', maxPostsPerWeek: 1 },
        { name: 'r/b', maxPostsPerWeek: 1 },
        { name: 'r/c', maxPostsPerWeek: 1 },
      ];

      const topics = selectTopics({
        themes,
        subreddits,
        company: mockCompany,
        history: emptyHistory(),
        numTopicsNeeded: 3,
      });

      const subredditNames = topics.map(t => t.subreddit.name);
      const uniqueSubreddits = new Set(subredditNames);

      expect(uniqueSubreddits.size).toBe(subredditNames.length);
    });

    it('handles empty themes array', () => {
      const topics = selectTopics({
        themes: [],
        subreddits: [{ name: 'r/test', maxPostsPerWeek: 1 }],
        company: mockCompany,
        history: emptyHistory(),
        numTopicsNeeded: 1,
      });

      expect(topics).toHaveLength(0);
    });

    it('handles empty subreddits array', () => {
      const topics = selectTopics({
        themes: [{ id: 'K1', keyword: 'test' }],
        subreddits: [],
        company: mockCompany,
        history: emptyHistory(),
        numTopicsNeeded: 1,
      });

      expect(topics).toHaveLength(0);
    });

    it('deprioritizes recently used themes', () => {
      const themes: Theme[] = [
        { id: 'K1', keyword: 'recently used' },
        { id: 'K2', keyword: 'never used' },
      ];
      const subreddits: Subreddit[] = [
        { name: 'r/test', maxPostsPerWeek: 1 },
      ];

      const history = emptyHistory();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      history.themeUsage.push({
        themeId: 'K1',
        lastUsedDate: oneWeekAgo,
        usageCount: 1,
        subredditsUsedIn: ['r/other'],
      });

      const topics = selectTopics({
        themes,
        subreddits,
        company: mockCompany,
        history,
        numTopicsNeeded: 1,
      });

      // Should prefer K2 (never used) over K1 (recently used)
      expect(topics[0].theme.id).toBe('K2');
    });
  });

  describe('Input Validation', () => {
    it('handles single persona scenario', () => {
      // This is a minimal but valid setup
      const topics = selectTopics({
        themes: [{ id: 'K1', keyword: 'test' }],
        subreddits: [{ name: 'r/test', maxPostsPerWeek: 1 }],
        company: mockCompany,
        history: emptyHistory(),
        numTopicsNeeded: 1,
      });

      expect(topics.length).toBe(1);
    });
  });
});
