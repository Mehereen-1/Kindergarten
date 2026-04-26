import { NextRequest, NextResponse } from 'next/server';

type SupportedRole = 'admin' | 'teacher' | 'parent';

const PUBLIC_EXACT_ROUTES = new Set([
  '/',
  '/sign-in',
  '/admin-login',
  '/admin-request-reset',
  '/admin-reset-password',
  '/admin-setup',
  '/unauthorized',
]);

const PUBLIC_PREFIX_ROUTES = [
  '/api/auth/',
  '/api/admin/login',
  '/api/admin/request-reset',
  '/api/admin/reset',
  '/api/admin/setup',
  '/api/admin/init',
];

const ACCESS_RULES: Array<{
  prefixes: string[];
  allowed: SupportedRole[];
  allowAdminSessionCookie?: boolean;
}> = [
  {
    prefixes: ['/admin', '/api/admin', '/list'],
    allowed: ['admin'],
    allowAdminSessionCookie: true,
  },
  {
    prefixes: ['/teacher', '/api/teacher'],
    allowed: ['teacher', 'admin'],
  },
  {
    prefixes: ['/parent', '/api/parent'],
    allowed: ['parent', 'admin'],
  },
  {
    prefixes: ['/api/security-alerts'],
    allowed: ['teacher', 'admin'],
    allowAdminSessionCookie: true,
  },
];

function parseRoleFromCookies(request: NextRequest): SupportedRole | null {
  const fallback = String(request.cookies.get('userRole')?.value || '')
    .trim()
    .toLowerCase();

  const fromFallback =
    fallback === 'admin' || fallback === 'teacher' || fallback === 'parent' ? fallback : null;

  const rawUserCookie = request.cookies.get('user')?.value;
  if (!rawUserCookie) {
    return (fromFallback as SupportedRole | null) || null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(rawUserCookie));
    const fromUser = String(parsed?.role || '')
      .trim()
      .toLowerCase();
    if (fromUser === 'admin' || fromUser === 'teacher' || fromUser === 'parent') {
      return fromUser;
    }
  } catch {
    // Keep fallback role when user cookie is not JSON-decodable.
  }

  return (fromFallback as SupportedRole | null) || null;
}

function findAccessRule(pathname: string) {
  return ACCESS_RULES.find((rule) => rule.prefixes.some((prefix) => pathname.startsWith(prefix)));
}

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIX_ROUTES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');

  const legacyAdminAuthRoutes: Record<string, string> = {
    '/admin/login': '/admin-login',
    '/admin/request-reset': '/admin-request-reset',
    '/admin/reset': '/admin-reset-password',
    '/admin/setup': '/admin-setup',
  };

  const redirectedAdminAuthPath = legacyAdminAuthRoutes[pathname];
  if (redirectedAdminAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = redirectedAdminAuthPath;
    return NextResponse.redirect(url);
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const matchedRule = findAccessRule(pathname);
  if (!matchedRule) {
    return NextResponse.next();
  }

  if (matchedRule.allowAdminSessionCookie && request.cookies.get('admin_session')?.value) {
    return NextResponse.next();
  }

  const role = parseRoleFromCookies(request);
  if (!role) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: `Unauthorized: sign in required to access ${pathname}` },
        { status: 401 }
      );
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/sign-in';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (matchedRule.allowed.includes(role)) {
    return NextResponse.next();
  }

  const allowedRoles = matchedRule.allowed.join(', ');
  if (isApiRoute) {
    return NextResponse.json(
      {
        error: `Forbidden: role "${role}" cannot access ${pathname}. Allowed roles: ${allowedRoles}`,
      },
      { status: 403 }
    );
  }

  const unauthorizedUrl = request.nextUrl.clone();
  unauthorizedUrl.pathname = '/unauthorized';
  unauthorizedUrl.searchParams.set('from', pathname);
  unauthorizedUrl.searchParams.set(
    'reason',
    `Role "${role}" cannot access this route. Allowed roles: ${allowedRoles}.`
  );
  return NextResponse.redirect(unauthorizedUrl);
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
