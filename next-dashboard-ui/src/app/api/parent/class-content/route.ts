import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import Topic from '@/lib/models/Topic';
import Quiz from '@/lib/models/Quiz';
import ClassModel from '@/lib/models/Class';
import TeacherClassAssignment from '@/lib/models/TeacherClassAssignment';
import ContentChunk from '@/lib/models/ContentChunk';

function isMongoConnectivityError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();

  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    message.includes('querysrv') ||
    message.includes('server selection timed out') ||
    message.includes('mongodb connection')
  );
}

/**
 * GET /api/parent/class-content?classId=...&academicYear=...
 * Temporary open mode: returns all class-organized teacher-uploaded content.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const classIdFilter = searchParams.get('classId');
    const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear());

    const topicQuery: any = {};
    if (classIdFilter) {
      topicQuery.classId = classIdFilter;
    }

    const topics = await Topic.find(topicQuery)
      .populate('teacherId', 'name email')
      .sort({ created_at: -1 })
      .lean();

    if (!topics.length) {
      return NextResponse.json({ classes: [], count: 0 }, { status: 200 });
    }

    const classIds = Array.from(
      new Set(
        topics
          .map((topic: any) => topic.classId?.toString())
          .filter((id: string | undefined) => Boolean(id))
      )
    );

    const classDocs = await ClassModel.find({ _id: { $in: classIds } })
      .select('name classId grade')
      .lean();

    const classById = new Map<string, any>();
    for (const classDoc of classDocs as any[]) {
      classById.set(classDoc._id.toString(), classDoc);
    }

    const classBuckets = new Map<string, any>();

    for (const classKey of classIds) {
      const classObj = classById.get(classKey);

      if (!classBuckets.has(classKey)) {
        classBuckets.set(classKey, {
          classId: classKey,
          classCode: classObj?.classId || '',
          className: classObj?.name || 'Unnamed Class',
          grade: classObj?.grade || '',
          academicYear,
          children: [],
          teachers: [],
          contents: [],
        });
      }
    }

    const activeHistories = await StudentClassHistory.find({
      classId: { $in: classIds },
      academicYear,
      status: 'active',
    })
      .select('studentId classId rollNo')
      .lean();

    const childIds = Array.from(
      new Set(activeHistories.map((history: any) => history.studentId?.toString()).filter(Boolean))
    );

    const students = childIds.length
      ? await Student.find({ _id: { $in: childIds } }).select('name').lean()
      : [];

    const studentById = new Map<string, any>();
    for (const student of students as any[]) {
      studentById.set(student._id.toString(), student);
    }

    for (const history of activeHistories as any[]) {
      const classKey = history.classId?.toString();
      const studentKey = history.studentId?.toString();
      if (!classKey || !studentKey || !classBuckets.has(classKey)) continue;

      const student = studentById.get(studentKey);
      if (!student) continue;

      classBuckets.get(classKey).children.push({
        childId: studentKey,
        childName: student.name,
        rollNo: history.rollNo || null,
      });
    }

    if (!classIds.length) {
      return NextResponse.json({ classes: [], count: 0 }, { status: 200 });
    }

    const assignments = await TeacherClassAssignment.find({
      classId: { $in: classIds },
      academicYear,
      status: 'active',
    })
      .populate('teacherId', 'name email')
      .lean();

    for (const assignment of assignments as any[]) {
      const classKey = assignment.classId?.toString();
      if (!classKey || !classBuckets.has(classKey)) continue;
      const teacher = assignment.teacherId;
      if (!teacher?._id) continue;

      classBuckets.get(classKey).teachers.push({
        teacherId: teacher._id.toString(),
        name: teacher.name || 'Teacher',
        email: teacher.email || '',
        role: assignment.role || 'Subject Teacher',
      });
    }

    const topicIds = topics.map((t: any) => t._id);
    const quizzes = topicIds.length
      ? await Quiz.find({ topicId: { $in: topicIds }, is_published: true }).select('_id topicId total_questions is_published').lean()
      : [];

    const quizByTopicId = new Map<string, any>();
    for (const quiz of quizzes as any[]) {
      const key = quiz.topicId?.toString();
      if (key && !quizByTopicId.has(key)) {
        quizByTopicId.set(key, quiz);
      }
    }

    const chunkCounts = topicIds.length
      ? await ContentChunk.aggregate([
          { $match: { topicId: { $in: topicIds } } },
          { $group: { _id: '$topicId', count: { $sum: 1 } } },
        ])
      : [];

    const chunkCountByTopicId = new Map<string, number>();
    for (const row of chunkCounts as any[]) {
      if (row?._id) {
        chunkCountByTopicId.set(row._id.toString(), Number(row.count || 0));
      }
    }

    for (const topic of topics as any[]) {
      const classKey = topic.classId?.toString();
      if (!classKey || !classBuckets.has(classKey)) continue;

      const topicId = topic._id.toString();
      const quiz = quizByTopicId.get(topicId);
      const chunkCount = chunkCountByTopicId.get(topicId) || 0;

      classBuckets.get(classKey).contents.push({
        topicId,
        topicName: topic.topic_name,
        category: topic.category || 'General',
        difficulty: topic.difficulty_weight || 3,
        uploadedAt: topic.created_at || topic.createdAt || null,
        teacher: topic.teacherId
          ? {
              teacherId: topic.teacherId._id?.toString?.() || topic.teacherId.toString(),
              name: topic.teacherId.name || 'Teacher',
              email: topic.teacherId.email || '',
            }
          : null,
        file: topic.file_url
          ? {
              url: topic.file_url,
              name: topic.file_name || 'Attachment',
              type: topic.file_type || '',
              size: topic.file_size || 0,
            }
          : null,
        ai: {
          summary: topic.ai_summary || '',
          keyPoints: topic.ai_key_points || [],
          concepts: topic.concepts || [],
          formulas: topic.ai_formulas || [],
        },
        rag: {
          chunkCount,
          ready: chunkCount > 0,
        },
        quiz: quiz
          ? {
              quizId: quiz._id.toString(),
              totalQuestions: quiz.total_questions || 0,
            }
          : null,
      });
    }

    const classes = Array.from(classBuckets.values()).map((cls) => ({
      ...cls,
      children: cls.children.filter(
        (c: any, index: number, arr: any[]) =>
          arr.findIndex((x: any) => x.childId === c.childId) === index
      ),
      teachers: cls.teachers.filter(
        (t: any, index: number, arr: any[]) =>
          arr.findIndex((x: any) => x.teacherId === t.teacherId) === index
      ),
      contentCount: cls.contents.length,
    }));

    return NextResponse.json({
      classes,
      count: classes.length,
    });
  } catch (error: any) {
    console.error('Error fetching parent class content:', error);
    if (isMongoConnectivityError(error)) {
      return NextResponse.json(
        {
          classes: [],
          count: 0,
          warning: 'Class content is temporarily unavailable because the database cannot be reached. Please try again shortly.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: error.message || 'Failed to fetch class content' }, { status: 500 });
  }
}
