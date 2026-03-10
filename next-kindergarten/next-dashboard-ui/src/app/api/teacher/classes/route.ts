import { connectDB } from '@/lib/mongodb';
import Class from '@/lib/models/Class';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import TeacherClassAssignment from '@/lib/models/TeacherClassAssignment';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

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

    const assignments = await TeacherClassAssignment.find(teacherQuery).lean();
    console.log('Assignments found:', assignments.length);
    console.log('Assignments:', JSON.stringify(assignments, null, 2));
    
    const assignmentClassIds = assignments.map((assignment) => assignment.classId.toString());

    const classes = assignmentClassIds.length
      ? await Class.find({ _id: { $in: assignmentClassIds } }).lean()
      : await Class.find({ teacherId }).lean();

    console.log('Classes found:', classes.length);
    console.log('Classes:', JSON.stringify(classes.map(c => ({ _id: c._id, name: c.name })), null, 2));

    const classIds = classes.map((classDoc) => classDoc._id);
    const histories = await StudentClassHistory.find({
      classId: { $in: classIds },
      academicYear,
    })
      .populate('studentId', 'name')
      .lean();

    const studentsByClass = new Map<string, Array<{ id: string; name: string; rollNo?: string }>>();

    histories.forEach((history) => {
      const classKey = history.classId.toString();
      const student = history.studentId as { _id: string; name: string } | null;
      if (!student) {
        return;
      }

      const entry = {
        id: student._id.toString(),
        name: student.name,
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

      return {
        ...classDoc,
        academicYear,
        students,
        studentCount: students.length,
      };
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
