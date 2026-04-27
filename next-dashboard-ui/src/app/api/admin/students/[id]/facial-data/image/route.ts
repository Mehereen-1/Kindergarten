import { NextRequest, NextResponse } from 'next/server';
import { getServerCctvBackendUrl, isLoopbackUrl } from '@/lib/serverConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

function copyHeaders(source: Headers) {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

function isAllowedAbsoluteSource(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const backendBase = getServerCctvBackendUrl();
  const backendHost = (() => {
    try {
      return new URL(backendBase).host.toLowerCase();
    } catch {
      return '';
    }
  })();

  const sourceHost = parsed.host.toLowerCase();

  if (backendHost && sourceHost === backendHost) return true;
  if (isLoopbackUrl(rawUrl)) return true;
  if (/\.blob\.core\.windows\.net$/i.test(parsed.hostname)) return true;

  return parsed.protocol === 'https:';
}

function resolveTargetUrl(request: NextRequest, src: string) {
  if (!src) return '';
  if (src.startsWith('/api/admin/students/')) return '';

  if (src.startsWith('/api/attendance/backend/')) {
    return new URL(src, request.nextUrl.origin).toString();
  }

  if (src.startsWith('/facial-data/')) {
    return new URL(`/api/attendance/backend${src}`, request.nextUrl.origin).toString();
  }

  if (src.startsWith('/secure-face-image')) {
    return new URL(`/api/attendance/backend${src}`, request.nextUrl.origin).toString();
  }

  if (/^https?:\/\//i.test(src)) {
    return isAllowedAbsoluteSource(src) ? src : '';
  }

  return '';
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src') || '';
  const targetUrl = resolveTargetUrl(request, src);

  if (!targetUrl) {
    return NextResponse.json({ error: 'Invalid image source URL' }, { status: 400 });
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch image', status: upstream.status },
        { status: upstream.status }
      );
    }

    const responseHeaders = copyHeaders(upstream.headers);
    responseHeaders.set('cache-control', 'private, max-age=60');
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to proxy image' },
      { status: 502 }
    );
  }
}
