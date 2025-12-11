# Reddit Mastermind

A production-quality planning engine that generates weekly Reddit content calendars with human-like posting patterns, strict guardrails, and quality scoring.

> 📖 **New to the app?** See [USAGE.md](./USAGE.md) for a step-by-step guide.

## Features

### Generation Modes

**Titles Only Mode** (Default)
- Fast generation without API key
- Outputs post titles, topics, and comment strategies
- Uses rule-based quality scoring

**Full Content Mode** (Requires OpenAI API Key)
- AI-generated complete post titles and bodies
- Natural-sounding comment threads
- LLM-enhanced quality scoring
- Persona-aware content generation
- **Auto-improvement** with retry on low scores

### Core Algorithm
- **Capacity Calculation**: Respects posting limits per subreddit (1/week), per persona (48h gaps), and daily limits
- **Topic Selection**: Intelligent theme-subreddit matching with rotation to avoid repetition
- **Persona Assignment**: Assigns OP and 1-2 commenters with natural interaction patterns
- **Temporal Scheduling**: Posts weighted towards Tue-Thu with randomized time windows (±90 min)
- **Quality Scoring**: Hybrid rule-based + LLM scoring (rejects posts < 6/10)

### Guardrails
- ✅ Max 1 post per subreddit per week
- ✅ Max 1 post per persona per day
- ✅ Min 48h gap between same persona posts
- ✅ No product mentions in OP
- ✅ No links in first 2 comments
- ✅ No self-replies or same-persona chain replies
- ✅ Comments delayed 30-90 min after post
- ✅ Theme reuse blocked for 3 weeks

### Quality Factors
- Open-ended questions
- Non-promotional content
- Native subreddit language
- Persona-topic credibility match
- Comment naturalness
- Engagement potential
- **LLM Polish Score** (optional)

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- OpenAI API key (optional, for full content mode)

### Installation

```bash
cd Mastermind
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables (Optional)

Create a `.env.local` file:

```
NEXT_PUBLIC_OPENAI_API_KEY=sk-your-key-here
```

Or enter the API key directly in the UI.

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── __tests__/              # Test suite
│   ├── capacity.test.ts          # Capacity calculation tests
│   ├── edgeCases.test.ts         # Edge case handling tests
│   ├── guardrails.test.ts        # Guardrail validation tests
│   └── qualityScoring.test.ts    # Quality scoring tests
├── app/                    # Next.js App Router
│   ├── api/calendar/       # API routes
│   │   └── route.ts
│   ├── globals.css         # Global styles
│   ├── page.tsx            # Main UI
│   └── layout.tsx          # App layout
├── components/             # React components
│   ├── CalendarTable.tsx   # Calendar display
│   └── InputForm.tsx       # Input configuration
├── data/                   # Sample data
│   └── sampleData.ts       # SlideForge example
├── hooks/                  # React hooks
│   └── useCalendarPlanner.ts
├── lib/                    # Core logic
│   ├── llm/                # LLM integration
│   │   ├── index.ts              # Barrel exports
│   │   ├── types.ts              # LLM type definitions
│   │   ├── openai-provider.ts    # OpenAI implementation
│   │   ├── content-generator.ts  # Post/comment generation
│   │   └── quality-scorer.ts     # LLM quality evaluation
│   ├── planner/            # Planning algorithm
│   │   ├── index.ts              # Barrel exports
│   │   ├── calendarGenerator.ts  # Main orchestrator
│   │   ├── capacity.ts           # Capacity calculation
│   │   ├── guardrails.ts         # Rule enforcement
│   │   ├── personaAssigner.ts    # Persona assignment
│   │   ├── qualityScorer.ts      # Hybrid quality scoring
│   │   ├── scheduler.ts          # Temporal scheduling
│   │   └── topicSelector.ts      # Topic selection
│   └── storage/            # Persistence layer
│       ├── index.ts              # Barrel exports
│       ├── storage-interface.ts  # Abstract interface
│       └── historyStorage.ts     # localStorage impl
└── types/                  # TypeScript types
    └── index.ts
```

## Algorithm Flow

```
INPUTS                          OUTPUTS
────────                        ────────
• Company info                  • Weekly Calendar
• Personas[]           →        • Posts with:
• Subreddits[]                    - Day & time
• Themes[]                        - Subreddit
• Posts per week                  - Persona (OP)
• Generation Mode                 - Title & body
                                  - Comments (with content)
                                  - Quality score
```

### Step-by-Step Process

1. **Normalize Inputs** → Structure all data
2. **Calculate Capacity** → Apply guardrails, determine available slots
3. **Select Topics** → Match themes to subreddits, rotate for variety
4. **Assign Personas** → Pick OP + 1-2 commenters
5. **Generate Content** → Use LLM (full mode) or templates (titles mode)
6. **Schedule Temporally** → Set optimal posting times
7. **Score Quality** → Hybrid rule-based + LLM evaluation
8. **Output Calendar** → Final structured calendar week

## LLM Integration

### Content Generation
When in full-content mode, the system uses OpenAI to generate:
- **Post titles**: Natural, subreddit-appropriate titles
- **Post bodies**: Authentic-sounding questions/discussions
- **Comments**: Realistic reply threads with multiple personas

### Quality Scoring
The hybrid quality scoring combines:
- **Rule-based checks** (70% default weight)
  - Open-ended questions
  - Non-promotional content
  - Subreddit-native language
  - Persona credibility
  - Comment timing/structure
- **LLM evaluation** (30% default weight)
  - Naturalness score
  - Authenticity score
  - Engagement potential
  - Written feedback & suggestions

## Storage Abstraction

The storage layer is designed for easy backend swapping:

```typescript
interface IStorageProvider {
  getHistory(): Promise<PlannerHistory>;
  saveHistory(history: PlannerHistory): Promise<void>;
  getCalendars(): Promise<CalendarWeek[]>;
}
```

### Current Implementation
- **LocalStorage** (default): Browser-based persistence

### Future Implementation
- **Supabase**: See `SUPABASE_SCHEMA` in `storage-interface.ts` for table structure

## Configuration

### Guardrail Settings
In `src/lib/planner/guardrails.ts`:

```typescript
export const GUARDRAIL_RULES = {
  MAX_POSTS_PER_SUBREDDIT_PER_WEEK: 1,
  MAX_POSTS_PER_PERSONA_PER_DAY: 1,
  MIN_HOURS_BETWEEN_SAME_PERSONA_POSTS: 48,
  MIN_COMMENT_DELAY_MINUTES: 10,
  MAX_FIRST_COMMENT_DELAY_MINUTES: 90,
  MIN_QUALITY_SCORE: 6,
  MIN_WEEKS_BEFORE_THEME_REUSE: 3,
};
```

### Generation Options
In `src/lib/planner/calendarGenerator.ts`:

```typescript
interface GenerationOptions {
  mode: 'titles-only' | 'full-content';
  useLLMScoring: boolean;
  llmWeight?: number; 
  openAIApiKey?: string;
  autoImprove?: boolean;  // Auto-regenerate low-scoring posts
  maxRetries?: number;    // Max retry attempts (default: 2)
}
```

## Sample Data

The app includes SlideForge sample data:
- **Company**: AI presentation tool
- **5 Personas**: riley_ops, jordan_consults, emily_econ, alex_sells, priya_pm
- **6 Subreddits**: r/PowerPoint, r/Canva, r/ClaudeAI, r/startups, r/consulting, r/SaaS
- **16 Themes**: Various presentation/AI-related keywords

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **LLM**: OpenAI GPT-4o-mini
- **Storage**: localStorage (Supabase-ready)
- **Deployment**: Vercel-ready

## License

MIT
