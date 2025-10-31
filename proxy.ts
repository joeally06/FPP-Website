// Security Proxy - Add security headers and protection to all responses

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF Protection for API routes (except NextAuth)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const method = request.method;
    
    // Only check state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      const host = request.headers.get('host');
      
      // Build allowed origins list
      const allowedOrigins = [
        process.env.NEXTAUTH_URL || '',
        process.env.NEXT_PUBLIC_APP_URL || '',
      ].filter(Boolean);

      // For development/local network, allow localhost and local IPs
      if (process.env.NODE_ENV === 'development' || !process.env.NEXTAUTH_URL?.startsWith('https://')) {
        // Allow localhost variants
        allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
        
        // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (host) {
          allowedOrigins.push(`http://${host}`, `https://${host}`);
          
          // If host is a local IP, also allow it
          if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) {
            allowedOrigins.push(`http://${host}`);
          }
        }
        
        // If origin is a local IP, allow it
        if (origin && /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|localhost|127\.0\.0\.1)/.test(origin)) {
          allowedOrigins.push(origin);
        }
      }

      // Check if origin or referer is valid
      const isValidOrigin = origin && allowedOrigins.some(allowed => 
        origin === allowed || origin.startsWith(allowed.split(':').slice(0, -1).join(':'))
      );

      const isValidReferer = referer && allowedOrigins.some(allowed =>
        referer.startsWith(allowed.split(':').slice(0, -1).join(':'))
      );

      if (!isValidOrigin && !isValidReferer) {
        console.warn('[SECURITY] CSRF detected:', {
          path: pathname,
          method,
          origin: origin || 'none',
          referer: referer || 'none',
          allowed: allowedOrigins.join(', '),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
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

  const response = NextResponse.next();

  // ✅ SECURITY HEADERS
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline
      "style-src 'self' 'unsafe-inline'", // Allow inline styles
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' http://192.168.2.186:11434 http://192.168.5.2", // Allow Ollama and FPP connections
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  
  // Permissions Policy (formerly Feature-Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  return response;
}

// Configure which routes the middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
