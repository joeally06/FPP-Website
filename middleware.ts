import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Security Middleware
 * - CSRF Protection for API routes
 * - Admin route protection
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF Protection for API routes (except NextAuth)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const method = request.method;
    
    // Only check state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      const host = request.headers.get('host');
      
      // Get expected origin from environment or host header
      const expectedOrigin = process.env.NEXTAUTH_URL || `https://${host}`;
      
      // Validate origin or referer matches expected origin
      const isValidOrigin = origin === expectedOrigin;
      const isValidReferer = referer?.startsWith(expectedOrigin);
      
      if (!isValidOrigin && !isValidReferer) {
        console.error('[SECURITY] CSRF detected:', {
          path: pathname,
          method,
          origin,
          referer,
          expected: expectedOrigin,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
        });
        
        return NextResponse.json(
          { error: 'Invalid request origin' },
          { status: 403 }
        );
      }
    }
  }

  // Admin route protection
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/settings')) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'admin') {
      const url = new URL('/api/auth/signin', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/settings/:path*'
  ]
};
