import { connectDB } from '@/lib/mongodb';
import Class from '@/lib/models/Class';
import '@/lib/models/Student';
import '@/lib/models/Subject';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import TeacherClassAssignment from '@/lib/models/TeacherClassAssignment';
import ClassSubjectAssignment from '@/lib/models/ClassSubjectAssignment';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

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
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear());

  try {
    await connectDB();
    
    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacherId required' },
        { status: 400 }
      );
    }

    console.log('=== Teacher Classes API ===');
    console.log('Teacher ID:', teacherId);
    console.log('Academic Year:', academicYear);

    // Try both direct match and as ObjectId
    let teacherQuery: any = { academicYear };
    
    // Try to find with both string and ObjectId matching
    if (mongoose.Types.ObjectId.isValid(teacherId)) {
      teacherQuery = {
        $or: [
          { teacherId: teacherId },
          { teacherId: new mongoose.Types.ObjectId(teacherId) }
        ],
        academicYear
      };
    } else {
      teacherQuery = { teacherId, academicYear };
    }

    // Primary source: class-subject-teacher assignments (single source of truth)
    const subjectAssignments = await ClassSubjectAssignment.find({
      ...teacherQuery,
      status: 'active',
    })
      .populate('subjectId', 'name')
      .lean();

    let assignmentClassIds = subjectAssignments
      .map((assignment) => toIdString(assignment.classId))
      .filter((id): id is string => Boolean(id));

    // Backward-compatible fallback for older data
    if (!assignmentClassIds.length) {
      const assignments = await TeacherClassAssignment.find({
        ...teacherQuery,
        status: 'active',
      }).lean();

      assignmentClassIds = assignments
        .map((assignment) => toIdString(assignment.classId))
        .filter((id): id is string => Boolean(id));
    }

    const classes = assignmentClassIds.length
      ? await Class.find({ _id: { $in: assignmentClassIds } }).lean()
      : await Class.find({ teacherId }).lean();

    console.log('Classes found:', classes.length);
    console.log('Classes:', JSON.stringify(classes.map(c => ({ _id: c._id, name: c.name })), null, 2));

    const classIds = classes
      .map((classDoc) => toIdString(classDoc._id))
      .filter((id): id is string => Boolean(id));

    if (!classIds.length) {
      return NextResponse.json([]);
    }

    const histories = await StudentClassHistory.find({
      classId: { $in: classIds },
      academicYear,
      status: 'active',
    })
      .populate('studentId', 'name')
      .lean();

    const studentsByClass = new Map<string, Array<{ id: string; name: string; rollNo?: string }>>();

    histories.forEach((history) => {
      const classKey = toIdString(history.classId);
      if (!classKey) {
        return;
      }

      const student = history.studentId as { _id?: string; name?: string } | string | null;
      const studentId = toIdString(student as any);
      const studentName = typeof student === 'object' && student?.name ? student.name : 'Student';

      if (!studentId) return;

      const entry = {
        id: studentId,
        name: studentName,
        rollNo: history.rollNo,
      };

      if (!studentsByClass.has(classKey)) {
        studentsByClass.set(classKey, [entry]);
        return;
      }

      studentsByClass.get(classKey)?.push(entry);
    });

    const response = classes.map((classDoc) => {
      const classKey = classDoc._id.toString();
      const students = studentsByClass.get(classKey) || [];
      const subjects = subjectAssignments
        .filter((assignment) => toIdString(assignment.classId) === classKey)
        .map((assignment: any) => assignment.subjectId?.name)
        .filter(Boolean);

      return {
        ...classDoc,
        academicYear,
        students,
        subjects: Array.from(new Set(subjects)),
        studentCount: students.length,
      };
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Teacher classes API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
