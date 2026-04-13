import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Assignment from '@/lib/models/Assignment';
import ClassModel from '@/lib/models/Class';
import ClassSubjectAssignment from '@/lib/models/ClassSubjectAssignment';
import TeacherClassAssignment from '@/lib/models/TeacherClassAssignment';
import Notice from '@/lib/models/Notice';
import { extractSessionUser } from '@/lib/auth';

function toIdString(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  try {
    return String(value);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    if (!sessionUser?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mine = searchParams.get('mine') === '1';

    const query: any = {};
    if (sessionUser.role === 'teacher' || mine) {
      query.createdBy = sessionUser.id;
    } else if (sessionUser.role !== 'admin') {
      query.isPublished = true;
    }

    const assignments = await Assignment.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, assignments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    if (!sessionUser?.id || (sessionUser.role !== 'teacher' && sessionUser.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const title = String(body?.title || '').trim();
    const subject = String(body?.subject || '').trim();
    const className = String(body?.className || '').trim();
    const expectedAnswer = String(body?.expectedAnswer || '').trim();
    const assignmentType = String(body?.assignmentType || 'letter_tracing');
    const gradingMode = String(body?.gradingMode || 'auto_text');
    const studentLevel = String(body?.studentLevel || 'kindergarten');
    const repeatCount = Math.max(1, Number(body?.repeatCount || 1));
    const caseSensitive = Boolean(body?.caseSensitive);
    const worksheetTemplate = String(body?.worksheetTemplate || 'tracing_sheet');
    const academicYear = String(body?.academicYear || new Date().getFullYear());

    const allowedStudentLevels = ['nursery', 'kindergarten'];
    const allowedTemplates = [
      'tracing_sheet',
      'match_sheet',
      'circle_underline_sheet',
      'coloring_sheet',
      'picture_vocab_sheet',
      'phonics_boxes_sheet',
      'pattern_sheet',
      'life_skill_sheet',
      'alphabet_practice_sheet',
      'sentence_repeat_sheet',
      'spelling_repeat_sheet',
      'number_practice_sheet',
    ];

    if (!title || !subject || !className) {
      return NextResponse.json(
        { success: false, error: 'title, subject, and className are required' },
        { status: 400 }
      );
    }

    if (gradingMode === 'auto_text' && !expectedAnswer) {
      return NextResponse.json(
        { success: false, error: 'expectedAnswer is required for auto_text assignments' },
        { status: 400 }
      );
    }

    if (!allowedStudentLevels.includes(studentLevel)) {
      return NextResponse.json(
        { success: false, error: 'studentLevel must be nursery or kindergarten' },
        { status: 400 }
      );
    }

    if (!allowedTemplates.includes(worksheetTemplate)) {
      return NextResponse.json(
        { success: false, error: 'Invalid worksheetTemplate value' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(repeatCount) || repeatCount < 1 || repeatCount > 50) {
      return NextResponse.json(
        { success: false, error: 'repeatCount must be between 1 and 50' },
        { status: 400 }
      );
    }

    let classDoc: any = null;

    if (body?.classId) {
      classDoc = await ClassModel.findById(String(body.classId)).lean();
    }

    if (!classDoc) {
      classDoc = await ClassModel.findOne({
        $or: [{ classId: className }, { name: className }],
      }).lean();
    }

    if (!classDoc) {
      return NextResponse.json(
        { success: false, error: 'Selected class was not found. Please use a valid class.' },
        { status: 404 }
      );
    }

    if (sessionUser.role === 'teacher') {
      const classObjectId = toIdString(classDoc._id);

      const [isAssignedBySubject, isAssignedLegacy] = await Promise.all([
        ClassSubjectAssignment.exists({
          classId: classObjectId,
          teacherId: sessionUser.id,
          academicYear,
          status: 'active',
        }),
        TeacherClassAssignment.exists({
          classId: classObjectId,
          teacherId: sessionUser.id,
          academicYear,
          status: 'active',
        }),
      ]);

      const isAssignedDirect = toIdString(classDoc.teacherId) === sessionUser.id;

      if (!isAssignedBySubject && !isAssignedLegacy && !isAssignedDirect) {
        return NextResponse.json(
          {
            success: false,
            error: 'You can only create assignments for classes assigned to you.',
          },
          { status: 403 }
        );
      }
    }

    const assignment = await Assignment.create({
      title,
      subject,
      className: String(classDoc.name || className),
      classId: classDoc._id,
      dueDate: body?.dueDate ? new Date(body.dueDate) : undefined,
      prompt: String(body?.prompt || ''),
      expectedAnswer,
      assignmentType,
      gradingMode,
      language: body?.language || 'unknown',
      studentLevel,
      repeatCount,
      caseSensitive,
      worksheetTemplate,
      createdBy: sessionUser.id,
      isPublished: body?.isPublished !== false,
    });

    if (assignment.isPublished) {
      const teacherName = sessionUser.name || 'Teacher';
      const dueText = assignment.dueDate ? ` Due: ${new Date(assignment.dueDate).toLocaleDateString()}.` : '';

      await Notice.create({
        title: `New assignment: ${assignment.title}`,
        description: `${teacherName} assigned ${assignment.subject} work for ${assignment.className}.${dueText}`,
        date: new Date(),
        targetRole: 'student',
        type: 'notice',
        createdBy: sessionUser.id,
        metadata: {
          source: 'assignment',
          assignmentId: assignment._id,
          classId: classDoc._id,
          className: assignment.className,
          subject: assignment.subject,
          teacherId: sessionUser.id,
          teacherName,
        },
      });
    }

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
