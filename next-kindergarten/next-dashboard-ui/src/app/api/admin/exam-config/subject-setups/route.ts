import { NextRequest, NextResponse } from 'next/server';
import ExamSubjectSetup from '@/lib/models/ExamSubjectSetup';
import ExamCycle from '@/lib/models/ExamCycle';
import Subject from '@/lib/models/Subject';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

function extractUserIdFromCookie(rawUserCookie?: string): string | null {
  if (!rawUserCookie) return null;

  if (mongoose.Types.ObjectId.isValid(rawUserCookie)) return rawUserCookie;

  try {
    const decoded = decodeURIComponent(rawUserCookie);
    const parsed = JSON.parse(decoded);
    const candidateId = parsed?.id || parsed?._id;
    if (candidateId && mongoose.Types.ObjectId.isValid(candidateId)) {
      return candidateId;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * GET /api/admin/exam-config/subject-setups
 * Get all subject setups for an exam cycle
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const examCycleId = searchParams.get('examCycleId');
    const classId = searchParams.get('classId');

    const filter: any = {};
    if (examCycleId) filter.examCycleId = examCycleId;
    if (classId) filter.classId = classId;

    let setups: any[] = [];

    try {
      setups = await ExamSubjectSetup.find(filter)
        .populate('examCycleId', 'examName academicYear termName')
        .populate('classId', 'name')
        .populate('subjectId', 'name')
        .populate({ path: 'teacherId', select: 'name email', strictPopulate: false })
        .populate('createdBy', 'name');
    } catch (populateError) {
      // Fallback for older in-memory schema instances during hot reload.
      setups = await ExamSubjectSetup.find(filter)
        .populate('examCycleId', 'examName academicYear termName')
        .populate('classId', 'name')
        .populate('subjectId', 'name')
        .populate('createdBy', 'name');
    }

    return NextResponse.json({ success: true, data: setups });
  } catch (error: any) {
    console.error('GET subject setups error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/exam-config/subject-setups
 * Create a subject setup for an exam cycle
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      examCycleId,
      classId,
      subjectId,
      subjectName,
      teacherId,
      fullMarks,
      passMarks,
      components,
      gradeSchemeId,
    } = body;

    // Validate required fields
    if (!examCycleId || !classId || (!subjectId && !subjectName) || !fullMarks || !passMarks) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (subjectId or subjectName required)' },
        { status: 400 }
      );
    }

    // Verify exam cycle exists
    const examCycle = await ExamCycle.findById(examCycleId);
    if (!examCycle) {
      return NextResponse.json(
        { success: false, error: 'Exam cycle not found' },
        { status: 404 }
      );
    }

    // Validate components sum doesn't exceed full marks
    let componentsSum = 0;
    if (components) {
      componentsSum =
        (components.theory || 0) +
        (components.mcq || 0) +
        (components.practical || 0) +
        (components.viva || 0) +
        (components.classTest || 0) +
        (components.attendance || 0);
    }

    if (componentsSum > fullMarks) {
      return NextResponse.json(
        { success: false, error: 'Component marks total cannot exceed full marks' },
        { status: 400 }
      );
    }

    let resolvedSubjectId = subjectId;
    if (!resolvedSubjectId && subjectName) {
      const normalized = String(subjectName).trim();
      if (!normalized) {
        return NextResponse.json(
          { success: false, error: 'subjectName cannot be empty' },
          { status: 400 }
        );
      }

      let subject = await Subject.findOne({ name: normalized });
      if (!subject) {
        subject = await Subject.create({ name: normalized });
      }
      resolvedSubjectId = subject._id;
    }

    const userId = extractUserIdFromCookie(req.cookies.get('user')?.value);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: invalid user cookie' },
        { status: 401 }
      );
    }

    const setup = new ExamSubjectSetup({
      examCycleId,
      classId,
      subjectId: resolvedSubjectId,
      teacherId: teacherId || undefined,
      fullMarks,
      passMarks,
      components: components || { theory: fullMarks }, // Default to all theory marks
      gradeSchemeId,
      createdBy: userId,
    });

    await setup.save();

    return NextResponse.json(
      { success: true, data: setup },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST subject setup error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
