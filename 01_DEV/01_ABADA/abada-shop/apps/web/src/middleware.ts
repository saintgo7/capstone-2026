import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/mypage', '/checkout', '/orders'];
const ADMIN_PATHS = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  const isAdmin = ADMIN_PATHS.some(path => pathname.startsWith(path));

  if (isProtected || isAdmin) {
    const token =
      request.cookies.get('accessToken')?.value ??
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/mypage/:path*', '/checkout', '/orders/:path*', '/admin/:path*'],
};
