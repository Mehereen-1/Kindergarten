import { connectDB } from '@/lib/mongodb';
import ExamSubjectSetup from '@/lib/models/ExamSubjectSetup';
import MarksheetBatch from '@/lib/models/MarksheetBatch';
import MarkEntry from '@/lib/models/MarkEntry';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import '@/lib/models/Student';
import '@/lib/models/ExamCycle';
import '@/lib/models/Class';
import '@/lib/models/Subject';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

function extractUserIdFromCookie(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue));
    return parsed.id || null;
  } catch {
    return cookieValue || null;
  }
}

// ExamCycle stores "2025-2026" or "2026-2027"; StudentClassHistory stores plain "2026"
// Build a prioritized list of candidate year strings to try
function getCandidateYears(examCycleYear: string): string[] {
  const currentYear = String(new Date().getFullYear());
  const candidates: string[] = [];
  if (!examCycleYear) return [currentYear];

  // Add exact value
  candidates.push(examCycleYear);

  if (examCycleYear.includes('-')) {
    const parts = examCycleYear.split('-');
    // Add start year, then end year (e.g. "2026" then "2027" from "2026-2027")
    for (const p of parts) {
      if (p && !candidates.includes(p)) candidates.push(p);
    }
  }

  // Always include current year as final fallback
  if (!candidates.includes(currentYear)) candidates.push(currentYear);

  return candidates;
}

function computeGrade(pct: number, passMarks: number, fullMarks: number): string {
  const passPct = (passMarks / fullMarks) * 100;
  if (pct < passPct) return 'F';
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'D';
}

function computeRemark(pct: number, passPct: number): string {
  if (pct >= 90) return 'Outstanding';
  if (pct >= 80) return 'Excellent';
  if (pct >= 70) return 'Very Good';
  if (pct >= 60) return 'Good';
  if (pct >= 50) return 'Average';
  if (pct >= passPct) return 'Satisfactory';
  return 'Needs Improvement';
}

// GET /api/teacher/marks-entry/[setupId]
// Returns setup details + students + existing mark entries for this setup
export async function GET(
  request: NextRequest,
  { params }: { params: { setupId: string } }
) {
  try {
    await connectDB();

    const teacherId = extractUserIdFromCookie(request.cookies.get('user')?.value);
    if (!teacherId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const setup = await ExamSubjectSetup.findById(params.setupId)
      .populate('examCycleId', 'examName academicYear termName examType status')
      .populate('classId', 'name grade')
      .populate('subjectId', 'name')
      .lean();

    if (!setup) {
      return NextResponse.json({ success: false, error: 'Setup not found' }, { status: 404 });
    }

    // Verify teacher owns this setup
    if (setup.teacherId?.toString() !== teacherId) {
      return NextResponse.json({ success: false, error: 'Not assigned to you' }, { status: 403 });
    }

    const examCycle = setup.examCycleId as any;
    const classDoc = setup.classId as any;
    const classIdForQuery = classDoc._id || classDoc;

    // Try each candidate year until we find enrolled students
    const candidateYears = getCandidateYears(examCycle?.academicYear || '');
    let histories: any[] = [];
    let resolvedYear = candidateYears[0];
    for (const year of candidateYears) {
      histories = await StudentClassHistory.find({
        classId: classIdForQuery,
        academicYear: year,
        status: 'active',
      })
        .populate('studentId', 'name rollNumber email')
        .lean();
      if (histories.length > 0) {
        resolvedYear = year;
        break;
      }
    }

    const students = histories
      .map((h: any) => ({
        studentId: h.studentId?._id || h.studentId,
        name: h.studentId?.name || 'Unknown',
        rollNumber: h.studentId?.rollNumber || h.rollNo || '',
        rollNo: h.rollNo || '',
      }))
      .sort((a: any, b: any) => (a.rollNo || '').localeCompare(b.rollNo || ''));

    const studentIds = students.map((s: any) => s.studentId);

    // Get or create a MarksheetBatch for this teacher+setup
    let batch = await MarksheetBatch.findOne({
      examCycleId: examCycle._id || setup.examCycleId,
      classId: classDoc._id || setup.classId,
      subjectId: (setup.subjectId as any)._id || setup.subjectId,
      teacherId,
    }).lean();

    if (!batch) {
      const created = await MarksheetBatch.create({
        examCycleId: examCycle._id || setup.examCycleId,
        classId: classDoc._id || setup.classId,
        subjectId: (setup.subjectId as any)._id || setup.subjectId,
        teacherId,
        totalStudents: students.length,
        entriesCompleted: 0,
        status: 'draft',
      });
      batch = created.toObject();
    }

    // Get existing mark entries for this batch
    const existingEntries = await MarkEntry.find({ batchId: batch._id }).lean();
    const entryByStudentId = new Map<string, any>();
    for (const e of existingEntries) {
      entryByStudentId.set(e.studentId.toString(), e);
    }

    // Merge students with their entries
    const rows = students.map((s: any) => {
      const sid = s.studentId.toString();
      const entry = entryByStudentId.get(sid);
      return {
        studentId: sid,
        name: s.name,
        rollNo: s.rollNo,
        entryId: entry?._id?.toString() || null,
        isAbsent: entry?.isAbsent || false,
        theoryMarks: entry?.theoryMarks ?? null,
        mcqMarks: entry?.mcqMarks ?? null,
        practicalMarks: entry?.practicalMarks ?? null,
        vivaMarks: entry?.vivaMarks ?? null,
        classTestMarks: entry?.classTestMarks ?? null,
        attendanceMarks: entry?.attendanceMarks ?? null,
        totalMarks: entry?.totalMarks ?? null,
        fullMarks: entry?.fullMarks ?? setup.fullMarks,
        percentage: entry?.percentage ?? null,
        grade: entry?.grade ?? null,
        teacherRemark: entry?.teacherRemark ?? '',
        isSaved: !!entry,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        setup,
        batchId: batch._id.toString(),
        batchStatus: batch.status,
        rows,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/teacher/marks-entry/[setupId]
// Upserts mark entries for all students
export async function POST(
  request: NextRequest,
  { params }: { params: { setupId: string } }
) {
  try {
    await connectDB();

    const teacherId = extractUserIdFromCookie(request.cookies.get('user')?.value);
    if (!teacherId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const setup = await ExamSubjectSetup.findById(params.setupId)
      .populate('examCycleId', 'examName academicYear')
      .lean();

    if (!setup) {
      return NextResponse.json({ success: false, error: 'Setup not found' }, { status: 404 });
    }
    if (setup.teacherId?.toString() !== teacherId) {
      return NextResponse.json({ success: false, error: 'Not assigned to you' }, { status: 403 });
    }

    const body = await request.json();
    const { batchId, entries } = body as {
      batchId: string;
      entries: Array<{
        studentId: string;
        isAbsent: boolean;
        theoryMarks?: number | null;
        mcqMarks?: number | null;
        practicalMarks?: number | null;
        vivaMarks?: number | null;
        classTestMarks?: number | null;
        attendanceMarks?: number | null;
        teacherRemark?: string;
      }>;
    };

    if (!batchId || !Array.isArray(entries)) {
      return NextResponse.json({ success: false, error: 'batchId and entries required' }, { status: 400 });
    }

    const fullMarks = setup.fullMarks;
    const passMarks = setup.passMarks;
    const passPct = (passMarks / fullMarks) * 100;
    const examCycleId = (setup.examCycleId as any)._id || setup.examCycleId;
    const subjectId = setup.subjectId;

    let savedCount = 0;
    for (const entry of entries) {
      const componentSum = [
        entry.theoryMarks,
        entry.mcqMarks,
        entry.practicalMarks,
        entry.vivaMarks,
        entry.classTestMarks,
        entry.attendanceMarks,
      ]
        .filter((v): v is number => typeof v === 'number' && !isNaN(v))
        .reduce((a, b) => a + b, 0);

      const totalMarks = entry.isAbsent ? 0 : componentSum;
      const percentage = entry.isAbsent ? 0 : parseFloat(((totalMarks / fullMarks) * 100).toFixed(2));
      const grade = entry.isAbsent ? 'AB' : computeGrade(percentage, passMarks, fullMarks);
      const academicRemark = entry.isAbsent ? 'Absent' : computeRemark(percentage, passPct);

      await MarkEntry.findOneAndUpdate(
        { batchId: new mongoose.Types.ObjectId(batchId), studentId: new mongoose.Types.ObjectId(entry.studentId) },
        {
          $set: {
            examCycleId,
            subjectId,
            isAbsent: entry.isAbsent,
            theoryMarks: entry.isAbsent ? undefined : entry.theoryMarks,
            mcqMarks: entry.isAbsent ? undefined : entry.mcqMarks,
            practicalMarks: entry.isAbsent ? undefined : entry.practicalMarks,
            vivaMarks: entry.isAbsent ? undefined : entry.vivaMarks,
            classTestMarks: entry.isAbsent ? undefined : entry.classTestMarks,
            attendanceMarks: entry.isAbsent ? undefined : entry.attendanceMarks,
            totalMarks,
            fullMarks,
            percentage,
            grade,
            status: entry.isAbsent ? 'absent' : 'active',
            teacherRemark: entry.teacherRemark || '',
            academicRemark,
          },
        },
        { upsert: true, new: true }
      );
      savedCount++;
    }

    // Update batch progress
    const completedCount = await MarkEntry.countDocuments({ batchId: new mongoose.Types.ObjectId(batchId) });
    await MarksheetBatch.findByIdAndUpdate(batchId, {
      entriesCompleted: completedCount,
      status: 'draft',
    });

    return NextResponse.json({ success: true, saved: savedCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
