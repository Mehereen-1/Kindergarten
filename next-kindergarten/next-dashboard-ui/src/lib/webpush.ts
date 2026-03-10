import webpush from 'web-push';

// Initialise VAPID details once. Called lazily on first use.
let _initialised = false;

function init() {
  if (_initialised) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@kindergarten.local';

  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are missing from environment variables.');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  _initialised = true;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

/**
 * Send a single push notification to one subscription object.
 * Returns false if the subscription is expired/invalid (caller should delete it).
 */
export async function sendPush(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  init();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err: any) {
    // 410 Gone = subscription expired/unsubscribed
    if (err?.statusCode === 410 || err?.statusCode === 404) return false;
    throw err;
  }
}
