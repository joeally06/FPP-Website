'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getDistanceFromLatLonInMiles } from '../../lib/location';

export default function Playlists() {
  const [playlists, setPlaylists] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const [locationAllowed, setLocationAllowed] = useState<boolean | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // FPP location coordinates
  const FPP_LAT = 36.47066867976104;
  const FPP_LON = -89.10852792197582;
  const ALLOWED_RADIUS_MILES = 2;

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
    fetchScheduledPlaylists();
  }, []);

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
      <h1 className="text-3xl font-bold mb-8">Playlist Control</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Scheduled Playlists</h2>
        {locationError && !isAdmin && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{locationError}</p>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">Only playlists currently scheduled in FPP are shown.</p>
          {(locationAllowed || isAdmin) && (
            <button
              onClick={fetchScheduledPlaylists}
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
          </>
        ) : locationAllowed === false ? (
          <p className="text-gray-500">Access restricted due to location.</p>
        ) : (
          <p>Checking location...</p>
        )}
      </div>
      <nav className="mt-8">
        <a href="/" className="bg-blue-500 text-white px-4 py-2 rounded mr-4">Dashboard</a>
        <a href="/sequences" className="bg-blue-500 text-white px-4 py-2 rounded">Sequences</a>
      </nav>
    </div>
  );
}
