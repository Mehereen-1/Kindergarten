import { NextRequest, NextResponse } from 'next/server';
import { getServerCctvBackendUrl } from '@/lib/serverConfig';

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

function buildTargetUrl(req: NextRequest, pathSegments: string[]) {
  const base = getServerCctvBackendUrl();
  const targetPath = pathSegments.map(encodeURIComponent).join('/');
  const query = req.nextUrl.searchParams.toString();
  return `${base}/${targetPath}${query ? `?${query}` : ''}`;
}

function copyHeaders(source: Headers) {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

async function proxyRequest(req: NextRequest, pathSegments: string[]) {
  const method = req.method.toUpperCase();
  const targetUrl = buildTargetUrl(req, pathSegments);
  const headers = copyHeaders(req.headers);

  let body: BodyInit | undefined;
  if (!['GET', 'HEAD'].includes(method)) {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      body = await req.formData();
      headers.delete('content-type');
    } else {
      body = new Uint8Array(await req.arrayBuffer());
    }
  }

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      // Required for long-running video processing/streaming endpoints.
      cache: 'no-store',
    });

    const responseHeaders = copyHeaders(upstream.headers);
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Unable to reach attendance backend',
        details: String(error),
      },
      { status: 502 }
    );
  }
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(req, path || []);
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(req, path || []);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(req, path || []);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(req, path || []);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(req, path || []);
}
