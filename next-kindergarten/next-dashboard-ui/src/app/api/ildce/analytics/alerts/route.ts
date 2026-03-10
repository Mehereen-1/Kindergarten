import { NextRequest, NextResponse } from 'next/server';
import TopicMetrics from '@/lib/models/TopicMetrics';
import Topic from '@/lib/models/Topic';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/ildce/analytics/alerts
 * Get all active alerts for a class
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');
    const severity = searchParams.get('severity'); // 'high', 'medium', 'low'

    if (!classId) {
      return NextResponse.json(
        { error: 'Missing classId' },
        { status: 400 }
      );
    }

    // Get all topic metrics for class
    let query: any = { classId };
    
    let topicMetrics = await TopicMetrics.find(query);

    if (severity) {
      topicMetrics = topicMetrics.filter((tm: any) =>
        tm.alerts.some((a: any) => a.severity === severity)
      );
    }

    // Flatten alerts with topic context
    const allAlerts = topicMetrics.flatMap((tm: any) =>
      tm.alerts.map((alert: any) => ({
        _id: alert._id,
        topic: tm.topicId,
        alert_type: alert.alert_type,
        severity: alert.severity,
        description: alert.description,
        triggered_at: alert.triggered_at,
        affected_students: alert.affected_students,
        count: alert.affected_students?.length || 0,
      }))
    );

    // Sort by severity and date
    const severityOrder = { high: 3, medium: 2, low: 1 };
    allAlerts.sort((a, b) => {
      if (severityOrder[a.severity as keyof typeof severityOrder] !== 
          severityOrder[b.severity as keyof typeof severityOrder]) {
        return (
          severityOrder[b.severity as keyof typeof severityOrder] -
          severityOrder[a.severity as keyof typeof severityOrder]
        );
      }
      return new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime();
    });

    // Count by severity
    const alertCounts = {
      high: allAlerts.filter((a) => a.severity === 'high').length,
      medium: allAlerts.filter((a) => a.severity === 'medium').length,
      low: allAlerts.filter((a) => a.severity === 'low').length,
      total: allAlerts.length,
    };

    return NextResponse.json(
      {
        alerts: allAlerts,
        alertCounts,
        requiresAction: alertCounts.high > 0 || alertCounts.medium > 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching alerts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ildce/analytics/alerts
 * Dismiss or resolve an alert
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { classId, action } = body; // action: 'dismiss' or 'resolve'

    if (!classId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For now, alerts are recalculated based on metrics
    // In a production system, you'd mark them as resolved in DB
    // This is a placeholder for the alert management system

    return NextResponse.json(
      {
        message: 'Alert action processed',
        action: action,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing alert:', error);
    return NextResponse.json(
      { error: error.message || 'Error processing alert' },
      { status: 500 }
    );
  }
}
