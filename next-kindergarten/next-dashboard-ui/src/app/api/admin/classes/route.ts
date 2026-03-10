import { connectDB } from '@/lib/mongodb';
import Class from '@/lib/models/Class';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import TeacherClassAssignment from '@/lib/models/TeacherClassAssignment';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear());

    const classes = await Class.find().populate('teacherId', 'name email').lean();
    const assignments = await TeacherClassAssignment.find({ academicYear })
      .populate('teacherId', 'name email')
      .lean();
    const histories = await StudentClassHistory.find({ academicYear })
      .populate('studentId', 'name')
      .lean();

    const assignmentsByClass = new Map(
      assignments.map((assignment) => [assignment.classId.toString(), assignment])
    );

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
      const classId = classDoc._id.toString();
      const assignment = assignmentsByClass.get(classId);
      const students = studentsByClass.get(classId) || [];

      return {
        ...classDoc,
        academicYear,
        teacher: assignment?.teacherId || classDoc.teacherId || null,
        students,
        studentCount: students.length,
      };
    });

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    // Validate required fields
    if (!data.classId || !data.name || !data.grade) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const classData = await Class.create({
      classId: data.classId,
      name: data.name,
      grade: data.grade,
      capacity: data.capacity || 0,
      teacherId: data.teacherId || undefined,
      schedule: data.schedule || undefined
    });

    if (data.teacherId) {
      const academicYear = data.academicYear || String(new Date().getFullYear());
      await TeacherClassAssignment.findOneAndUpdate(
        {
          teacherId: data.teacherId,
          classId: classData._id,
          academicYear: String(academicYear),
        },
        {
          teacherId: data.teacherId,
          classId: classData._id,
          academicYear: String(academicYear),
          role: data.role || 'class_teacher',
          status: 'active',
        },
        { upsert: true, new: true }
      );
    }

    const populatedClass = await classData.populate([
      { path: 'teacherId', select: 'name email' }
    ]);

    return NextResponse.json(populatedClass, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    if (!data.id) {
      return NextResponse.json(
        { error: 'Class id is required' },
        { status: 400 }
      );
    }

    const updatedClass = await Class.findByIdAndUpdate(
      data.id,
      {
        classId: data.classId,
        name: data.name,
        grade: data.grade,
        capacity: data.capacity,
        schedule: data.schedule,
      },
      { new: true }
    ).populate('teacherId', 'name email');

    if (!updatedClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedClass);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
