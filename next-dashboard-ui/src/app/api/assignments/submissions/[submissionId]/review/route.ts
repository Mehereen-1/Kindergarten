import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Assignment from '@/lib/models/Assignment';
import AssignmentSubmission from '@/lib/models/AssignmentSubmission';
import { extractSessionUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    if (!sessionUser?.id || (sessionUser.role !== 'teacher' && sessionUser.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const submission = await AssignmentSubmission.findById(params.submissionId);
    if (!submission) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }

    const assignment = await Assignment.findById(submission.assignmentId).lean();
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    const isOwner = String(assignment.createdBy) === sessionUser.id;
    const isAdmin = sessionUser.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const manualScore = Number(body?.finalScore);
    const manualFeedback = String(body?.finalFeedback || '').trim();

    if (Number.isNaN(manualScore) || manualScore < 0 || manualScore > 100) {
      return NextResponse.json({ success: false, error: 'finalScore must be a number between 0 and 100' }, { status: 400 });
    }

    submission.finalScore = Math.round(manualScore);
    if (manualFeedback) {
      submission.finalFeedback = manualFeedback;
    }
    submission.reviewStatus = 'reviewed';
    submission.reviewedBy = sessionUser.id as any;
    submission.reviewedAt = new Date();

    await submission.save();

    return NextResponse.json({ success: true, submission });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
