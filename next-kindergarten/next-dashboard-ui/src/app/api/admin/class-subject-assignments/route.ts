import { connectDB } from '@/lib/mongodb';
import ClassSubjectAssignment from '@/lib/models/ClassSubjectAssignment';
import Class from '@/lib/models/Class';
import Subject from '@/lib/models/Subject';
import User from '@/lib/models/User';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear());

    const query: any = { academicYear };
    if (teacherId) query.teacherId = teacherId;
    if (classId) query.classId = classId;

    const assignments = await ClassSubjectAssignment.find(query)
      .populate('teacherId', 'name email')
      .populate('classId', 'name grade classId')
      .populate('subjectId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, assignments, count: assignments.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const teacherId = body?.teacherId;
    const classId = body?.classId;
    const subjectId = body?.subjectId;
    const subjectName = body?.subjectName;
    const teacherRole = body?.teacherRole;
    const academicYear = String(body?.academicYear || new Date().getFullYear());
    const allowedTeacherRoles = ['class_teacher', 'assistant_teacher', 'course_teacher'];

    if (!teacherId || !classId || (!subjectId && !subjectName)) {
      return NextResponse.json(
        { success: false, error: 'teacherId, classId, and subjectId or subjectName are required' },
        { status: 400 }
      );
    }

    if (!teacherRole || !allowedTeacherRoles.includes(teacherRole)) {
      return NextResponse.json(
        { success: false, error: 'Valid teacherRole is required' },
        { status: 400 }
      );
    }

    let resolvedSubjectId = subjectId;
    if (!resolvedSubjectId && subjectName) {
      const normalizedSubjectName = String(subjectName).trim();
      if (!normalizedSubjectName) {
        return NextResponse.json({ success: false, error: 'subjectName cannot be empty' }, { status: 400 });
      }

      let subject = await Subject.findOne({ name: normalizedSubjectName }).lean();
      if (!subject) {
        subject = await Subject.create({ name: normalizedSubjectName });
      }
      resolvedSubjectId = String(subject._id);
    }

    const [teacher, classDoc, subject] = await Promise.all([
      User.findById(teacherId).lean(),
      Class.findById(classId).lean(),
      Subject.findById(resolvedSubjectId).lean(),
    ]);

    if (!teacher || teacher.role !== 'teacher') {
      return NextResponse.json({ success: false, error: 'Teacher not found' }, { status: 404 });
    }
    if (!classDoc) {
      return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });
    }
    if (!subject) {
      return NextResponse.json({ success: false, error: 'Subject not found' }, { status: 404 });
    }

    const assignment = await ClassSubjectAssignment.findOneAndUpdate(
      { classId, subjectId: resolvedSubjectId, academicYear },
      { classId, subjectId: resolvedSubjectId, teacherId, teacherRole, academicYear, status: 'active' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate('teacherId', 'name email')
      .populate('classId', 'name grade classId')
      .populate('subjectId', 'name code');

    return NextResponse.json({ success: true, data: assignment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const assignmentId = body?.assignmentId;
    const teacherId = body?.teacherId;
    const classId = body?.classId;
    const subjectId = body?.subjectId;
    const subjectName = body?.subjectName;
    const teacherRole = body?.teacherRole;
    const academicYear = String(body?.academicYear || new Date().getFullYear());
    const allowedTeacherRoles = ['class_teacher', 'assistant_teacher', 'course_teacher'];

    if (!assignmentId || !teacherId || !classId || (!subjectId && !subjectName)) {
      return NextResponse.json(
        { success: false, error: 'assignmentId, teacherId, classId, and subjectId or subjectName are required' },
        { status: 400 }
      );
    }

    if (!teacherRole || !allowedTeacherRoles.includes(teacherRole)) {
      return NextResponse.json(
        { success: false, error: 'Valid teacherRole is required' },
        { status: 400 }
      );
    }

    let resolvedSubjectId = subjectId;
    if (!resolvedSubjectId && subjectName) {
      const normalizedSubjectName = String(subjectName).trim();
      if (!normalizedSubjectName) {
        return NextResponse.json({ success: false, error: 'subjectName cannot be empty' }, { status: 400 });
      }

      let subject = await Subject.findOne({ name: normalizedSubjectName }).lean();
      if (!subject) {
        subject = await Subject.create({ name: normalizedSubjectName });
      }
      resolvedSubjectId = String(subject._id);
    }

    const [existingAssignment, teacher, classDoc, subject] = await Promise.all([
      ClassSubjectAssignment.findById(assignmentId).lean(),
      User.findById(teacherId).lean(),
      Class.findById(classId).lean(),
      Subject.findById(resolvedSubjectId).lean(),
    ]);

    if (!existingAssignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }
    if (!teacher || teacher.role !== 'teacher') {
      return NextResponse.json({ success: false, error: 'Teacher not found' }, { status: 404 });
    }
    if (!classDoc) {
      return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });
    }
    if (!subject) {
      return NextResponse.json({ success: false, error: 'Subject not found' }, { status: 404 });
    }

    const duplicateAssignment = await ClassSubjectAssignment.findOne({
      _id: { $ne: assignmentId },
      classId,
      subjectId: resolvedSubjectId,
      academicYear,
    }).lean();

    if (duplicateAssignment) {
      return NextResponse.json(
        { success: false, error: 'This subject is already assigned to that class for the selected year' },
        { status: 409 }
      );
    }

    const assignment = await ClassSubjectAssignment.findByIdAndUpdate(
      assignmentId,
      { classId, subjectId: resolvedSubjectId, teacherId, teacherRole, academicYear, status: 'active' },
      { new: true, runValidators: true }
    )
      .populate('teacherId', 'name email')
      .populate('classId', 'name grade classId')
      .populate('subjectId', 'name code');

    return NextResponse.json({ success: true, data: assignment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json({ success: false, error: 'assignmentId is required' }, { status: 400 });
    }

    const assignment = await ClassSubjectAssignment.findByIdAndDelete(assignmentId);
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Assignment removed successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
