import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import AdminLayout from '@/components/AdminLayout';
import MediaManager from '@/components/admin/MediaManager';

export const metadata = {
  title: 'Media Manager - FPP Control Center',
  description: 'Download audio from FPP and manage sequence mappings'
};

export default async function MediaPage() {
  // SECURITY: Server-side session check
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/admin/media');
  }

  // Redirect if not admin
  if (session.user.role !== 'admin') {
    redirect('/');
  }

  return (
    <AdminLayout>
      <MediaManager />
    </AdminLayout>
  );
}
