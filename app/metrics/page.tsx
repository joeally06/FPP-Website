'use client';

import { useState } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import { AdminH1, AdminH2, AdminText, AdminTextSmall, AdminTextTiny, AdminValue } from '@/components/admin/Typography';
import Link from 'next/link';

type TabType = 'analytics' | 'engagement';

export default function MetricsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <AdminNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <AdminH1>📊 Metrics Dashboard</AdminH1>
          <AdminText>
            View analytics and engagement metrics for your light show
          </AdminText>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'bg-white text-black shadow-lg'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            📈 Analytics
          </button>
          <button
            onClick={() => setActiveTab('engagement')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'engagement'
                ? 'bg-white text-black shadow-lg'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            👥 Engagement
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'analytics' ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <AdminH2>📊 Page Views & Traffic</AdminH2>
              <AdminText className="mb-6">
                Detailed analytics including page views, visitor sessions, and traffic patterns
              </AdminText>
              
              <Link
                href="/admin"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all font-semibold"
              >
                View Full Analytics →
              </Link>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <AdminH2>👥 User Engagement</AdminH2>
              <AdminText className="mb-6">
                Track user interactions, voting patterns, and jukebox requests
              </AdminText>
              
              <Link
                href="/engagement"
                className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all font-semibold"
              >
                View Full Engagement →
              </Link>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <AdminTextSmall className="mb-2">Total Visitors</AdminTextSmall>
              <AdminValue>---</AdminValue>
              <AdminTextTiny className="mt-2">Loading...</AdminTextTiny>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <AdminTextSmall className="mb-2">Page Views</AdminTextSmall>
              <AdminValue>---</AdminValue>
              <AdminTextTiny className="mt-2">Loading...</AdminTextTiny>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <AdminTextSmall className="mb-2">Song Requests</AdminTextSmall>
              <AdminValue>---</AdminValue>
              <AdminTextTiny className="mt-2">Loading...</AdminTextTiny>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
