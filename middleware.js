import { NextResponse } from 'next/server';

export function middleware(request) {
  // Skip auth for static files
  if (request.nextUrl.pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // No authentication for now (single-user personal app)
  // Add authentication here later if needed
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
