import { NextRequest, NextResponse } from 'next/server';

const BYPASS_ADMIN_AUTH = true;

// Define role-based route mappings
const roleRoutes: Record<string, string[]> = {
  admin: ['/dashboard/admin', '/api/admin'],
  teacher: ['/teacher', '/api/teacher', '/api/chat'],
  parent: ['/parent', '/api/parent', '/api/chat'],
};

// Public routes that don't require authentication
const publicRoutes = ['/', '/sign-in'];

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/teacher',
  '/parent',
  '/api/admin',
  '/api/teacher',
  '/api/parent',
  '/change-password',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');

  // Temporary bypass to speed up admin feature testing.
  if (BYPASS_ADMIN_AUTH && (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/api/admin') || pathname.startsWith('/list/'))) {
    return NextResponse.next();
  }

  // Check if route is public
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get user info from cookies
  const userCookie = request.cookies.get('user')?.value;
  const userRole = request.cookies.get('userRole')?.value;

  // Check if user is authenticated
  if (!userCookie || !userRole) {
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      } else {
        const signInUrl = new URL('/sign-in', request.url);
        signInUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(signInUrl);
      }
    }
    return NextResponse.next();
  }

  // Parse user info
  let user: any;
  try {
    user = JSON.parse(decodeURIComponent(userCookie));
  } catch (error) {
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
      } else {
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
    }
    return NextResponse.next();
  }

  // Check role-based access
  const role = user.role || userRole;
  const allowedRoutes = roleRoutes[role] || [];

  if (!allowedRoutes.some(route => pathname.startsWith(route))) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else {
      // Redirect to appropriate dashboard
      const dashboardUrl = role === 'admin' ? '/dashboard/admin' : role === 'teacher' ? '/teacher' : '/parent';
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
  }

  // Allow access
  return NextResponse.next();
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