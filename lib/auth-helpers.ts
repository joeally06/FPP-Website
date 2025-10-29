import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Requires admin authentication for API routes
 * Throws an error if user is not authenticated or not an admin
 * @returns The authenticated session
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    throw new Error('Authentication required');
  }
  
  if (session.user?.role !== 'admin') {
    throw new Error('Admin access required');
  }
  
  return session;
}

/**
 * Gets the current session without requiring authentication
 * Useful for optional authentication checks
 * @returns The session or null if not authenticated
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Checks if the current user is an admin
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin';
}
