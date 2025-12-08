import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Requires admin authentication for API routes
 * 
 * SECURITY: Re-verifies admin status from ADMIN_EMAILS environment variable
 * Does NOT trust the role claim in JWT - verifies against server-side source of truth
 * 
 * @throws Error if user is not authenticated or not an admin
 * @returns The authenticated session
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    throw new Error('Authentication required');
  }
  
  if (!session.user?.email) {
    throw new Error('User email not found in session');
  }
  
  // SECURITY: Always verify admin status from environment variable
  // NEVER trust the role claim from JWT as it could be tampered with
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
  
  const userEmail = session.user.email.toLowerCase();
  const isAdmin = adminEmails.includes(userEmail);
  
  if (!isAdmin) {
    console.error(`[Security] Unauthorized admin access attempt by: ${session.user.email}`);
    throw new Error('Admin access required');
  }
  
  // Log successful admin access for audit trail
  console.log(`[Security] Admin access granted to: ${session.user.email}`);
  
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
 * 
 * SECURITY: Verifies against ADMIN_EMAILS environment variable, not JWT role
 * 
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return false;
  }
  
  // SECURITY: Verify admin status from environment variable
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
  
  const userEmail = session.user.email.toLowerCase();
  return adminEmails.includes(userEmail);
}
