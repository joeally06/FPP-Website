'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import UserEngagementPanel from '@/components/analytics/UserEngagementPanel';

export default function UserEngagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user?.role !== 'admin') {
      router.push('/jukebox');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl text-white">Loading engagement data...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'admin') {
    return null;
  }

  return (
    <AdminLayout 
      title="👥 User Engagement Analytics" 
      subtitle="Track visitor activity and engagement patterns"
    >
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => router.push('/admin')}
          className="backdrop-blur-sm bg-purple-500/80 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <span>📊</span>
          Analytics Dashboard
        </button>
      </div>

      <UserEngagementPanel />
    </AdminLayout>
  );
}
