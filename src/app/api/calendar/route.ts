import { NextRequest, NextResponse } from 'next/server';
import { PlannerInput, GenerateCalendarResponse } from '@/types';

/**
 * POST /api/calendar
 * 
 * Validates planner input. Actual calendar generation happens client-side
 * because we use localStorage for history tracking.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body as { input: PlannerInput };
    
    // Validate input
    const errors: string[] = [];
    
    if (!input.company?.name) {
      errors.push('Company name is required');
    }
    
    if (!input.personas || input.personas.length < 2) {
      errors.push('At least 2 personas are required');
    }
    
    if (!input.subreddits || input.subreddits.length === 0) {
      errors.push('At least 1 subreddit is required');
    }
    
    if (!input.themes || input.themes.length === 0) {
      errors.push('At least 1 theme/keyword is required');
    }
    
    if (!input.postsPerWeek || input.postsPerWeek < 1) {
      errors.push('Posts per week must be at least 1');
    }
    
    if (input.postsPerWeek > 7) {
      errors.push('Posts per week cannot exceed 7 (one per day max)');
    }
    
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation failed: ${errors.join(', ')}`,
        } as GenerateCalendarResponse,
        { status: 400 }
      );
    }
    
    // Return success - actual generation happens client-side
    return NextResponse.json({
      success: true,
      message: 'Input validated. Generate calendar client-side.',
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      } as GenerateCalendarResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar
 * 
 * Returns API info
 */
export async function GET() {
  return NextResponse.json({
    name: 'Reddit Content Calendar API',
    version: '1.0.0',
    endpoints: {
      'POST /api/calendar': 'Validate planner input',
    },
  });
}
