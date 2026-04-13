import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import Student from '@/lib/models/Student';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import AttendanceAuditLog from '@/lib/models/AttendanceAuditLog';
import mongoose from 'mongoose';

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
    const { date, classId, attendance, teacherId, source } = body;

    if (!date || !classId || !attendance || !Array.isArray(attendance)) {
      return NextResponse.json(
        { error: 'Date, classId and attendance array are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(String(classId))) {
      return NextResponse.json(
        { error: 'Invalid classId' },
        { status: 400 }
      );
    }

    // Use explicit UTC midnight to avoid timezone drift across save/export flows.
    const attendanceDate = new Date(`${date}T00:00:00.000Z`);
    const normalizedSource: 'manual' | 'cctv' = source === 'cctv' ? 'cctv' : 'manual';
    const canWriteAudit =
      !!teacherId &&
      mongoose.Types.ObjectId.isValid(String(teacherId));
    const auditEntries: any[] = [];

    const results: {
      success: Array<{ studentId: any; status: any; _id: any }>;
      failed: Array<{ studentId: any; error: string }>;
      updated: Array<{ studentId: any; status: any; _id: any }>;
    } = {
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

      const normalizedStatus = String(status || '').toLowerCase();
      if (!['present', 'absent', 'late'].includes(normalizedStatus)) {
        results.failed.push({
          studentId,
          error: 'Status must be present, absent, or late'
        });
        continue;
      }

      try {
        // Check if attendance already exists for this date
        const existingAttendance = await Attendance.findOne({
          studentId,
          classId,
          date: {
            $gte: attendanceDate,
            $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
          }
        });

        if (existingAttendance) {
          // Update existing
          const previousStatus = existingAttendance.status;
          existingAttendance.status = normalizedStatus as 'present' | 'absent' | 'late';
          if (teacherId) existingAttendance.markedBy = teacherId;
          await existingAttendance.save();

          if (canWriteAudit && mongoose.Types.ObjectId.isValid(String(studentId))) {
            auditEntries.push({
              teacherId,
              classId,
              studentId,
              date: attendanceDate,
              source: normalizedSource,
              action: 'update',
              previousStatus,
              newStatus: normalizedStatus,
            });
          }
          
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
            status: normalizedStatus,
            markedBy: teacherId || undefined
          });

          if (canWriteAudit && mongoose.Types.ObjectId.isValid(String(studentId))) {
            auditEntries.push({
              teacherId,
              classId,
              studentId,
              date: attendanceDate,
              source: normalizedSource,
              action: 'create',
              previousStatus: null,
              newStatus: normalizedStatus,
            });
          }

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

    if (auditEntries.length > 0) {
      try {
        await AttendanceAuditLog.insertMany(auditEntries, { ordered: false });
      } catch {
        // Do not fail attendance save if audit logging partially fails.
      }
    }

    return NextResponse.json({
      message: `Marked ${results.success.length} new, updated ${results.updated.length}`,
      auditLogged: auditEntries.length,
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

    if (!mongoose.Types.ObjectId.isValid(String(classId))) {
      return NextResponse.json(
        { error: 'Invalid classId' },
        { status: 400 }
      );
    }

    const classObjectId = new mongoose.Types.ObjectId(String(classId));

    // Get class roster via StudentClassHistory (source of truth in this project).
    const histories = await StudentClassHistory.find({
      classId: classObjectId,
      status: 'active',
    })
      .populate('studentId', 'name email')
      .lean();

    const students = histories
      .map((history: any) => {
        const student = history.studentId;
        if (!student?._id) return null;
        return {
          _id: student._id,
          name: student.name,
          email: student.email,
          roll: history.rollNo || '-',
        };
      })
      .filter(Boolean) as Array<{ _id: any; name: string; email?: string; roll?: string }>;

    // Keep reporting window in UTC to match stored attendance date semantics.
    const attendanceDate = new Date(`${date}T00:00:00.000Z`);

    // Get attendance records for this date
    const attendanceRecords = await Attendance.find({
      classId: classObjectId,
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
        grade: '-',
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
