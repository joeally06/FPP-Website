'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Sequences() {
  const [sequences, setSequences] = useState<string[]>([]);
  const [currentSequence, setCurrentSequence] = useState<string | null>(null);
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

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch status for current sequence
      const statusResponse = await fetch('/api/fppd/status');
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setCurrentSequence(status.current_sequence || null);
      }

      // First, get scheduled playlists
      const scheduleResponse = await fetch('/api/web/schedule');
      if (!scheduleResponse.ok) throw new Error('Failed to fetch schedule');
      const schedule = await scheduleResponse.json();
      
      const playlistNames = new Set<string>();
      schedule.forEach((entry: any) => {
        if (entry.playlist) {
          playlistNames.add(entry.playlist);
        }
      });

      // Then, get sequences from each scheduled playlist
      const sequenceSet = new Set<string>();
      for (const playlistName of playlistNames) {
        try {
          const playlistResponse = await fetch(`/api/web/playlist/${encodeURIComponent(playlistName)}`);
          if (playlistResponse.ok) {
            const playlist = await playlistResponse.json();
            // Extract from leadIn
            if (playlist.leadIn) {
              playlist.leadIn.forEach((item: any) => {
                if (item.sequenceName) {
                  sequenceSet.add(item.sequenceName);
                }
              });
            }
            // Extract from mainPlaylist
            if (playlist.mainPlaylist) {
              playlist.mainPlaylist.forEach((item: any) => {
                if (item.sequenceName) {
                  sequenceSet.add(item.sequenceName);
                }
              });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch playlist ${playlistName}:`, err);
        }
      }

      setSequences(Array.from(sequenceSet));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
      // Auto-refresh current sequence status every 2 seconds for real-time updates
      const interval = setInterval(async () => {
        try {
          const statusResponse = await fetch('/api/fppd/status');
          if (statusResponse.ok) {
            const status = await statusResponse.json();
            setCurrentSequence(status.current_sequence || null);
          }
        } catch (err) {
          console.error('Failed to refresh current sequence:', err);
        }
      }, 2000);
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

  const startSequence = async (name: string) => {
    try {
      const response = await fetch('/api/web/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'Start Sequence',
          args: [name]
        })
      });
      let data;
      try {
        data = await response.json();
      } catch {
        data = { Status: response.ok ? 'OK' : 'ERROR' };
      }
      if (data.Status !== 'OK') throw new Error(data.Message || 'Failed to start sequence');
      alert(`Started sequence: ${name}`);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const stopSequence = async () => {
    try {
      const response = await fetch('/api/web/sequence/current/stop', { method: 'GET' });
      let data;
      try {
        data = await response.json();
      } catch {
        data = { Status: response.ok ? 'OK' : 'ERROR' };
      }
      if (data.Status !== 'OK') throw new Error(data.Message || 'Failed to stop sequence');
      alert('Stopped sequence');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Sequence Control (Admin)</h1>
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
        <h2 className="text-2xl font-semibold mb-4">Scheduled Sequences</h2>
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">Only sequences used in currently scheduled playlists are shown.</p>
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {error && <p className="text-red-500">Error: {error}</p>}
        <ul className="space-y-2" suppressHydrationWarning>
          {sequences.map((sequence) => (
            <li key={sequence} className={`flex justify-between items-center p-2 rounded ${currentSequence === sequence ? 'bg-green-100 border border-green-300' : ''}`}>
              <span>{sequence} {currentSequence === sequence && <span className="text-green-600 font-semibold">(Currently Playing)</span>}</span>
              <button
                onClick={() => startSequence(sequence)}
                className="bg-green-500 text-white px-4 py-2 rounded ml-4"
                disabled={currentSequence === sequence}
              >
                Start
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={stopSequence}
          className="bg-red-500 text-white px-4 py-2 rounded mt-4"
        >
          Stop Current Sequence
        </button>
      </div>
      <nav className="mt-8">
        <a href="/" className="bg-blue-500 text-white px-4 py-2 rounded mr-4">Dashboard</a>
        <a href="/playlists" className="bg-blue-500 text-white px-4 py-2 rounded mr-4">Playlists</a>
        <a href="/jukebox" className="bg-green-500 text-white px-4 py-2 rounded mr-4">🎵 Jukebox (Public)</a>
        <a href="/admin" className="bg-purple-500 text-white px-4 py-2 rounded">Analytics</a>
      </nav>
    </div>
  );
}
