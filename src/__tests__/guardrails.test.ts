import {
  canPersonaPostOnDate,
  canPostToSubreddit,
  canUseTheme,
  validateComments,
  validatePostContent,
  GUARDRAIL_RULES,
} from '@/lib/planner/guardrails';
import { PlannerHistory, Persona, PlannedPost, PlannedComment } from '@/types';

// Helper to create empty history
const emptyHistory = (): PlannerHistory => ({
  themeUsage: [],
  personaActivity: [],
  subredditPosts: [],
  generatedWeeks: [],
  lastUpdated: new Date(),
});

// Helper to create a persona
const createPersona = (id: string): Persona => ({
  id,
  username: id,
  info: 'Test persona',
  maxPostsPerWeek: 2,
});

describe('Guardrails', () => {
  describe('canPersonaPostOnDate', () => {
    it('allows persona with no history', () => {
      const persona = createPersona('test_user');
      const history = emptyHistory();
      const result = canPersonaPostOnDate(persona, new Date(), history, []);
      
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('rejects persona who posted less than 48h ago', () => {
      const persona = createPersona('test_user');
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const history = emptyHistory();
      history.personaActivity.push({
        personaId: 'test_user',
        lastPostDate: yesterday,
        postsThisWeek: 1,
        postDates: [yesterday],
      });
      
      const result = canPersonaPostOnDate(persona, now, history, []);
      
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.rule === 'MIN_48H_GAP')).toBe(true);
    });

    it('allows persona after 48h gap', () => {
      const persona = createPersona('test_user');
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
      
      const history = emptyHistory();
      history.personaActivity.push({
        personaId: 'test_user',
        lastPostDate: threeDaysAgo,
        postsThisWeek: 1,
        postDates: [threeDaysAgo],
      });
      
      const result = canPersonaPostOnDate(persona, now, history, []);
      
      expect(result.passed).toBe(true);
    });

    it('rejects persona at max weekly posts', () => {
      const persona = createPersona('test_user');
      persona.maxPostsPerWeek = 2;
      
      const history = emptyHistory();
      history.personaActivity.push({
        personaId: 'test_user',
        postsThisWeek: 2,
        postDates: [],
      });
      
      const result = canPersonaPostOnDate(persona, new Date(), history, []);
      
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.rule === 'MAX_POSTS_PER_WEEK')).toBe(true);
    });
  });

  describe('canPostToSubreddit', () => {
    it('allows posting to subreddit with no history', () => {
      const history = emptyHistory();
      const result = canPostToSubreddit('r/test', history, []);
      
      expect(result.passed).toBe(true);
    });

    it('rejects subreddit that already has a post this week', () => {
      const history = emptyHistory();
      history.subredditPosts.push({
        subredditName: 'r/test',
        postsThisWeek: 1,
        lastPostDate: new Date(),
        postDates: [new Date()],
      });
      
      const result = canPostToSubreddit('r/test', history, []);
      
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.rule === 'MAX_POSTS_PER_SUBREDDIT')).toBe(true);
    });
  });

  describe('canUseTheme', () => {
    it('allows theme never used before', () => {
      const history = emptyHistory();
      const result = canUseTheme('K1', history);
      
      expect(result.passed).toBe(true);
    });

    it('warns about theme used less than 3 weeks ago', () => {
      const history = emptyHistory();
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      history.themeUsage.push({
        themeId: 'K1',
        lastUsedDate: twoWeeksAgo,
        usageCount: 1,
        subredditsUsedIn: ['r/test'],
      });
      
      const result = canUseTheme('K1', history);
      
      // Should pass but with warning
      expect(result.passed).toBe(true);
      expect(result.violations.some(v => v.rule === 'THEME_REUSE_TOO_SOON')).toBe(true);
      expect(result.violations[0].severity).toBe('warning');
    });
  });

  describe('validatePostContent', () => {
    it('passes non-promotional content', () => {
      const result = validatePostContent(
        'Best AI presentation maker?',
        'Looking for recommendations for my team.',
        'Slideforge'
      );
      
      expect(result.passed).toBe(true);
    });

    it('fails promotional content', () => {
      const result = validatePostContent(
        'Try Slideforge for presentations!',
        'Slideforge is the best tool ever, you should check it out!',
        'Slideforge'
      );
      
      expect(result.passed).toBe(false);
    });

    it('allows company name in comparison context', () => {
      const result = validatePostContent(
        'Slideforge vs Canva for slides?',
        'Trying to figure out which one is better for my use case.',
        'Slideforge'
      );
      
      expect(result.passed).toBe(true);
    });
  });

  describe('validateComments', () => {
    const mockPost: PlannedPost = {
      id: 'p1',
      day: new Date(),
      dayOfWeek: 'Tuesday',
      subreddit: { name: 'r/test', maxPostsPerWeek: 1 },
      persona: createPersona('op_user'),
      title: 'Test',
      bodyPreview: 'Test body',
      postType: 'question',
      themeIds: ['K1'],
      comments: [],
      qualityScore: 8,
      qualityFactors: [],
      scheduledTime: new Date(),
    };

    it('rejects OP as first commenter', () => {
      const comments: PlannedComment[] = [{
        id: 'c1',
        persona: createPersona('op_user'), // Same as OP
        delayMinutes: 30,
        seedText: 'Great question!',
        timing: new Date(),
      }];
      
      const result = validateComments(mockPost, comments);
      
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.rule === 'NO_SELF_FIRST_COMMENT')).toBe(true);
    });

    it('rejects same persona replying to themselves', () => {
      const commenter = createPersona('commenter1');
      const comments: PlannedComment[] = [
        {
          id: 'c1',
          persona: commenter,
          delayMinutes: 30,
          seedText: 'First comment',
          timing: new Date(),
        },
        {
          id: 'c2',
          persona: commenter, // Same persona
          delayMinutes: 45,
          seedText: 'Replying to myself',
          parentCommentId: 'c1',
          timing: new Date(),
        },
      ];
      
      const result = validateComments(mockPost, comments);
      
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.rule === 'NO_CHAIN_REPLIES_SAME_PERSONA')).toBe(true);
    });

    it('passes valid comment structure', () => {
      const comments: PlannedComment[] = [
        {
          id: 'c1',
          persona: createPersona('commenter1'),
          delayMinutes: 30,
          seedText: 'I recommend checking out Slideforge',
          timing: new Date(),
        },
        {
          id: 'c2',
          persona: createPersona('commenter2'),
          delayMinutes: 45,
          seedText: '+1 on that recommendation',
          parentCommentId: 'c1',
          timing: new Date(),
        },
      ];
      
      const result = validateComments(mockPost, comments);
      
      expect(result.passed).toBe(true);
    });
  });
});
