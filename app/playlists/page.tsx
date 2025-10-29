'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function Playlists() {
  const [playlists, setPlaylists] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const router = useRouter();

  // Redirect non-admins to jukebox page
  useEffect(() => {
    if (sessionStatus !== 'loading' && !isAdmin) {
      router.push('/jukebox');
    }
  }, [isAdmin, sessionStatus, router]);

  const fetchScheduledPlaylists = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/web/schedule');
      if (!response.ok) throw new Error('Failed to fetch schedule');
      const schedule = await response.json();
      // Extract unique playlist names from schedule entries
      const playlistSet = new Set<string>();
      schedule.forEach((entry: any) => {
        if (entry.playlist) {
          playlistSet.add(entry.playlist);
        }
      });
      setPlaylists(Array.from(playlistSet));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchScheduledPlaylists();
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

  const startPlaylist = async (name: string) => {
    try {
      const response = await fetch('/api/web/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'Start Playlist At Item',
          args: [name, 1, true, false]
        })
      });
      let data;
      try {
        data = await response.json();
      } catch {
        data = { Status: response.ok ? 'OK' : 'ERROR' };
      }
      console.log('Start playlist response:', data);
      if (data.Status !== 'OK') throw new Error(data.Message || 'Failed to start playlist');
      alert(`Started playlist: ${name}`);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const stopPlaylist = async () => {
    try {
      const response = await fetch('/api/web/playlists/stop', { method: 'GET' });
      let data;
      try {
        data = await response.json();
      } catch {
        data = { Status: response.ok ? 'OK' : 'ERROR' };
      }
      if (data.Status !== 'OK') throw new Error(data.Message || 'Failed to stop playlist');
      alert('Stopped playlist');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Playlist Control (Admin)</h1>
        <div className="flex items-center space-x-4">
          <span>Welcome, {session?.user.name}</span>
          <button
            onClick={() => signOut()}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Sign Out
          </button>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Scheduled Playlists</h2>
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">Only playlists currently scheduled in FPP are shown.</p>
          <button
            onClick={fetchScheduledPlaylists}
            disabled={isRefreshing}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {error && <p className="text-red-500">Error: {error}</p>}
        <ul className="space-y-2" suppressHydrationWarning>
          {playlists.map((playlist) => (
            <li key={playlist} className="flex justify-between items-center">
              <span>{playlist}</span>
              <button
                onClick={() => startPlaylist(playlist)}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Start
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={stopPlaylist}
          className="bg-red-500 text-white px-4 py-2 rounded mt-4"
        >
          Stop All Playlists
        </button>
      </div>
      <nav className="mt-8">
        <a href="/" className="bg-blue-500 text-white px-4 py-2 rounded mr-4">Dashboard</a>
        <a href="/sequences" className="bg-blue-500 text-white px-4 py-2 rounded mr-4">Sequences</a>
        <a href="/jukebox" className="bg-green-500 text-white px-4 py-2 rounded mr-4">🎵 Jukebox (Public)</a>
        <a href="/admin" className="bg-purple-500 text-white px-4 py-2 rounded">Analytics</a>
      </nav>
    </div>
  );
}
