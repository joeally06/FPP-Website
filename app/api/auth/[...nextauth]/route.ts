import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add role to token
      if (user) {
        // Check if user email is in admin list (you can replace with DB check)
        const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
        token.role = adminEmails.includes(user.email!) ? 'admin' : 'user';
      }
      return token;
    },
    async session({ session, token }) {
      // Add role to session
      session.user.role = token.role as string;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
});

export { handler as GET, handler as POST };
