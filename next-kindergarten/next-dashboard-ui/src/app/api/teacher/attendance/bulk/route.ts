import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import Student from '@/lib/models/Student';

/**
 * Bulk Mark Attendance for Multiple Students
 * POST /api/teacher/attendance/bulk
 * 
 * Body: {
 *   date: "2024-01-20",
 *   classId: "class_id_here",
 *   attendance: [
 *     { studentId: "id1", status: "Present" },
 *     { studentId: "id2", status: "Absent" },
 *     { studentId: "id3", status: "Late" }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { date, classId, attendance, teacherId } = body;

    if (!date || !attendance || !Array.isArray(attendance)) {
      return NextResponse.json(
        { error: 'Date and attendance array are required' },
        { status: 400 }
      );
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const results = {
      success: [],
      failed: [],
      updated: []
    };

    // Process each student attendance
    for (const record of attendance) {
      const { studentId, status } = record;

      if (!studentId || !status) {
        results.failed.push({
          studentId,
          error: 'Student ID and status are required'
        });
        continue;
      }

      if (!['Present', 'Absent', 'Late'].includes(status)) {
        results.failed.push({
          studentId,
          error: 'Status must be Present, Absent, or Late'
        });
        continue;
      }

      try {
        // Check if attendance already exists for this date
        const existingAttendance = await Attendance.findOne({
          studentId,
          date: {
            $gte: attendanceDate,
            $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
          }
        });

        if (existingAttendance) {
          // Update existing
          existingAttendance.status = status;
          if (teacherId) existingAttendance.markedBy = teacherId;
          await existingAttendance.save();
          
          results.updated.push({
            studentId,
            status,
            _id: existingAttendance._id
          });
        } else {
          // Create new
          const newAttendance = await Attendance.create({
            studentId,
            classId: classId || undefined,
            date: attendanceDate,
            status,
            markedBy: teacherId || undefined
          });

          results.success.push({
            studentId,
            status,
            _id: newAttendance._id
          });
        }
      } catch (error: any) {
        results.failed.push({
          studentId,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      message: `Marked ${results.success.length} new, updated ${results.updated.length}`,
      results
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get Attendance for a Class on a Specific Date
 * GET /api/teacher/attendance/bulk?classId=xxx&date=2024-01-20
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const date = searchParams.get('date');

    if (!classId || !date) {
      return NextResponse.json(
        { error: 'classId and date are required' },
        { status: 400 }
      );
    }

    // Get all students in the class
    const students = await Student.find({ classId }).select('name roll email grade');

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Get attendance records for this date
    const attendanceRecords = await Attendance.find({
      studentId: { $in: students.map(s => s._id) },
      date: {
        $gte: attendanceDate,
        $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    // Map students with their attendance status
    const result = students.map(student => {
      const attendance = attendanceRecords.find(
        a => a.studentId.toString() === student._id.toString()
      );

      return {
        studentId: student._id,
        name: student.name,
        roll: student.roll,
        grade: student.grade,
        status: attendance ? attendance.status : 'Not Marked',
        attendanceId: attendance?._id
      };
    });

    return NextResponse.json({
      date: attendanceDate,
      classId,
      totalStudents: students.length,
      markedCount: attendanceRecords.length,
      students: result
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
