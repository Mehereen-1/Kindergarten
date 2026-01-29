import { connectDB } from '../mongodb';
import { Attendance } from '../models/Attendance';
import { Student } from '../models/Student';

interface CreateAttendanceInput {
  studentId: string;
  date: Date;
  present: boolean;
}

interface UpdateAttendanceInput {
  present?: boolean;
}

/**
 * Create attendance record
 */
export async function createAttendance(input: CreateAttendanceInput) {
  try {
    await connectDB();

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      studentId: input.studentId,
      date: {
        $gte: new Date(new Date(input.date).setHours(0, 0, 0, 0)),
        $lt: new Date(new Date(input.date).setHours(23, 59, 59, 999)),
      },
    });

    if (existingAttendance) {
      return { success: false, message: 'Attendance already recorded for this date', statusCode: 400 };
    }

    const attendance = new Attendance({
      studentId: input.studentId,
      date: input.date,
      present: input.present,
    });

    await attendance.save();

    return {
      success: true,
      message: 'Attendance recorded successfully',
      data: await attendance.populate('studentId'),
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error creating attendance:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record attendance',
      statusCode: 500,
    };
  }
}

/**
 * Get attendance by ID
 */
export async function getAttendanceById(attendanceId: string) {
  try {
    await connectDB();

    const attendance = await Attendance.findById(attendanceId).populate('studentId');
    if (!attendance) {
      return { success: false, message: 'Attendance record not found', statusCode: 404 };
    }

    return { success: true, data: attendance, statusCode: 200 };
  } catch (error) {
    console.error('Error getting attendance:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get attendance',
      statusCode: 500,
    };
  }
}

/**
 * Get attendance by student ID
 */
export async function getAttendanceByStudentId(studentId: string, limit?: number) {
  try {
    await connectDB();

    let query = Attendance.find({ studentId }).populate('studentId').sort({ date: -1 });

    if (limit) {
      query = query.limit(limit);
    }

    const records = await query;

    return {
      success: true,
      data: records,
      count: records.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting attendance:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get attendance',
      statusCode: 500,
    };
  }
}

/**
 * Get attendance by date range
 */
export async function getAttendanceByDateRange(startDate: Date, endDate: Date) {
  try {
    await connectDB();

    const records = await Attendance.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate('studentId')
      .sort({ date: -1 });

    return {
      success: true,
      data: records,
      count: records.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting attendance:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get attendance',
      statusCode: 500,
    };
  }
}

/**
 * Update attendance record
 */
export async function updateAttendance(attendanceId: string, input: UpdateAttendanceInput) {
  try {
    await connectDB();

    const attendance = await Attendance.findByIdAndUpdate(
      attendanceId,
      { ...input },
      { new: true }
    ).populate('studentId');

    if (!attendance) {
      return { success: false, message: 'Attendance record not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Attendance updated successfully',
      data: attendance,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error updating attendance:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update attendance',
      statusCode: 500,
    };
  }
}

/**
 * Delete attendance record
 */
export async function deleteAttendance(attendanceId: string) {
  try {
    await connectDB();

    const attendance = await Attendance.findByIdAndDelete(attendanceId);
    if (!attendance) {
      return { success: false, message: 'Attendance record not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Attendance deleted successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error deleting attendance:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete attendance',
      statusCode: 500,
    };
  }
}

/**
 * Get student attendance percentage
 */
export async function getAttendancePercentage(studentId: string, startDate?: Date, endDate?: Date) {
  try {
    await connectDB();

    let query: any = { studentId };

    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const total = await Attendance.countDocuments(query);
    const present = await Attendance.countDocuments({ ...query, present: true });

    const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : '0';

    return {
      success: true,
      data: {
        studentId,
        total,
        present,
        absent: total - present,
        percentage: parseFloat(percentage),
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error calculating attendance:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to calculate attendance',
      statusCode: 500,
    };
  }
}

/**
 * Bulk create attendance
 */
export async function bulkCreateAttendance(records: CreateAttendanceInput[]) {
  try {
    await connectDB();

    const created = await Attendance.insertMany(records);

    return {
      success: true,
      message: `${created.length} attendance records created`,
      data: created,
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error bulk creating attendance:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create attendance records',
      statusCode: 500,
    };
  }
}
