import { Company, Persona, Subreddit, Theme, PlannerInput } from '@/types';

// ============================================
// SlideForge Sample Data
// ============================================

export const sampleCompany: Company = {
  name: 'Slideforge',
  website: 'slideforge.ai',
  description: 'Slideforge is an AI-powered presentation and storytelling tool that turns outlines or rough notes into polished, professional slide decks.',
  painPoints: [
    'Creating presentations is time-consuming',
    'Design skills required for good-looking slides',
    'PowerPoint/Google Slides lack AI assistance',
    'Pitch decks need to look professional quickly',
    'Font and layout decisions slow people down',
  ],
  icp: 'Startup founders, consultants, sales teams, students, and product managers who need to create presentations quickly',
};

export const samplePersonas: Persona[] = [
  {
    id: 'riley_ops',
    username: 'riley_ops',
    info: 'I am Riley Hart, the head of operations at a SaaS startup that has grown fast. I spend a lot of my time creating internal decks, board presentations, and investor updates. I\'ve tried every tool out there and have strong opinions about what works.',
    role: 'operations-lead',
    tone: 'practical, direct, slightly frustrated with inefficient tools',
    allowedClaims: ['tried many tools', 'needs fast turnaround', 'creates many decks'],
    forbidden: ['direct product links', 'obvious marketing language'],
    maxPostsPerWeek: 2,
  },
  {
    id: 'jordan_consults',
    username: 'jordan_consults',
    info: 'I am Jordan Brooks, an independent consultant who works mostly with early-stage startups on their go-to-market strategy. I create pitch decks and strategy presentations for clients weekly. Design isn\'t my forte, so I rely heavily on tools that make me look good.',
    role: 'consultant',
    tone: 'helpful, experienced, recommends things casually',
    allowedClaims: ['works with many clients', 'creates decks weekly', 'values time savings'],
    forbidden: ['aggressive selling', 'links in first response'],
    maxPostsPerWeek: 2,
  },
  {
    id: 'emily_econ',
    username: 'emily_econ',
    info: 'I am Emily Chen, a senior majoring in economics at a big state university who also does freelance work for small businesses. I help local shops and startups with their presentations and marketing materials. I\'m always looking for tools that are easy to learn.',
    role: 'student-freelancer',
    tone: 'enthusiastic, budget-conscious, learning-focused',
    allowedClaims: ['student perspective', 'freelance experience', 'budget considerations'],
    forbidden: ['pretending to be expert', 'corporate speak'],
    maxPostsPerWeek: 2,
  },
  {
    id: 'alex_sells',
    username: 'alex_sells',
    info: 'I am Alex Ramirez, the head of sales at a mid-market SaaS company. I grew up in sales and now lead a team of 15. We create customer-facing decks constantly and I\'m always looking for ways to help my team close deals faster with better presentations.',
    role: 'sales-leader',
    tone: 'results-oriented, practical, team-focused',
    allowedClaims: ['manages sales team', 'customer-facing decks', 'ROI focused'],
    forbidden: ['technical jargon', 'obvious promotion'],
    maxPostsPerWeek: 2,
  },
  {
    id: 'priya_pm',
    username: 'priya_pm',
    info: 'I am Priya Nandakumar, a product manager at a tech company where prioritizing features and communicating roadmaps is critical. I spend hours each week on stakeholder presentations and product reviews. I care about clarity and speed.',
    role: 'product-manager',
    tone: 'analytical, clarity-focused, efficiency-driven',
    allowedClaims: ['stakeholder presentations', 'roadmap communication', 'product thinking'],
    forbidden: ['marketing speak', 'vague claims'],
    maxPostsPerWeek: 2,
  },
];

export const sampleSubreddits: Subreddit[] = [
  {
    name: 'r/PowerPoint',
    rules: ['No direct self-promotion', 'Be helpful', 'Use appropriate flair'],
    maxPostsPerWeek: 1,
    culture: 'Mix of professionals and students seeking PowerPoint help. Appreciates genuine questions and tool recommendations that solve real problems.',
  },
  {
    name: 'r/Canva',
    rules: ['No spam', 'Be respectful', 'Share helpful content'],
    maxPostsPerWeek: 1,
    culture: 'Design-focused community. Users compare tools often. Discussions about Canva alternatives are common and welcomed.',
  },
  {
    name: 'r/ClaudeAI',
    rules: ['Stay on topic', 'No promotional content', 'Constructive discussions'],
    maxPostsPerWeek: 1,
    culture: 'Tech-savvy users discussing AI tools. Comparisons between AI products are frequent. Users appreciate honest assessments.',
  },
  {
    name: 'r/startups',
    rules: ['No blatant self-promotion', 'Add value', 'Be authentic'],
    maxPostsPerWeek: 1,
    culture: 'Founders and startup employees sharing experiences. Tool recommendations must feel organic and experience-based.',
  },
  {
    name: 'r/consulting',
    rules: ['Professional discussions', 'No advertising', 'Quality content'],
    maxPostsPerWeek: 1,
    culture: 'Professional consultants discussing tools and practices. Values efficiency and practical recommendations.',
  },
  {
    name: 'r/SaaS',
    rules: ['No direct promotion', 'Share insights', 'Engage authentically'],
    maxPostsPerWeek: 1,
    culture: 'SaaS professionals and founders. Discussions about tools, workflows, and productivity are common.',
  },
];

export const sampleThemes: Theme[] = [
  { id: 'K1', keyword: 'best ai presentation maker', category: 'question' },
  { id: 'K2', keyword: 'ai slide deck tool', category: 'question' },
  { id: 'K3', keyword: 'pitch deck generator', category: 'question' },
  { id: 'K4', keyword: 'alternatives to PowerPoint', category: 'comparison' },
  { id: 'K5', keyword: 'how to make slides faster', category: 'education' },
  { id: 'K6', keyword: 'design help for slides', category: 'question' },
  { id: 'K7', keyword: 'Canva alternative for presentations', category: 'comparison' },
  { id: 'K8', keyword: 'Claude vs Slideforge', category: 'comparison' },
  { id: 'K9', keyword: 'best tool for business decks', category: 'question' },
  { id: 'K10', keyword: 'automate my presentations', category: 'question' },
  { id: 'K11', keyword: 'need help with pitch deck', category: 'story' },
  { id: 'K12', keyword: 'tools for consultants', category: 'question' },
  { id: 'K13', keyword: 'tools for startups', category: 'question' },
  { id: 'K14', keyword: 'best ai design tool', category: 'question' },
  { id: 'K15', keyword: 'Google Slides alternative', category: 'comparison' },
  { id: 'K16', keyword: 'best storytelling tool', category: 'question' },
];

// Default planner input with sample data
export const samplePlannerInput: PlannerInput = {
  company: sampleCompany,
  personas: samplePersonas,
  subreddits: sampleSubreddits,
  themes: sampleThemes,
  postsPerWeek: 3,
};

// ============================================
// Sample Output (for reference/testing)
// ============================================

export const sampleExpectedOutput = {
  posts: [
    {
      id: 'P1',
      subreddit: 'r/PowerPoint',
      title: 'Best AI Presentation Maker?',
      body: "Just like it says in the title, what is the best AI Presentation Maker? I'm looking for something that can help me create professional slides quickly...",
      author: 'riley_ops',
      timestamp: '2025-12-08 14:12',
      keywordIds: ['K1', 'K14', 'K4'],
    },
    {
      id: 'P2',
      subreddit: 'r/ClaudeAI',
      title: 'Slideforge VS Claude for slides?',
      body: "Trying to figure out what's the best one for making presentations...",
      author: 'riley_ops',
      timestamp: '2025-12-10 9:03',
      keywordIds: ['K8', 'K1', 'K14'],
    },
    {
      id: 'P3',
      subreddit: 'r/Canva',
      title: 'Slideforge vs Canva for slides?',
      body: "I love Canva but I'm trying to automate more of my slides, especially with...",
      author: 'riley_ops',
      timestamp: '2025-12-11 18:44',
      keywordIds: ['K7', 'K10', 'K14'],
    },
  ],
  comments: [
    {
      id: 'C1',
      postId: 'P1',
      parentCommentId: null,
      text: "I've tried a bunch of tools. Slideforge is the only one that doesn't make me want to tear my hair out...",
      username: 'jordan_consults',
      timestamp: '2025-12-08 14:33',
      delayMinutes: 21,
    },
    {
      id: 'C2',
      postId: 'P1',
      parentCommentId: 'C1',
      text: '+1 Slideforge',
      username: 'emily_econ',
      timestamp: '2025-12-08 14:49',
      delayMinutes: 37,
    },
    {
      id: 'C3',
      postId: 'P1',
      parentCommentId: 'C2',
      text: "Sweet I'll check it out!!",
      username: 'riley_ops',
      timestamp: '2025-12-08 15:02',
      delayMinutes: 50,
    },
  ],
};
