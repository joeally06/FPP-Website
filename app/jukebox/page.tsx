'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface QueueItem {
  id: number;
  sequence_name: string; // Now contains sequence names without .fseq extension
  requester_name: string;
  status: string;
  created_at: string;
  priority: number;
}

interface PopularSequence {
  sequence_name: string; // Now contains sequence names without .fseq extension
  total_requests: number;
  upvotes: number;
  downvotes: number;
  popularity_score: number;
}

interface VoteCounts {
  upvotes: number;
  downvotes: number;
}

interface CurrentlyPlaying {
  id: number;
  sequence_name: string; // Original sequence name without .fseq extension
  media_name?: string; // MP3/media filename for Spotify matching
  requester_name: string;
  played_at: string;
}

interface SequenceMetadata {
  sequence_name: string; // Now contains sequence names without .fseq extension
  song_title: string;
  artist: string;
  album: string;
  release_year: number | null;
  album_cover_url: string | null;
  spotify_id: string | null;
  cached: boolean;
}

export default function JukeboxPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [popularSequences, setPopularSequences] = useState<PopularSequence[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | null>(null);
  const [currentMetadata, setCurrentMetadata] = useState<SequenceMetadata | null>(null);
  const [availableSequences, setAvailableSequences] = useState<string[]>([]);
  const [newRequest, setNewRequest] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [loadingSequences, setLoadingSequences] = useState(true);
  const [voteCounts, setVoteCounts] = useState<Record<string, VoteCounts>>({});
  const [userVotes, setUserVotes] = useState<Record<string, string | null>>({});

  useEffect(() => {
    fetchAvailableSequences();
    fetchData();
    fetchVotes();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    
    // Queue processor - check every 10 seconds
    const queueProcessorInterval = setInterval(async () => {
      try {
        await fetch('/api/jukebox/process-queue', { method: 'POST' });
      } catch (error) {
        console.error('Queue processor failed:', error);
      }
    }, 10000); // 10 seconds
    
    // Background cache refresh every 10 minutes
    const cacheRefreshInterval = setInterval(async () => {
      try {
        await fetch('/api/jukebox/refresh-cache', { method: 'POST' });
      } catch (error) {
        console.error('Background cache refresh failed:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => {
      clearInterval(interval);
      clearInterval(queueProcessorInterval);
      clearInterval(cacheRefreshInterval);
    };
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
      for (const sequence of availableSequences) {
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

  // Fetch user votes when sequences are available
  useEffect(() => {
    if (availableSequences.length > 0) {
      fetchUserVotes();
    }
  }, [availableSequences]);

  const fetchAvailableSequences = async () => {
    try {
      setLoadingSequences(true);
      
      // Try to get cached media files first
      const cacheResponse = await fetch('/api/jukebox/sequences');
      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json();
        
        // Check if cache is recent (within 10 minutes)
        if (cacheData.lastUpdated) {
          const cacheAge = Date.now() - new Date(cacheData.lastUpdated).getTime();
          const tenMinutes = 10 * 60 * 1000;
          
          if (cacheAge < tenMinutes && cacheData.sequences.length > 0) {
            setAvailableSequences(cacheData.sequences);
            setLoadingSequences(false);
            return;
          }
        }
      }
      
      // If no cache or cache is stale, refresh it
      await refreshSequenceCache();
    } catch (error) {
      console.error('Error fetching available sequences:', error);
      setMessage('❌ Failed to load available songs. Please check FPP connection and try refreshing.');
      setLoadingSequences(false);
    }
  };

  const refreshSequenceCache = async () => {
    try {
      const refreshResponse = await fetch('/api/jukebox/refresh-cache', {
        method: 'POST'
      });
      
      const refreshData = await refreshResponse.json();
      
      if (refreshResponse.ok) {
        setAvailableSequences(refreshData.sequences);
        setMessage(`✅ Cache refreshed with ${refreshData.sequencesCached} sequences`);
        setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
      } else {
        // Show specific error message from API
        setMessage(`❌ ${refreshData.error || 'Failed to refresh sequence cache'}`);
      }
    } catch (error) {
      console.error('Error refreshing sequence cache:', error);
      setMessage('❌ Network error while refreshing cache. Please check your connection.');
    } finally {
      setLoadingSequences(false);
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
        setMessage('✅ Song added to queue!');
        setNewRequest('');
        fetchData(); // Refresh the queue
      } else {
        setMessage(`❌ ${data.error || 'Failed to add song'}`);
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

  const fetchMetadata = async (sequenceName: string) => {
    try {
      const response = await fetch(`/api/jukebox/metadata?sequence=${encodeURIComponent(sequenceName)}`);
      if (response.ok) {
        const metadata = await response.json();
        setCurrentMetadata(metadata);
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setCurrentMetadata(null);
    }
  };

  useEffect(() => {
    if (currentlyPlaying?.media_name) {
      fetchMetadata(currentlyPlaying.media_name);
    } else if (currentlyPlaying?.sequence_name) {
      // Fallback to sequence name if media name not available
      fetchMetadata(currentlyPlaying.sequence_name);
    } else {
      setCurrentMetadata(null);
    }
  }, [currentlyPlaying?.media_name, currentlyPlaying?.sequence_name]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Admin Login */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🎵 Light Show Jukebox</h1>
            <p className="text-gray-600">Request your favorite songs and see what's playing!</p>
          </div>
          <div className="ml-4">
            {!session ? (
              <button
                onClick={() => signIn()}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition shadow-md"
              >
                🔐 Admin Login
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <span className="text-gray-700 font-medium">Welcome, {session.user?.name}</span>
                {isAdmin && (
                  <button
                    onClick={() => router.push('/')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
                  >
                    📊 Dashboard
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Currently Playing */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            🎶 Now Playing
          </h2>
          {currentlyPlaying ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-4">
                {currentMetadata?.album_cover_url ? (
                  <img
                    src={currentMetadata.album_cover_url}
                    alt={`${currentMetadata.album} cover`}
                    className="w-24 h-24 rounded-lg object-cover shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500 text-2xl">🎵</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-green-800 mb-1">
                    {currentMetadata?.song_title || currentlyPlaying.media_name || currentlyPlaying.sequence_name}
                  </h3>
                  {currentMetadata && (
                    <div className="text-green-700 space-y-1">
                      <p><strong>Artist:</strong> {currentMetadata.artist}</p>
                      <p><strong>Album:</strong> {currentMetadata.album}</p>
                      {currentMetadata.release_year && (
                        <p><strong>Year:</strong> {currentMetadata.release_year}</p>
                      )}
                    </div>
                  )}
                  <p className="text-green-600 mt-2">
                    Requested by: {currentlyPlaying.requester_name}
                  </p>
                  <p className="text-sm text-green-500">
                    Started: {new Date(currentlyPlaying.played_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {session?.user?.role === 'admin' && currentlyPlaying.id && (
                <div className="mt-4 space-x-2">
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">🎯 Request a Song</h2>
              <button
                onClick={refreshSequenceCache}
                disabled={loadingSequences}
                className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 disabled:opacity-50"
              >
                {loadingSequences ? 'Loading...' : '🔄 Refresh'}
              </button>
            </div>
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
                  Song Name *
                </label>
                {loadingSequences ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <span className="text-gray-500">Loading sequences...</span>
                  </div>
                ) : (
                  <select
                    value={newRequest}
                    onChange={(e) => setNewRequest(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a song...</option>
                    {availableSequences.map((sequence) => (
                      <option key={sequence} value={sequence}>
                        {sequence}
                      </option>
                    ))}
                  </select>
                )}
                {availableSequences.length === 0 && !loadingSequences && (
                  <p className="text-sm text-gray-500 mt-1">
                    No songs available. Make sure playlists are scheduled in FPP and try refreshing.
                  </p>
                )}
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
            <h2 className="text-2xl font-semibold mb-4">🔥 Popular Songs</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {popularSequences
                .filter(seq => availableSequences.includes(seq.sequence_name))
                .map((seq) => {
                  const counts = voteCounts[seq.sequence_name] || { upvotes: 0, downvotes: 0 };
                  const userVote = userVotes[seq.sequence_name];
                  return (
                    <div key={seq.sequence_name} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium flex-1">{seq.sequence_name}</h3>
                        <button
                          onClick={() => requestPopularSequence(seq.sequence_name)}
                          disabled={loading}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                        >
                          Request
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleVote(seq.sequence_name, 'up')}
                          className={`px-2 py-1 rounded text-sm ${userVote === 'up' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                          👍 {counts.upvotes}
                        </button>
                        <button
                          onClick={() => handleVote(seq.sequence_name, 'down')}
                          className={`px-2 py-1 rounded text-sm ${userVote === 'down' ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                          👎 {counts.downvotes}
                        </button>
                        <span className="text-sm text-gray-600">🎵 {seq.total_requests} requests</span>
                      </div>
                    </div>
                  );
                })}
              {popularSequences.filter(seq => availableSequences.includes(seq.sequence_name)).length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No popular sequences available from current schedule.
                </p>
              )}
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
              <p>No songs in queue. Be the first to request one!</p>
            </div>
          )}
        </div>

        {/* All Available Songs with Voting */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-2xl font-semibold mb-4">🎵 All Available Songs - Vote for Your Favorites!</h2>
          <p className="text-sm text-gray-600 mb-4">
            Help us know what songs you love! Your votes help determine which songs appear in the popular list.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {availableSequences.map((sequence) => {
              const counts = voteCounts[sequence] || { upvotes: 0, downvotes: 0 };
              const userVote = userVotes[sequence];
              return (
                <div key={sequence} className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2 text-sm">{sequence}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleVote(sequence, 'up')}
                      className={`flex-1 px-2 py-1 rounded text-sm ${userVote === 'up' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                      👍 {counts.upvotes}
                    </button>
                    <button
                      onClick={() => handleVote(sequence, 'down')}
                      className={`flex-1 px-2 py-1 rounded text-sm ${userVote === 'down' ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                      👎 {counts.downvotes}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {availableSequences.length === 0 && !loadingSequences && (
            <p className="text-gray-500 text-center py-4">
              No songs available. Try refreshing the sequence cache.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
