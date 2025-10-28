'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { signIn, signOut } from 'next-auth/react';
import { getDistanceFromLatLonInMiles } from '../lib/location';

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
  const [locationAllowed, setLocationAllowed] = useState<boolean | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // FPP location coordinates
  const FPP_LAT = 36.47066867976104;
  const FPP_LON = -89.10852792197582;
  const ALLOWED_RADIUS_MILES = 2; // 2 mile radius

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

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">FPP Light Show Control</h1>
        <div>
          {sessionStatus === 'loading' ? (
            <span>Loading...</span>
          ) : session ? (
            <div className="flex items-center space-x-4">
              <span>Welcome, {session.user.name} ({session.user.role})</span>
              <button
                onClick={() => signOut()}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Admin Sign In
            </button>
          )}
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
        {locationError && !isAdmin && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{locationError}</p>
          </div>
        )}
        {error && <p className="text-red-500">Error: {error}</p>}
        {(locationAllowed || isAdmin) ? (
          status ? (
            <div className="space-y-4" suppressHydrationWarning>
              <p><strong>Status:</strong> {status.status_name}</p>
              <p><strong>Mode:</strong> {status.mode_name}</p>
              <p><strong>Current Playlist:</strong> {status.current_playlist.playlist || 'None'}</p>
              <p><strong>Current Sequence:</strong> {status.current_sequence || 'None'}</p>
              {isAdmin && (
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
              )}
            </div>
          ) : (
            <p>Loading...</p>
          )
        ) : locationAllowed === false ? (
          <p className="text-gray-500">Access restricted due to location.</p>
        ) : (
          <p>Checking location...</p>
        )}
      </div>
      <nav className="mt-8">
        <a href="/playlists" className="bg-blue-500 text-white px-4 py-2 rounded mr-4">Playlists</a>
        <a href="/sequences" className="bg-blue-500 text-white px-4 py-2 rounded mr-4">Sequences</a>
        {isAdmin && (
          <a href="/admin" className="bg-purple-500 text-white px-4 py-2 rounded">Admin Analytics</a>
        )}
      </nav>
    </div>
  );
}
