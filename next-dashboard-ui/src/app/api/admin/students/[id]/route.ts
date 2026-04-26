import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Class from '@/lib/models/Class';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionUser } from '@/lib/auth';
import { getStudentHistoryBundle, logStudentHistoryEvent } from '@/lib/studentHistory';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear());

    const student = await Student.findById(params.id)
      .populate('parentId', 'name email phone');
    
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const history = await StudentClassHistory.findOne({
      studentId: student._id,
      academicYear,
    })
      .populate('classId', 'name classId grade')
      .lean();

    const historyBundle = await getStudentHistoryBundle(String(student._id));
    
    return NextResponse.json({
      ...student.toObject(),
      currentClass: history?.classId || null,
      academicYear: history?.academicYear || academicYear,
      rollNo: history?.rollNo || null,
      historyTimeline: historyBundle.classTimeline,
      resultSnapshots: historyBundle.resultSnapshots,
      attendanceByYear: historyBundle.attendanceByYear,
      activityHighlights: historyBundle.activityHighlights,
      eventTimeline: historyBundle.eventTimeline,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const data = await request.json();
    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    const changedFields = Object.keys(data || {});

    if (data.classId || data.academicYear || data.rollNo) {
      const academicYear = data.academicYear || String(new Date().getFullYear());
      const classDoc = data.classId
        ? await Class.findById(data.classId).lean() || await Class.findOne({ classId: data.classId }).lean()
        : null;

      if (data.classId && !classDoc) {
        return NextResponse.json({ error: 'Class not found for classId' }, { status: 400 });
      }

      if (data.classId) {
        await StudentClassHistory.findOneAndUpdate(
          { studentId: params.id, academicYear: String(academicYear) },
          {
            studentId: params.id,
            classId: classDoc?._id,
            academicYear: String(academicYear),
            rollNo: data.rollNo ? String(data.rollNo) : undefined,
            status: 'active',
            promotionStatus: 'manual',
            remarks: data.remarks ? String(data.remarks) : undefined,
          },
          { upsert: true, new: true }
        );
      }
    }

    const updateData = { ...data };
    delete updateData.classId;
    delete updateData.academicYear;
    delete updateData.rollNo;

    const student = await Student.findByIdAndUpdate(params.id, updateData, {
      new: true
    }).populate([
      { path: 'parentId', select: 'name email phone' }
    ]);
    
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    if (changedFields.length) {
      void logStudentHistoryEvent({
        studentId: params.id,
        eventType: 'profile_update',
        academicYear: data.academicYear ? String(data.academicYear) : undefined,
        occurredAt: new Date(),
        title: 'Student profile updated',
        summary: `Updated fields: ${changedFields.join(', ')}`,
        metadata: {
          changedFields,
          classId: data.classId || null,
          rollNo: data.rollNo || null,
        },
        createdBy: sessionUser?.id,
        createdByRole: String(sessionUser?.role || 'admin'),
      });
    }

    return NextResponse.json(student);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const student = await Student.findByIdAndDelete(params.id);
    
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Student deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
