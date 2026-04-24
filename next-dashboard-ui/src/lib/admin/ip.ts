import { NextRequest } from 'next/server';

export function getRequestIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstHop = forwardedFor.split(',')[0]?.trim();
    if (firstHop) return firstHop;
  }

  return request.headers.get('x-real-ip') || 'unknown';
}
