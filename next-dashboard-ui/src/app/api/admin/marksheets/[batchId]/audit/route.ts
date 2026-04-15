import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AuditLog from '@/lib/models/AuditLog';
import { extractSessionUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    const userRole = sessionUser?.role || request.cookies.get('userRole')?.value;

    if (!sessionUser?.id || userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can view audit history' },
        { status: 403 }
      );
    }

    const logs = await AuditLog.find({ 'context.batchId': params.batchId })
      .populate('changedBy', 'name role email')
      .populate('context.studentId', 'name rollNumber')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      data: logs.map((log: any) => ({
        _id: String(log._id),
        entityType: log.entityType,
        action: log.action,
        reason: log.reason || '',
        changedFields: Array.isArray(log.changedFields) ? log.changedFields : [],
        oldValue: log.oldValue || null,
        newValue: log.newValue || null,
        createdAt: log.createdAt,
        changedBy: log.changedBy
          ? {
              _id: String(log.changedBy._id || log.changedBy),
              name: log.changedBy.name || 'Unknown user',
              role: log.changedBy.role || log.changedByRole || '',
              email: log.changedBy.email || '',
            }
          : null,
        student: log.context?.studentId
          ? {
              _id: String(log.context.studentId._id || log.context.studentId),
              name: log.context.studentId.name || 'Unknown student',
              rollNumber: log.context.studentId.rollNumber || '',
            }
          : null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
