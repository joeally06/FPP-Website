'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getDistanceFromLatLonInMiles } from '../../lib/location';

export default function Sequences() {
  const [sequences, setSequences] = useState<string[]>([]);
  const [currentSequence, setCurrentSequence] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, { upvotes: number; downvotes: number }>>({});
  const [userVotes, setUserVotes] = useState<Record<string, string | null>>({});
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const [locationAllowed, setLocationAllowed] = useState<boolean | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // FPP location coordinates
  const FPP_LAT = 36.47066867976104;
  const FPP_LON = -89.10852792197582;
  const ALLOWED_RADIUS_MILES = 2;
  const fetchVotes = async () => {
    try {
      const response = await fetch('/api/votes');
      if (response.ok) {
        const counts = await response.json();
        setVoteCounts(counts);
      }
    } catch (err) {
      console.error('Failed to fetch votes:', err);
    }
  };

  const fetchUserVotes = async () => {
    try {
      const userVotesMap: Record<string, string | null> = {};
      for (const sequence of sequences) {
        const response = await fetch(`/api/votes?sequence=${encodeURIComponent(sequence)}`);
        if (response.ok) {
          const data = await response.json();
          userVotesMap[sequence] = data.userVote;
        }
      }
      setUserVotes(userVotesMap);
    } catch (err) {
      console.error('Failed to fetch user votes:', err);
    }
  };

  const handleVote = async (sequenceName: string, voteType: 'up' | 'down') => {
    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequenceName, voteType })
      });
      if (response.ok) {
        // Refresh votes after voting
        await fetchVotes();
        await fetchUserVotes();
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

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
    fetchData();
    // Auto-refresh current sequence status every 5 seconds
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
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (sequences.length > 0) {
      fetchVotes();
      fetchUserVotes();
    }
  }, [sequences]);

  useEffect(() => {
    // Check location for standard users (not admins)
    if (!isAdmin && sessionStatus !== 'loading') {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const distance = getDistanceFromLatLonInMiles(FPP_LAT, FPP_LON, latitude, longitude);
            setLocationAllowed(distance <= ALLOWED_RADIUS_MILES);
            if (distance > ALLOWED_RADIUS_MILES) {
              setLocationError(`Access restricted. You are ${distance.toFixed(1)} miles away. Must be within ${ALLOWED_RADIUS_MILES} mile(s) of the light show location.`);
            }
          },
          (error) => {
            setLocationAllowed(false);
            setLocationError('Location access denied or unavailable. Please enable location services and refresh the page.');
          }
        );
      } else {
        setLocationAllowed(false);
        setLocationError('Geolocation is not supported by this browser.');
      }
    } else {
      setLocationAllowed(true); // Admins bypass location check
    }
  }, [isAdmin, sessionStatus]);

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
      <h1 className="text-3xl font-bold mb-8">Sequence Control</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Scheduled Sequences</h2>
        {locationError && !isAdmin && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{locationError}</p>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">Only sequences used in currently scheduled playlists are shown.</p>
          {(locationAllowed || isAdmin) && (
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
        {error && <p className="text-red-500">Error: {error}</p>}
        {(locationAllowed || isAdmin) ? (
          <>
            <ul className="space-y-2" suppressHydrationWarning>
              {sequences.map((sequence) => {
                const counts = voteCounts[sequence] || { upvotes: 0, downvotes: 0 };
                const userVote = userVotes[sequence];
                return (
                  <li key={sequence} className={`flex justify-between items-center p-2 rounded ${currentSequence === sequence ? 'bg-green-100 border border-green-300' : ''}`}>
                    <div className="flex-1">
                      <span>{sequence} {currentSequence === sequence && <span className="text-green-600 font-semibold">(Currently Playing)</span>}</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <button
                          onClick={() => handleVote(sequence, 'up')}
                          className={`px-2 py-1 rounded text-sm ${userVote === 'up' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                        >
                          👍 {counts.upvotes}
                        </button>
                        <button
                          onClick={() => handleVote(sequence, 'down')}
                          className={`px-2 py-1 rounded text-sm ${userVote === 'down' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
                        >
                          👎 {counts.downvotes}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => startSequence(sequence)}
                      className="bg-green-500 text-white px-4 py-2 rounded ml-4"
                      disabled={currentSequence === sequence}
                    >
                      Start
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={stopSequence}
              className="bg-red-500 text-white px-4 py-2 rounded mt-4"
            >
              Stop Current Sequence
            </button>
          </>
        ) : locationAllowed === false ? (
          <p className="text-gray-500">Access restricted due to location.</p>
        ) : (
          <p>Checking location...</p>
        )}
      </div>
      <nav className="mt-8">
        <a href="/" className="bg-blue-500 text-white px-4 py-2 rounded mr-4">Dashboard</a>
        <a href="/playlists" className="bg-blue-500 text-white px-4 py-2 rounded">Playlists</a>
      </nav>
    </div>
  );
}
