import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Notice from '@/lib/models/Notice';
import User from '@/lib/models/User';
import PushSubscriptionModel from '@/lib/models/PushSubscription';
import { sendEmail } from '@/lib/email';
import { sendPush } from '@/lib/webpush';

const DEFAULT_THRESHOLD = 0.10;

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

function buildAlertTitle(location: string, confidence: number) {
  return `Mobile phone detected${location ? ` at ${location}` : ''} (${Math.round(confidence * 100)}%)`;
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
    const label = String(body?.label || body?.detectedClass || body?.object || '');
    const confidence = Number(body?.confidence ?? body?.score ?? 0);
    const threshold = Number(process.env.ANOMALY_MOBILE_THRESHOLD || DEFAULT_THRESHOLD);
    const location = String(body?.location || body?.cameraName || body?.camera || body?.className || '').trim();
    const className = String(body?.className || '').trim();
    const imageUrl = String(body?.imageUrl || body?.snapshotUrl || '').trim();
    const videoUrl = String(body?.videoUrl || body?.clipUrl || '').trim();
    const videoName = String(body?.videoName || body?.sourceVideo || '').trim();
    const playbackAtSec = Number(body?.playbackAtSec ?? body?.eventSecond ?? 0);
    const detectedAt = body?.detectedAt ? new Date(body.detectedAt) : new Date();

    if (!label || Number.isNaN(confidence)) {
      return NextResponse.json(
        { success: false, error: 'label and confidence are required' },
        { status: 400 }
      );
    }

    const shouldAlert = isMobileLabel(label) && confidence >= threshold;
    if (!shouldAlert) {
      return NextResponse.json({
        success: true,
        alerted: false,
        reason: `Ignored: requires mobile detection with confidence >= ${threshold}`,
      });
    }

    await connectDB();

    const title = buildAlertTitle(location || className, confidence);
    const description = [
      `Anomaly model detected: ${label}`,
      `Confidence: ${(confidence * 100).toFixed(1)}%`,
      location ? `Location: ${location}` : null,
      className ? `Class: ${className}` : null,
      imageUrl ? `Snapshot: ${imageUrl}` : null,
      videoName ? `Video: ${videoName}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const metadata = {
      label,
      confidence,
      threshold,
      cameraName: location,
      className,
      imageUrl,
      videoUrl,
      videoName,
      playbackAtSec: Number.isFinite(playbackAtSec) ? Math.max(0, playbackAtSec) : 0,
      detectedAt: detectedAt.toISOString(),
      emailSent: false,
      emailAttempted: 0,
      webSent: false,
      webSentCount: 0,
      webAttempted: 0,
    };

    const [adminNotice, teacherNotice] = await Promise.all([
      Notice.create({
        title,
        description,
        date: detectedAt,
        targetRole: 'admin',
        type: 'anomaly-alert',
        metadata,
      }),
      Notice.create({
        title,
        description,
        date: detectedAt,
        targetRole: 'teacher',
        type: 'anomaly-alert',
        metadata,
      }),
    ]);

    const recipients = await User.find({ role: { $in: ['admin', 'teacher'] } })
      .select('email role')
      .lean();

    const emails = recipients
      .map((user) => String(user.email || '').trim())
      .filter(Boolean);

    let emailResult: { attempted: number; sent: boolean; previewUrl?: string; error?: string } = {
      attempted: emails.length,
      sent: false,
    };

    if (emails.length) {
      try {
        const emailPayload = {
          subject: `[Security Alert] Mobile phone detection (${Math.round(confidence * 100)}%)`,
          text: `${title}\n\n${description}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
              <div style="padding:16px 20px;background:#dc2626;color:#fff">
                <h2 style="margin:0;font-size:18px">Security Alert</h2>
              </div>
              <div style="padding:20px;color:#111827">
                <p style="margin:0 0 10px;font-size:16px;font-weight:700">${title}</p>
                <p style="margin:0 0 6px">Detected object: <strong>${label}</strong></p>
                <p style="margin:0 0 6px">Confidence: <strong>${(confidence * 100).toFixed(1)}%</strong></p>
                ${location ? `<p style="margin:0 0 6px">Location: <strong>${location}</strong></p>` : ''}
                ${className ? `<p style="margin:0 0 6px">Class: <strong>${className}</strong></p>` : ''}
                ${imageUrl ? `<p style="margin:0 0 6px">Snapshot: <a href="${imageUrl}">${imageUrl}</a></p>` : ''}
                <p style="margin:14px 0 0;color:#6b7280;font-size:13px">Open Security Alerts page in the website to acknowledge and resolve.</p>
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

    const pushPayload = {
      title: 'Security Alert',
      body: `${title}${location ? ` • ${location}` : ''}`,
      tag: `anomaly-${adminNotice._id}`,
      url: '/admin/security-alerts',
    };

    const subscriptions = await PushSubscriptionModel.find({
      userRole: { $in: ['admin', 'teacher'] },
    }).lean();

    const pushResult = { attempted: subscriptions.length, sent: 0, failed: 0 };
    for (const subDoc of subscriptions) {
      const ok = await sendPush(
        {
          endpoint: subDoc.endpoint,
          keys: subDoc.keys,
        } as any,
        pushPayload
      ).catch(async (error) => {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await PushSubscriptionModel.deleteOne({ endpoint: subDoc.endpoint });
          return false;
        }
        return false;
      });

      if (ok) {
        pushResult.sent += 1;
      } else {
        pushResult.failed += 1;
      }
    }

    await Notice.updateMany(
      { _id: { $in: [adminNotice._id, teacherNotice._id] } },
      {
        $set: {
          'metadata.emailSent': emailResult.sent,
          'metadata.emailAttempted': emailResult.attempted,
          'metadata.webSent': pushResult.sent > 0,
          'metadata.webSentCount': pushResult.sent,
          'metadata.webAttempted': pushResult.attempted,
        },
      }
    );

    return NextResponse.json({
      success: true,
      alerted: true,
      threshold,
      notices: {
        adminNoticeId: adminNotice._id,
        teacherNoticeId: teacherNotice._id,
      },
      email: emailResult,
      push: pushResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process model alert' },
      { status: 500 }
    );
  }
}