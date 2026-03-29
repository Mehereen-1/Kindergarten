import { NextRequest, NextResponse } from 'next/server';
import ExamSubjectSetup from '@/lib/models/ExamSubjectSetup';
import ExamCycle from '@/lib/models/ExamCycle';
import Subject from '@/lib/models/Subject';
import { connectDB } from '@/lib/mongodb';
import { resolveTeacherIdForSetup } from '@/lib/subjectAssignment';

/**
 * PATCH /api/admin/exam-config/subject-setups/[setupId]
 * Update a single subject setup
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { setupId: string } }
) {
  try {
    await connectDB();

    const existing = await ExamSubjectSetup.findById(params.setupId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Subject setup not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      classId,
      teacherId,
      subjectId,
      subjectName,
      fullMarks,
      passMarks,
      components,
    } = body;

    if (!classId || (!subjectId && !subjectName) || !fullMarks || !passMarks) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (subjectId or subjectName required)' },
        { status: 400 }
      );
    }

    const numericFull = Number(fullMarks);
    const numericPass = Number(passMarks);

    if (numericPass > numericFull) {
      return NextResponse.json(
        { success: false, error: 'Pass marks cannot exceed full marks' },
        { status: 400 }
      );
    }

    const resolvedComponents = {
      theory: Number(components?.theory || 0),
      mcq: Number(components?.mcq || 0),
      practical: Number(components?.practical || 0),
      viva: Number(components?.viva || 0),
      classTest: Number(components?.classTest || 0),
      attendance: Number(components?.attendance || 0),
    };

    const componentsSum =
      resolvedComponents.theory +
      resolvedComponents.mcq +
      resolvedComponents.practical +
      resolvedComponents.viva +
      resolvedComponents.classTest +
      resolvedComponents.attendance;

    if (componentsSum > numericFull) {
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

    const examCycle = await ExamCycle.findById(existing.examCycleId).lean();
    const resolvedTeacherId = await resolveTeacherIdForSetup({
      explicitTeacherId: teacherId,
      classId,
      subjectId: resolvedSubjectId,
      academicYear: examCycle?.academicYear,
    });

    existing.classId = classId;
    existing.teacherId = resolvedTeacherId || undefined;
    existing.subjectId = resolvedSubjectId;
    existing.fullMarks = numericFull;
    existing.passMarks = numericPass;
    existing.components = resolvedComponents;

    await existing.save();

    const updated = await ExamSubjectSetup.findById(existing._id)
      .populate('classId', 'name')
      .populate('subjectId', 'name')
      .populate({ path: 'teacherId', select: 'name email', strictPopulate: false });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('PATCH subject setup error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
