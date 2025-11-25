import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

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
  // Force secure cookies in production only
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: process.env.NODE_ENV === 'production' ? {
    // Production: Use __Secure- prefix for HTTPS
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
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
      name: `next-auth.session-token`,
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
      
      // Log all login attempts
      console.log(`[AUTH] Login attempt:`, {
        email: user.email,
        name: user.name,
        provider: account?.provider,
        isAdmin,
        timestamp: new Date().toISOString()
      });
      
      // Log admin logins separately for security monitoring
      if (isAdmin) {
        console.log(`[SECURITY] Admin login:`, {
          email: user.email,
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
        
        // Warn about unauthorized admin access attempts
        if (!isAdmin) {
          console.warn(`[SECURITY] Non-admin user authenticated:`, {
            email: user.email,
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

// Warn if the NEXTAUTH_SECRET isn't present in production
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  console.warn('[SECURITY] NEXTAUTH_SECRET is not set in production - please set a strong secret');
}

export { handler as GET, handler as POST };
