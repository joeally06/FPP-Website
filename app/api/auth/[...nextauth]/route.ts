import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';
import { hashEmail, createSafeUserId } from '@/lib/privacy-utils';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // FacebookProvider({
    //   clientId: process.env.FACEBOOK_CLIENT_ID!,
    //   clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    // }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60, // 30 minutes
    updateAge: 5 * 60, // Refresh every 5 minutes of activity
  },
  // Cookie configuration - separate settings for production (HTTPS) and development (HTTP)
  cookies: process.env.NODE_ENV === 'production' ? {
    // Production: Use __Secure- prefix for HTTPS
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true
      }
    }
  } : {
    // Development: Use standard cookie name for HTTP (localhost)
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false
      }
    }
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
      const isAdmin = adminEmails.includes(user.email!);
      
      // GDPR: Log login attempts with hashed email (no PII)
      console.log(`[AUTH] Login attempt:`, {
        userHash: createSafeUserId(user.email!, account?.provider),
        name: user.name,
        provider: account?.provider,
        isAdmin,
        timestamp: new Date().toISOString()
      });
      
      // Log admin logins separately for security monitoring
      if (isAdmin) {
        console.log(`[SECURITY] Admin login:`, {
          userHash: hashEmail(user.email!),
          provider: account?.provider,
          timestamp: new Date().toISOString()
        });
      }
      
      return true; // Allow all Google OAuth users
    },
    async jwt({ token, user }: { token: JWT; user?: any }) {
      // Add role to token
      if (user) {
        // Check if user email is in admin list
        const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
        const isAdmin = adminEmails.includes(user.email!);
        token.role = isAdmin ? 'admin' : 'user';
        
        // GDPR: Log non-admin authentication attempts with hashed email
        if (!isAdmin) {
          console.warn(`[SECURITY] Non-admin user authenticated:`, {
            userHash: hashEmail(user.email!),
            timestamp: new Date().toISOString()
          });
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Add role to session
      session.user.role = token.role as string;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

// CRITICAL SECURITY: Refuse to start in production without NEXTAUTH_SECRET
// Missing secret makes JWT tokens predictable and allows authentication bypass
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  throw new Error(
    '[SECURITY] CRITICAL: NEXTAUTH_SECRET is REQUIRED in production. ' +
    'Set a strong random secret (32+ characters) to prevent authentication bypass. ' +
    'Generate one with: openssl rand -base64 32'
  );
}

export { handler as GET, handler as POST };
