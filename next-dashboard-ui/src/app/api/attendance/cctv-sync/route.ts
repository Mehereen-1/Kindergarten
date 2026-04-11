import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import Student from '@/lib/models/Student';

interface AttendanceRecord {
  studentId: string;
  timestamp: string;
  status: 'present' | 'absent' | 'late';
  source: 'cctv' | 'manual';
  remarks?: string;
}

/**
 * POST /api/attendance/cctv-sync
 * Sync CCTV-detected attendance to database
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { records, classId, date }: {
      records: AttendanceRecord[];
      classId?: string;
      date: string;
    } = await req.json();

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Invalid records format' },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    const attendanceRecords: any[] = [];
    const failedRecords: Array<{ studentId: string; error: string }> = [];

    const dayStart = new Date(date + 'T00:00:00Z');
    const dayEnd = new Date(date + 'T23:59:59Z');

    for (const record of records) {
      try {
        // Verify student exists
        const student = await Student.findById(record.studentId);
        if (!student) {
          failedRecords.push({
            studentId: record.studentId,
            error: 'Student not found',
          });
          continue;
        }

        // Resolve required classId: request classId -> student's classId
        const resolvedClassId = classId || (student.classId ? String(student.classId) : undefined);
        if (!resolvedClassId) {
          failedRecords.push({
            studentId: record.studentId,
            error: 'Missing classId (not provided and student has no class assigned)',
          });
          continue;
        }

        // Check if attendance already exists for this date
        const existingAttendance = await Attendance.findOne({
          studentId: record.studentId,
          classId: resolvedClassId,
          date: {
            $gte: dayStart,
            $lt: dayEnd,
          },
        });

        if (existingAttendance) {
          // Update existing record
          existingAttendance.status = record.status;
          existingAttendance.remarks = record.remarks;
          await existingAttendance.save();
          attendanceRecords.push(existingAttendance);
        } else {
          // Create new record
          const attendance = new Attendance({
            studentId: record.studentId,
            classId: resolvedClassId,
            date: new Date(date),
            status: record.status,
            remarks: record.remarks || `${record.source} detection`,
          });
          await attendance.save();
          attendanceRecords.push(attendance);
        }
      } catch (err) {
        console.error('Error processing attendance record:', err);
        failedRecords.push({
          studentId: record.studentId,
          error: String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${attendanceRecords.length} attendance records`,
      total: records.length,
      synced: attendanceRecords.length,
      failed: failedRecords.length,
      failedRecords,
    });
  } catch (error) {
    console.error('Error syncing CCTV attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/attendance/cctv-sync?date=YYYY-MM-DD
 * Get attendance records for a specific date
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get('date');
    const classId = searchParams.get('classId');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter required' },
        { status: 400 }
      );
    }

    const query: any = {
      date: {
        $gte: new Date(date + 'T00:00:00Z'),
        $lt: new Date(date + 'T23:59:59Z'),
      },
    };

    if (classId) {
      query.classId = classId;
    }

    const records = await Attendance.find(query)
      .populate('studentId')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      date,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
