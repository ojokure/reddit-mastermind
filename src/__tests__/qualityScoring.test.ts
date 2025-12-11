import { calculateQualityScore, MIN_QUALITY_SCORE } from '@/lib/planner/qualityScorer';
import { Company, PlannedPost, Persona, Subreddit, PlannedComment } from '@/types';

const mockCompany: Company = {
  name: 'Slideforge',
  description: 'AI presentation tool',
};

const mockPersona: Persona = {
  id: 'test_user',
  username: 'test_user',
  info: 'A consultant who creates presentations weekly',
  role: 'consultant',
  maxPostsPerWeek: 2,
};

const mockSubreddit: Subreddit = {
  name: 'r/PowerPoint',
  maxPostsPerWeek: 1,
};

describe('Quality Scoring', () => {
  describe('calculateQualityScore', () => {
    it('scores open-ended questions higher', () => {
      const openEndedPost: Partial<PlannedPost> = {
        title: 'What do you all use for presentations?',
        bodyPreview: 'Looking for recommendations from the community.',
        subreddit: mockSubreddit,
        persona: mockPersona,
        postType: 'question',
        themeIds: ['K1'],
        comments: [],
      };

      const closedPost: Partial<PlannedPost> = {
        title: 'Is this tool good?',
        bodyPreview: 'Yes or no answers only please.',
        subreddit: mockSubreddit,
        persona: mockPersona,
        postType: 'question',
        themeIds: ['K1'],
        comments: [],
      };

      const openScore = calculateQualityScore(openEndedPost, mockCompany);
      const closedScore = calculateQualityScore(closedPost, mockCompany);

      expect(openScore.totalScore).toBeGreaterThan(closedScore.totalScore);
    });

    it('penalizes promotional content', () => {
      const neutralPost: Partial<PlannedPost> = {
        title: 'Best AI presentation tools?',
        bodyPreview: 'What tools do you recommend for creating slides?',
        subreddit: mockSubreddit,
        persona: mockPersona,
        postType: 'question',
        themeIds: ['K1'],
        comments: [],
      };

      const promotionalPost: Partial<PlannedPost> = {
        title: 'Try Slideforge - the best tool!',
        bodyPreview: 'Slideforge is amazing and revolutionary!',
        subreddit: mockSubreddit,
        persona: mockPersona,
        postType: 'question',
        themeIds: ['K1'],
        comments: [],
      };

      const neutralScore = calculateQualityScore(neutralPost, mockCompany);
      const promoScore = calculateQualityScore(promotionalPost, mockCompany);

      expect(neutralScore.totalScore).toBeGreaterThan(promoScore.totalScore);
    });

    it('rewards subreddit-native language', () => {
      const nativePost: Partial<PlannedPost> = {
        title: 'Best tool for slide decks and presentations?',
        bodyPreview: 'Need something for creating professional slides tbh',
        subreddit: mockSubreddit,
        persona: mockPersona,
        postType: 'question',
        themeIds: ['K1'],
        comments: [],
      };

      const formalPost: Partial<PlannedPost> = {
        title: 'Request for Presentation Software Recommendations',
        bodyPreview: 'Therefore, I am seeking suggestions. Furthermore, I require assistance.',
        subreddit: mockSubreddit,
        persona: mockPersona,
        postType: 'question',
        themeIds: ['K1'],
        comments: [],
      };

      const nativeScore = calculateQualityScore(nativePost, mockCompany);
      const formalScore = calculateQualityScore(formalPost, mockCompany);

      expect(nativeScore.totalScore).toBeGreaterThan(formalScore.totalScore);
    });

    it('minimum quality score constant is 6', () => {
      expect(MIN_QUALITY_SCORE).toBe(6);
    });

    it('returns quality factors with reasons', () => {
      const post: Partial<PlannedPost> = {
        title: 'Best presentation tools?',
        bodyPreview: 'Looking for recommendations.',
        subreddit: mockSubreddit,
        persona: mockPersona,
        postType: 'question',
        themeIds: ['K1'],
        comments: [],
      };

      const result = calculateQualityScore(post, mockCompany);

      expect(result.factors.length).toBeGreaterThan(0);
      result.factors.forEach(factor => {
        expect(factor.factor).toBeTruthy();
        expect(typeof factor.score).toBe('number');
        expect(factor.reason).toBeTruthy();
      });
    });
  });
});
