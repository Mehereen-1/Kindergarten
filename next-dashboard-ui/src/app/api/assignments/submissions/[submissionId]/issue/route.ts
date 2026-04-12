import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Assignment from '@/lib/models/Assignment';
import AssignmentSubmission from '@/lib/models/AssignmentSubmission';
import Notice from '@/lib/models/Notice';
import { extractSessionUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    if (!sessionUser?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const submission = await AssignmentSubmission.findById(params.submissionId);
    if (!submission) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }

    const assignment = await Assignment.findById(submission.assignmentId).lean();
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    const body = await request.json();
    const action = String(body?.action || 'report');

    if (action === 'report') {
      const issueMessage = String(body?.issueMessage || '').trim();
      if (!issueMessage) {
        return NextResponse.json(
          { success: false, error: 'issueMessage is required for report action' },
          { status: 400 }
        );
      }

      if (String(submission.createdBy) !== sessionUser.id && sessionUser.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }

      submission.issueStatus = 'open';
      submission.issueReported = true;
      submission.issueMessage = issueMessage;
      submission.issueReportedAt = new Date();
      await submission.save();

      await Notice.create({
        title: 'Assignment issue reported',
        description: `${submission.studentName || 'A student'} reported an issue for assignment "${assignment.title}".`,
        date: new Date(),
        targetRole: 'teacher',
        type: 'notice',
        createdBy: sessionUser.id,
        metadata: {
          source: 'assignment-issue',
          assignmentId: assignment._id,
          submissionId: submission._id,
          assignmentTitle: assignment.title,
          studentName: submission.studentName,
          issueMessage,
        },
      });

      return NextResponse.json({ success: true, submission });
    }

    if (action === 'resolve') {
      const isOwner = String(assignment.createdBy) === sessionUser.id;
      const isAdmin = sessionUser.role === 'admin';
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }

      submission.issueStatus = 'resolved';
      submission.issueResolvedAt = new Date();
      submission.issueResolvedBy = sessionUser.id as any;
      await submission.save();

      return NextResponse.json({ success: true, submission });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
