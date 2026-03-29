import { NextRequest, NextResponse } from 'next/server';
import '@/lib/models/ExamCycle';
import '@/lib/models/ExamSubjectSetup';
import '@/lib/models/Class';
import ExamCycle from '@/lib/models/ExamCycle';
import ExamSubjectSetup from '@/lib/models/ExamSubjectSetup';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

function extractUserIdFromCookie(rawUserCookie?: string): string | null {
  if (!rawUserCookie) return null;

  // Some flows may already store just the id in the cookie.
  if (mongoose.Types.ObjectId.isValid(rawUserCookie)) return rawUserCookie;

  try {
    const decoded = decodeURIComponent(rawUserCookie);
    const parsed = JSON.parse(decoded);
    const candidateId = parsed?.id || parsed?._id;
    if (candidateId && mongoose.Types.ObjectId.isValid(candidateId)) {
      return candidateId;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * GET /api/admin/exam-config/cycles
 * Get all exam cycles (with optional filters)
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get('academicYear');
    const status = searchParams.get('status');
    const termName = searchParams.get('termName');

    const filter: any = {};
    if (academicYear) filter.academicYear = academicYear;
    if (status) filter.status = status;
    if (termName) filter.termName = termName;

    const cycles = await ExamCycle.find(filter)
      .populate('classIds', 'name')
      .populate('createdBy', 'name email')
      .sort({ marksEntryStartDate: -1 });

    return NextResponse.json({ success: true, data: cycles });
  } catch (error: any) {
    console.error('GET exam cycles error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/exam-config/cycles
 * Create a new exam cycle
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      academicYear,
      termName,
      examName,
      examType,
      classIds,
      subjectIds,
      marksEntryStartDate,
      marksEntryEndDate,
      publishDate,
      notes,
    } = body;

    // Validate required fields
    if (!academicYear || !termName || !examName || !examType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate date order
    const startDate = new Date(marksEntryStartDate);
    const endDate = new Date(marksEntryEndDate);
    const pubDate = new Date(publishDate);

    if (startDate >= endDate) {
      return NextResponse.json(
        { success: false, error: 'Entry start date must be before end date' },
        { status: 400 }
      );
    }

    if (endDate > pubDate) {
      return NextResponse.json(
        { success: false, error: 'Entry end date must be before or equal to publish date' },
        { status: 400 }
      );
    }

    // Get user from cookies (assuming auth is set up)
    const userId = extractUserIdFromCookie(req.cookies.get('user')?.value);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: invalid user cookie' },
        { status: 401 }
      );
    }

    const cycle = new ExamCycle({
      academicYear,
      termName,
      examName,
      examType,
      classIds: classIds || [],
      subjectIds: subjectIds || [],
      marksEntryStartDate: startDate,
      marksEntryEndDate: endDate,
      publishDate: pubDate,
      status: 'draft',
      createdBy: userId,
      notes,
    });

    await cycle.save();

    return NextResponse.json(
      { success: true, data: cycle },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST exam cycle error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
