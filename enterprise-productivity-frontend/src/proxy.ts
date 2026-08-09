import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readTokenCookie } from '@/lib/session';

const PUBLIC_PATHS = ['/sign-in', '/sign-up'];

function isPublicPathname(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(
    readTokenCookie(request.cookies.get('ep_session')?.value ?? null),
  );

  if (isPublicPathname(pathname)) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except static assets (skipping _next internals, files).
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};