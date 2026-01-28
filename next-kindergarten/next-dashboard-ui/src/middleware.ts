import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    const isPublicPath = path === '/sign-in' || path === '/signup' || path === '/'
    const token = request.cookies.get("token")

    if(isPublicPath && token){
        return NextResponse.redirect(new URL("/admin", request.url));
    }
    if(!isPublicPath && !token){
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/teacher',
    '/admin',
    '/parent',
  ],
};