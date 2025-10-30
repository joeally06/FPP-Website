'use client';

import { useState } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import Link from 'next/link';

type TabType = 'analytics' | 'engagement';

export default function MetricsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <AdminNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">📊 Metrics Dashboard</h1>
          <p className="text-white/80">
            View analytics and engagement metrics for your light show
          </p>
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
              <h2 className="text-2xl font-bold text-white mb-4">📊 Page Views & Traffic</h2>
              <p className="text-white/80 mb-6">
                Detailed analytics including page views, visitor sessions, and traffic patterns
              </p>
              
              <Link
                href="/admin"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all font-semibold"
              >
                View Full Analytics →
              </Link>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">👥 User Engagement</h2>
              <p className="text-white/80 mb-6">
                Track user interactions, voting patterns, and jukebox requests
              </p>
              
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
              <div className="text-white/60 text-sm mb-2">Total Visitors</div>
              <div className="text-4xl font-bold text-white">---</div>
              <div className="text-white/60 text-xs mt-2">Loading...</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-white/60 text-sm mb-2">Page Views</div>
              <div className="text-4xl font-bold text-white">---</div>
              <div className="text-white/60 text-xs mt-2">Loading...</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-white/60 text-sm mb-2">Song Requests</div>
              <div className="text-4xl font-bold text-white">---</div>
              <div className="text-white/60 text-xs mt-2">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
