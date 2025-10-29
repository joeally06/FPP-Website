'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Status {
  status_name: string;
  current_playlist: { playlist: string; count: string; index: string };
  current_sequence: string;
  volume: number;
  mode_name: string;
  // Add more fields as needed
}

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const router = useRouter();

  // Redirect non-admins to jukebox page
  useEffect(() => {
    if (sessionStatus !== 'loading' && !isAdmin) {
      router.push('/jukebox');
    }
  }, [isAdmin, sessionStatus, router]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/fppd/status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        } else {
          setError('Failed to fetch FPP status');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    if (isAdmin) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  // Show loading while checking authentication
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  // Non-admins will be redirected, but show nothing while redirecting
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">FPP Admin Dashboard</h1>
        <div>
          <div className="flex items-center space-x-4">
            <span>Welcome, {session?.user.name} (Admin)</span>
            <button
              onClick={() => signOut()}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">FPP Status</h2>
        {error && <p className="text-red-500">Error: {error}</p>}
        {status ? (
          <div className="space-y-4" suppressHydrationWarning>
            <p><strong>Status:</strong> {status.status_name}</p>
            <p><strong>Mode:</strong> {status.mode_name}</p>
            <p><strong>Current Playlist:</strong> {status.current_playlist.playlist || 'None'}</p>
            <p><strong>Current Sequence:</strong> {status.current_sequence || 'None'}</p>
            <div>
              <label><strong>Volume:</strong> {status.volume}</label>
              <input
                type="range"
                min="0"
                max="100"
                value={status.volume}
                onChange={async (e) => {
                  const vol = parseInt(e.target.value);
                  try {
                    await fetch(`/api/web/system/volume`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ volume: vol })
                    });
                    setStatus({ ...status, volume: vol });
                  } catch (err) {
                    alert('Failed to set volume');
                  }
                }}
                className="w-full"
              />
            </div>
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </div>
      <nav className="mt-8">
        <a href="/jukebox" className="bg-green-500 text-white px-4 py-2 rounded mr-4">🎵 Jukebox (Public)</a>
        <a href="/playlists" className="bg-blue-500 text-white px-4 py-2 rounded mr-4">Playlists</a>
        <a href="/sequences" className="bg-blue-500 text-white px-4 py-2 rounded mr-4">Sequences</a>
        <a href="/admin" className="bg-purple-500 text-white px-4 py-2 rounded">Analytics</a>
      </nav>
    </div>
  );
}
