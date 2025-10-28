'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface QueueItem {
  id: number;
  sequence_name: string;
  requester_name: string;
  status: string;
  created_at: string;
  priority: number;
}

interface PopularSequence {
  sequence_name: string;
  total_requests: number;
  upvotes: number;
  downvotes: number;
  popularity_score: number;
}

interface CurrentlyPlaying {
  id: number;
  sequence_name: string;
  requester_name: string;
  played_at: string;
}

export default function JukeboxPage() {
  const { data: session } = useSession();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [popularSequences, setPopularSequences] = useState<PopularSequence[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | null>(null);
  const [newRequest, setNewRequest] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [queueRes, popularRes, statusRes] = await Promise.all([
        fetch('/api/jukebox/queue'),
        fetch('/api/jukebox/popular'),
        fetch('/api/jukebox/status')
      ]);

      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueue(queueData);
      }

      if (popularRes.ok) {
        const popularData = await popularRes.json();
        setPopularSequences(popularData);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setCurrentlyPlaying(statusData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/jukebox/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sequence_name: newRequest.trim(),
          requester_name: requesterName.trim() || undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ Sequence added to queue!');
        setNewRequest('');
        fetchData(); // Refresh the queue
      } else {
        setMessage(`❌ ${data.error || 'Failed to add sequence'}`);
      }
    } catch (error) {
      setMessage('❌ Error submitting request');
    } finally {
      setLoading(false);
    }
  };

  const requestPopularSequence = async (sequenceName: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/jukebox/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sequence_name: sequenceName,
          requester_name: requesterName.trim() || undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ "${sequenceName}" added to queue!`);
        fetchData();
      } else {
        setMessage(`❌ ${data.error || 'Failed to add sequence'}`);
      }
    } catch (error) {
      setMessage('❌ Error submitting request');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch('/api/jukebox/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎵 Light Show Jukebox</h1>
          <p className="text-gray-600">Request your favorite sequences and see what's playing!</p>
        </div>

        {/* Currently Playing */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            🎶 Now Playing
          </h2>
          {currentlyPlaying ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-xl font-semibold text-green-800">{currentlyPlaying.sequence_name}</h3>
              <p className="text-green-600">Requested by: {currentlyPlaying.requester_name}</p>
              <p className="text-sm text-green-500">Started: {new Date(currentlyPlaying.played_at).toLocaleTimeString()}</p>
              {session?.user?.role === 'admin' && (
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => updateStatus(currentlyPlaying.id, 'completed')}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                  >
                    Mark Complete
                  </button>
                  <button
                    onClick={() => updateStatus(currentlyPlaying.id, 'skipped')}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                  >
                    Skip
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-500">No sequence currently playing</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">🎯 Request a Sequence</h2>
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sequence Name *
                </label>
                <input
                  type="text"
                  value={newRequest}
                  onChange={(e) => setNewRequest(e.target.value)}
                  placeholder="Enter sequence name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add to Queue'}
              </button>
            </form>
            {message && (
              <div className="mt-4 p-3 rounded-md bg-gray-50 border">
                <p className="text-sm">{message}</p>
              </div>
            )}
          </div>

          {/* Popular Sequences */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">🔥 Popular Sequences</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {popularSequences.map((seq) => (
                <div key={seq.sequence_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">{seq.sequence_name}</h3>
                    <div className="text-sm text-gray-600 flex space-x-4">
                      <span>👍 {seq.upvotes}</span>
                      <span>👎 {seq.downvotes}</span>
                      <span>🎵 {seq.total_requests} requests</span>
                    </div>
                  </div>
                  <button
                    onClick={() => requestPopularSequence(seq.sequence_name)}
                    disabled={loading}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                  >
                    Request
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Queue */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-2xl font-semibold mb-4">📋 Queue ({queue.length} items)</h2>
          {queue.length > 0 ? (
            <div className="space-y-2">
              {queue.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                      #{index + 1}
                    </span>
                    <div>
                      <h3 className="font-medium">{item.sequence_name}</h3>
                      <p className="text-sm text-gray-600">
                        By: {item.requester_name} • {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {session?.user?.role === 'admin' && (
                    <div className="space-x-2">
                      <button
                        onClick={() => updateStatus(item.id, 'playing')}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Play Now
                      </button>
                      <button
                        onClick={() => updateStatus(item.id, 'skipped')}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No sequences in queue. Be the first to request one!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
