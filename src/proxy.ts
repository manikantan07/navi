import { NextRequest, NextResponse } from 'next/server';

export default function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtected = path.startsWith('/dashboard');

  // next-auth v4 JWT session cookie
  const sessionToken =
    req.cookies.get('next-auth.session-token')?.value ??
    req.cookies.get('__Secure-next-auth.session-token')?.value;

  if (isProtected && !sessionToken) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
