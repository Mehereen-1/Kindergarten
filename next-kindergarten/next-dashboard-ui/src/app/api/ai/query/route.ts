import { NextRequest, NextResponse } from 'next/server';
import { processAIQuery, summarizeData } from '@/lib/ai/queryProcessor';

/**
 * POST /api/ai/query
 * General AI query endpoint for teachers and parents
 * 
 * Request body:
 * {
 *   "query": "What are the details of student John?",
 *   "userId": "teacher_or_parent_id"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { query, userId } = await req.json();

    if (!query) {
      return NextResponse.json(
        { success: false, message: 'Query is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Process the natural language query
    const result = await processAIQuery(query);

    // Optionally summarize the results
    let summary: string | undefined;
    if (result.success && result.data) {
      summary = await summarizeData(result.data);
    }

    return NextResponse.json({
      success: result.success,
      data: result.data,
      message: result.message,
      summary: summary || result.message,
      query: result.query,
    });
  } catch (error) {
    console.error('Error in AI query endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
