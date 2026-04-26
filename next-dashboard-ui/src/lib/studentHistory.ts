import mongoose from 'mongoose';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import ResultSummary from '@/lib/models/ResultSummary';
import Attendance from '@/lib/models/Attendance';
import ActivityPerformance from '@/lib/models/ActivityPerformance';
import StudentHistoryEvent, { StudentHistoryEventType } from '@/lib/models/StudentHistoryEvent';

type LogStudentHistoryEventArgs = {
  studentId: string;
  eventType: StudentHistoryEventType;
  academicYear?: string;
  occurredAt?: Date;
  title: string;
  summary?: string;
  metadata?: Record<string, any>;
  sourceRef?: { model: string; id: string };
  createdBy?: string;
  createdByRole?: string;
};

export async function logStudentHistoryEvent(args: LogStudentHistoryEventArgs) {
  if (!mongoose.Types.ObjectId.isValid(args.studentId)) {
    return null;
  }

  const sourceRef =
    args.sourceRef && mongoose.Types.ObjectId.isValid(args.sourceRef.id)
      ? { model: args.sourceRef.model, id: new mongoose.Types.ObjectId(args.sourceRef.id) }
      : undefined;

  return StudentHistoryEvent.create({
    studentId: new mongoose.Types.ObjectId(args.studentId),
    eventType: args.eventType,
    academicYear: args.academicYear,
    occurredAt: args.occurredAt || new Date(),
    title: args.title,
    summary: args.summary,
    metadata: args.metadata,
    sourceRef,
    createdBy: args.createdBy && mongoose.Types.ObjectId.isValid(args.createdBy) ? new mongoose.Types.ObjectId(args.createdBy) : undefined,
    createdByRole: args.createdByRole,
  });
}

export async function getStudentHistoryBundle(studentId: string) {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return {
      classTimeline: [],
      resultSnapshots: [],
      attendanceByYear: [],
      activityHighlights: [],
      eventTimeline: [],
    };
  }

  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  const [classTimelineRaw, resultRaw, attendanceRaw, activityRaw, eventRaw] = await Promise.all([
    StudentClassHistory.find({ studentId: studentObjectId })
      .populate('classId', 'name classId grade')
      .populate('promotedFromClassId', 'name classId grade')
      .sort({ academicYear: -1, updatedAt: -1 })
      .lean(),
    ResultSummary.find({ studentId: studentObjectId })
      .populate('examCycleId', 'examName academicYear termName examType publishDate')
      .sort({ publishedAt: -1 })
      .lean(),
    Attendance.aggregate([
      { $match: { studentId: studentObjectId } },
      {
        $project: {
          status: 1,
          year: { $dateToString: { format: '%Y', date: '$date' } },
        },
      },
      {
        $group: {
          _id: '$year',
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: -1 } },
    ]),
    ActivityPerformance.find({ studentId: studentObjectId })
      .populate('activityId', 'title subject date')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
    StudentHistoryEvent.find({ studentId: studentObjectId })
      .sort({ occurredAt: -1, createdAt: -1 })
      .limit(100)
      .lean(),
  ]);

  const classTimeline = classTimelineRaw.map((row: any) => ({
    _id: row._id,
    academicYear: row.academicYear,
    rollNo: row.rollNo || '',
    status: row.status || 'active',
    promotionStatus: row.promotionStatus || 'manual',
    promotedAt: row.promotedAt || null,
    remarks: row.remarks || '',
    classInfo: row.classId || null,
    promotedFromClass: row.promotedFromClassId || null,
  }));

  const resultSnapshots = resultRaw.map((row: any) => ({
    _id: row._id,
    examCycle: row.examCycleId || null,
    totalObtained: row.totalObtained,
    totalFullMarks: row.totalFullMarks,
    percentage: row.percentage,
    gpa: row.gpa ?? null,
    overallGrade: row.overallGrade || '',
    classRank: row.classRank ?? null,
    classTotal: row.classTotal ?? null,
    promotionStatus: row.promotionStatus || null,
    publishedAt: row.publishedAt || null,
    subjectCount: Array.isArray(row.subjectResults) ? row.subjectResults.length : 0,
  }));

  const attendanceByYear = attendanceRaw.map((row: any) => {
    const presentLike = Number(row.present || 0) + Number(row.late || 0);
    const total = Number(row.total || 0);
    return {
      year: String(row._id || ''),
      total,
      present: Number(row.present || 0),
      absent: Number(row.absent || 0),
      late: Number(row.late || 0),
      attendanceRate: total ? Math.round((presentLike / total) * 100) : 0,
    };
  });

  const activityHighlights = activityRaw.map((row: any) => ({
    _id: row._id,
    performanceLevel: row.performanceLevel,
    remarks: row.remarks || '',
    activity: row.activityId || null,
    createdAt: row.createdAt || null,
  }));

  const eventTimeline = eventRaw.map((row: any) => ({
    _id: row._id,
    eventType: row.eventType,
    title: row.title,
    summary: row.summary || '',
    academicYear: row.academicYear || '',
    occurredAt: row.occurredAt || row.createdAt || null,
    metadata: row.metadata || null,
  }));

  return {
    classTimeline,
    resultSnapshots,
    attendanceByYear,
    activityHighlights,
    eventTimeline,
  };
}
