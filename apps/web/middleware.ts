import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'ps_user';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow login page and Next internals
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // Allow public assets
  if (pathname.startsWith('/images') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const userCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (userCookie === 'admin' || userCookie === 'user') {
    return NextResponse.next();
  }

  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = '/login';
  nextUrl.searchParams.set('next', pathname + search);
  return NextResponse.redirect(nextUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
