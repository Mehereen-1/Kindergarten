import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Notice from '@/lib/models/Notice';
import User from '@/lib/models/User';
import { sendEmail } from '@/lib/email';

const DEFAULT_THRESHOLD = 0.10;

type NormalizedIncomingAlert = {
  title: string;
  summary: string;
  label: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  triggeredBy: string[];
  metadata: Record<string, unknown>;
};

function normalizeLabel(label: string) {
  return String(label || '').trim().toLowerCase();
}

function isMobileLabel(label: string) {
  const normalized = normalizeLabel(label);
  return (
    normalized.includes('mobile') ||
    normalized.includes('cell') ||
    normalized.includes('phone') ||
    normalized.includes('smartphone')
  );
}

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeSeverity(value: unknown, confidence: number): 'low' | 'medium' | 'high' | 'critical' {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'low' || raw === 'medium' || raw === 'high' || raw === 'critical') {
    return raw;
  }
  if (confidence >= 0.9) return 'critical';
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.55) return 'medium';
  return 'low';
}

function buildLegacyAlertTitle(location: string, confidence: number) {
  return `Mobile phone detected${location ? ` at ${location}` : ''} (${Math.round(confidence * 100)}%)`;
}

function normalizeIncomingAlerts(body: any, threshold: number): {
  alerts: NormalizedIncomingAlert[];
  alerted: boolean;
  reason?: string;
} {
  if (Array.isArray(body?.alerts) && body.alerts.length > 0) {
    const alerts = body.alerts
      .map((item: any): NormalizedIncomingAlert | null => {
        const confidence = Number(item?.confidence ?? 0);
        if (!Number.isFinite(confidence)) return null;

        const type = String(item?.type || item?.eventType || 'anomaly_alert').trim();
        const summary = String(item?.summary || `${titleCase(type)} detected`).trim();
        const label = String(item?.label || item?.event_type || type).trim();
        const triggeredBy = Array.isArray(item?.triggered_by)
          ? item.triggered_by.map((value: unknown) => String(value)).filter(Boolean)
          : [];

        return {
          title: summary,
          summary,
          label,
          type,
          severity: normalizeSeverity(item?.severity, confidence),
          confidence,
          triggeredBy,
          metadata: {
            ...((item?.metadata && typeof item.metadata === 'object') ? item.metadata : {}),
            triggeredBy,
            upstreamAlertType: type,
          },
        };
      })
      .filter(Boolean) as NormalizedIncomingAlert[];

    if (!alerts.length) {
      return { alerts: [], alerted: false, reason: 'No valid alerts in payload' };
    }

    return { alerts, alerted: true };
  }

  const label = String(body?.label || body?.detectedClass || body?.object || '').trim();
  const confidence = Number(body?.confidence ?? body?.score ?? 0);
  if (!label || !Number.isFinite(confidence)) {
    return { alerts: [], alerted: false, reason: 'label and confidence are required' };
  }

  const shouldAlert = isMobileLabel(label) && confidence >= threshold;
  if (!shouldAlert) {
    return {
      alerts: [],
      alerted: false,
      reason: `Ignored: requires mobile detection with confidence >= ${threshold}`,
    };
  }

  const location = String(body?.location || body?.cameraName || body?.camera || body?.className || '').trim();
  return {
    alerts: [
      {
        title: buildLegacyAlertTitle(location, confidence),
        summary: `Anomaly model detected: ${label}`,
        label,
        type: 'mobile_phone_alert',
        severity: normalizeSeverity(body?.severity, confidence),
        confidence,
        triggeredBy: [],
        metadata: {},
      },
    ],
    alerted: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    const expectedToken = process.env.MODEL_ALERT_TOKEN;
    if (expectedToken) {
      const incomingToken = request.headers.get('x-model-alert-token') || '';
      if (incomingToken !== expectedToken) {
        return NextResponse.json({ success: false, error: 'Unauthorized model token' }, { status: 401 });
      }
    }

    const body = await request.json();
    const threshold = Number(process.env.ANOMALY_MOBILE_THRESHOLD || DEFAULT_THRESHOLD);
    const location = String(body?.location || body?.cameraName || body?.camera || body?.className || '').trim();
    const className = String(body?.className || '').trim();
    const imageUrl = String(body?.imageUrl || body?.snapshotUrl || '').trim();
    const videoUrl = String(body?.videoUrl || body?.clipUrl || '').trim();
    const videoName = String(body?.videoName || body?.sourceVideo || '').trim();
    const playbackAtSec = Number(body?.playbackAtSec ?? body?.eventSecond ?? 0);
    const detectedAt = body?.detectedAt ? new Date(body.detectedAt) : new Date();
    const source = String(body?.source || 'security-alert-service').trim();
    const modelResults = Array.isArray(body?.modelResults) ? body.modelResults : [];
    const systemMetrics =
      body?.systemMetrics && typeof body.systemMetrics === 'object' ? body.systemMetrics : undefined;

    const normalized = normalizeIncomingAlerts(body, threshold);
    if (!normalized.alerted) {
      return NextResponse.json({
        success: true,
        alerted: false,
        reason: normalized.reason || 'No actionable alerts',
      });
    }

    await connectDB();

    const noticePayloads = normalized.alerts.flatMap((alert) => {
      const description = [
        alert.summary,
        `Confidence: ${(alert.confidence * 100).toFixed(1)}%`,
        location ? `Location: ${location}` : null,
        className ? `Class: ${className}` : null,
        imageUrl ? `Snapshot: ${imageUrl}` : null,
        videoName ? `Video: ${videoName}` : null,
        alert.triggeredBy.length ? `Triggered by: ${alert.triggeredBy.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const metadata = {
        label: alert.label,
        confidence: alert.confidence,
        threshold,
        cameraName: location,
        className,
        imageUrl,
        videoUrl,
        videoName,
        playbackAtSec: Number.isFinite(playbackAtSec) ? Math.max(0, playbackAtSec) : 0,
        detectedAt: detectedAt.toISOString(),
        severity: alert.severity,
        alertType: alert.type,
        triggeredBy: alert.triggeredBy,
        source,
        modelResults,
        systemMetrics,
        emailSent: false,
        emailAttempted: 0,
        webSent: false,
        webSentCount: 0,
        webAttempted: 0,
        ...alert.metadata,
      };

      return ['admin', 'teacher'].map((targetRole) => ({
        title: alert.title,
        description,
        date: detectedAt,
        targetRole,
        type: 'anomaly-alert',
        metadata,
      }));
    });

    const createdNotices = await Notice.insertMany(noticePayloads);

    const recipients = await User.find({ role: { $in: ['admin', 'teacher'] } })
      .select('email role')
      .lean();

    const emails = recipients
      .map((user) => String(user.email || '').trim())
      .filter(Boolean);

    const topAlert = [...normalized.alerts].sort((a, b) => b.confidence - a.confidence)[0];
    const emailDescription = normalized.alerts
      .map(
        (alert) =>
          `${alert.title} | Confidence ${(alert.confidence * 100).toFixed(1)}%${
            alert.triggeredBy.length ? ` | Triggered by ${alert.triggeredBy.join(', ')}` : ''
          }`
      )
      .join('\n');

    let emailResult: { attempted: number; sent: boolean; previewUrl?: string; error?: string } = {
      attempted: emails.length,
      sent: false,
    };

    if (emails.length) {
      try {
        const emailPayload = {
          subject: `[Security Alert] ${topAlert.title}`,
          text: `${emailDescription}\n\nLocation: ${location || 'Unknown'}\nClass: ${className || 'Unknown'}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
              <div style="padding:16px 20px;background:#dc2626;color:#fff">
                <h2 style="margin:0;font-size:18px">Security Alert</h2>
              </div>
              <div style="padding:20px;color:#111827">
                <p style="margin:0 0 12px;font-size:16px;font-weight:700">${topAlert.title}</p>
                ${normalized.alerts
                  .map(
                    (alert) => `
                      <div style="margin:0 0 12px;padding:12px;border:1px solid #e5e7eb;border-radius:10px">
                        <p style="margin:0 0 6px;font-weight:700">${alert.summary}</p>
                        <p style="margin:0 0 4px">Type: <strong>${alert.type}</strong></p>
                        <p style="margin:0 0 4px">Confidence: <strong>${(alert.confidence * 100).toFixed(1)}%</strong></p>
                        <p style="margin:0 0 4px">Severity: <strong>${alert.severity}</strong></p>
                        ${
                          alert.triggeredBy.length
                            ? `<p style="margin:0 0 4px">Triggered by: <strong>${alert.triggeredBy.join(', ')}</strong></p>`
                            : ''
                        }
                      </div>
                    `
                  )
                  .join('')}
                ${location ? `<p style="margin:0 0 6px">Location: <strong>${location}</strong></p>` : ''}
                ${className ? `<p style="margin:0 0 6px">Class: <strong>${className}</strong></p>` : ''}
                ${imageUrl ? `<p style="margin:0 0 6px">Snapshot: <a href="${imageUrl}">${imageUrl}</a></p>` : ''}
                <p style="margin:14px 0 0;color:#6b7280;font-size:13px">Open Sound Alerts in the website to review the incident.</p>
              </div>
            </div>
          `,
        };

        const result = await sendEmail(emails, emailPayload);
        emailResult = {
          attempted: emails.length,
          sent: true,
          previewUrl: result.previewUrl,
        };
      } catch (error: any) {
        emailResult = {
          attempted: emails.length,
          sent: false,
          error: error?.message || 'Failed to send anomaly alert email',
        };
      }
    }

    await Notice.updateMany(
      { _id: { $in: createdNotices.map((notice) => notice._id) } },
      {
        $set: {
          'metadata.emailSent': emailResult.sent,
          'metadata.emailAttempted': emailResult.attempted,
          'metadata.webSent': true,
          'metadata.webSentCount': createdNotices.length,
          'metadata.webAttempted': createdNotices.length,
        },
      }
    );

    return NextResponse.json({
      success: true,
      alerted: true,
      threshold,
      alertsStored: normalized.alerts.length,
      noticeIds: createdNotices.map((notice) => notice._id),
      email: emailResult,
      normalNotifications: { stored: createdNotices.length },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process model alert' },
      { status: 500 }
    );
  }
}
