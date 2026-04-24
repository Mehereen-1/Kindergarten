import crypto from 'crypto';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateTokenPair(windowMs: number) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawToken);
  const expiry = new Date(Date.now() + windowMs);

  return { rawToken, hashedToken, expiry };
}

export function isHexToken(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token);
}
