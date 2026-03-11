import { NextRequest, NextResponse } from 'next/server';
import Topic from '@/lib/models/Topic';
import Quiz from '@/lib/models/Quiz';
import StudentQuizAttempt from '@/lib/models/StudentQuizAttempt';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/student/content
 * Get all learning content available to a student based on their class
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const grade = searchParams.get('grade');
    const category = searchParams.get('category');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Build query
    let query: any = {};
    
    if (classId) {
      query.classId = classId;
    }
    
    if (grade) {
      query.grade = grade;
    }
    
    if (category) {
      query.category = category;
    }

    // Fetch topics for the student's class/grade
    const topics = await Topic.find(query)
      .populate('teacherId', 'name email')
      .populate('classId', 'name grade')
      .sort({ created_at: -1 })
      .lean();

    // For each topic, get quiz and student's attempt status
    const enrichedTopics = await Promise.all(
      topics.map(async (topic) => {
        // Get quiz for this topic
        const quiz = await Quiz.findOne({ topicId: topic._id }).lean();
        
        // Get student's attempts for this topic
        const attempts = await StudentQuizAttempt.find({
          studentId,
          topicId: topic._id,
        })
          .sort({ attempted_at: -1 })
          .lean();

        // Calculate progress
        const totalAttempts = attempts.length;
        const bestScore = attempts.length > 0 
          ? Math.max(...attempts.map((a: any) => a.score || 0)) 
          : 0;
        const latestAttempt = attempts.length > 0 ? attempts[0] : null;
        const completed = bestScore >= 70; // 70% passing grade

        return {
          ...topic,
          quiz: quiz ? {
            _id: quiz._id,
            title: quiz.title,
            description: quiz.description,
            total_questions: quiz.total_questions,
          } : null,
          studentProgress: {
            totalAttempts,
            bestScore,
            latestAttempt: latestAttempt ? {
              score: latestAttempt.score,
              attempted_at: latestAttempt.attempted_at,
            } : null,
            completed,
            status: completed 
              ? 'completed' 
              : totalAttempts > 0 
                ? 'in-progress' 
                : 'not-started',
          },
        };
      })
    );

    // Group by category
    const categorized = enrichedTopics.reduce((acc: any, topic: any) => {
      const cat = topic.category || 'Other';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(topic);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      topics: enrichedTopics,
      categorized,
      totalTopics: enrichedTopics.length,
      completed: enrichedTopics.filter((t: any) => t.studentProgress.completed).length,
      inProgress: enrichedTopics.filter((t: any) => t.studentProgress.status === 'in-progress').length,
      notStarted: enrichedTopics.filter((t: any) => t.studentProgress.status === 'not-started').length,
    });

  } catch (error: any) {
    console.error('Error fetching student content:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching content' },
      { status: 500 }
    );
  }
}
