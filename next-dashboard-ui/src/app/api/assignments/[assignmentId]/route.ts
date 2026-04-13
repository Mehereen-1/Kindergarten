import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Assignment from '@/lib/models/Assignment';
import { extractSessionUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    if (!sessionUser?.id || (sessionUser.role !== 'teacher' && sessionUser.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const assignment = await Assignment.findById(params.assignmentId);
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    const isOwner = String(assignment.createdBy) === sessionUser.id;
    const isAdmin = sessionUser.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (body?.title !== undefined) assignment.title = String(body.title || '').trim();
    if (body?.subject !== undefined) assignment.subject = String(body.subject || '').trim();
    if (body?.className !== undefined) assignment.className = String(body.className || '').trim();
    if (body?.prompt !== undefined) assignment.prompt = String(body.prompt || '');
    if (body?.expectedAnswer !== undefined) assignment.expectedAnswer = String(body.expectedAnswer || '').trim();
    if (body?.assignmentType !== undefined) assignment.assignmentType = String(body.assignmentType || 'letter_tracing') as any;
    if (body?.gradingMode !== undefined) assignment.gradingMode = String(body.gradingMode || 'auto_text') as any;
    if (body?.language !== undefined) assignment.language = body.language;
    if (body?.studentLevel !== undefined) assignment.studentLevel = String(body.studentLevel || 'kindergarten') as any;
    if (body?.repeatCount !== undefined) assignment.repeatCount = Math.max(1, Number(body.repeatCount || 1));
    if (body?.caseSensitive !== undefined) assignment.caseSensitive = Boolean(body.caseSensitive);
    if (body?.worksheetTemplate !== undefined) assignment.worksheetTemplate = String(body.worksheetTemplate || 'tracing_sheet') as any;
    if (body?.isPublished !== undefined) assignment.isPublished = Boolean(body.isPublished);
    if (body?.dueDate !== undefined) assignment.dueDate = body.dueDate ? new Date(body.dueDate) : undefined;

    await assignment.save();

    return NextResponse.json({ success: true, assignment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    if (!sessionUser?.id || (sessionUser.role !== 'teacher' && sessionUser.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const assignment = await Assignment.findById(params.assignmentId);
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    const isOwner = String(assignment.createdBy) === sessionUser.id;
    const isAdmin = sessionUser.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await assignment.deleteOne();

    return NextResponse.json({ success: true, message: 'Assignment deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
