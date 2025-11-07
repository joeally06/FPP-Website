'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useVisitorTracking } from '@/hooks/useVisitorTracking';
import { useTheme } from '@/lib/themes/theme-context';
import ThemedJukeboxWrapper from '@/components/ThemedJukeboxWrapper';
import LetterToSantaModal from '@/components/LetterToSantaModal';

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
  // Track visitor engagement
  useVisitorTracking('/jukebox');
  
  const { data: session } = useSession();
  const { theme } = useTheme();
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
  const [showSantaModal, setShowSantaModal] = useState(false);
  const isChristmasTheme = theme.id === 'christmas';

  useEffect(() => {
    fetchAvailableSequences();
    fetchData();
    fetchVotes();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    
    // Admin-only background operations
    let queueProcessorInterval: NodeJS.Timeout | undefined;
    let cacheRefreshInterval: NodeJS.Timeout | undefined;
    
    if (isAdmin) {
      // Queue processor - check every 10 seconds (admin only)
      queueProcessorInterval = setInterval(async () => {
        try {
          await fetch('/api/jukebox/process-queue', { method: 'POST' });
        } catch (error) {
          console.error('Queue processor failed:', error);
        }
      }, 10000); // 10 seconds
      
      // Background cache refresh every 10 minutes (admin only)
      cacheRefreshInterval = setInterval(async () => {
        try {
          const response = await fetch('/api/jukebox/refresh-cache', { method: 'POST' });
          const data = await response.json();
          
          if (data.success) {
            console.log(`[Jukebox] Background cache refresh: ${data.sequencesCached} sequences cached`);
          } else {
            // Only log if not offline (reduce console spam)
            if (data.error !== 'FPP is offline') {
              console.warn('[Jukebox] Background cache refresh failed:', data.error);
            }
          }
        } catch (error) {
          // Silently fail for background refreshes to avoid console spam
          // Only log if it's not a timeout/abort error
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Background cache refresh failed:', error);
          }
        }
      }, 10 * 60 * 1000); // 10 minutes
    }
    
    return () => {
      clearInterval(interval);
      if (queueProcessorInterval) clearInterval(queueProcessorInterval);
      if (cacheRefreshInterval) clearInterval(cacheRefreshInterval);
    };
  }, [isAdmin]);

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
    setLoadingSequences(true);
    setMessage('🔄 Refreshing sequence cache...');
    
    try {
      const refreshResponse = await fetch('/api/jukebox/refresh-cache', {
        method: 'POST'
      });
      
      const refreshData = await refreshResponse.json();
      
      if (refreshData.success) {
        setAvailableSequences(refreshData.sequences);
        setMessage(`✅ Cache refreshed with ${refreshData.sequencesCached} sequences`);
        setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
      } else {
        // Show specific error message from API
        const errorMsg = refreshData.details || refreshData.error || 'Failed to refresh sequence cache';
        
        if (refreshData.error === 'FPP is offline') {
          setMessage('⚠️ FPP is offline. Cannot refresh cache at this time.');
        } else if (refreshData.error === 'FPP server timeout') {
          setMessage('⏱️ FPP server timeout. The server may be offline or busy.');
        } else {
          setMessage(`❌ ${errorMsg}`);
        }
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
    <ThemedJukeboxWrapper>
      <div className="max-w-6xl mx-auto">
        {/* Header with Admin Login */}
        <div className="mb-6">
          {/* Title - Full width on mobile */}
          <div className="text-center mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 themed-font flex items-center justify-center gap-2 md:gap-3">
              <span className="text-4xl md:text-5xl">{theme.icons.nowPlaying}</span>
              <span className="break-words">Light Show Jukebox</span>
            </h1>
            <p className="text-white/80 text-sm md:text-base px-4">Request your favorite songs and see what's playing!</p>
          </div>
          
          {/* Admin Controls - Centered on mobile, right-aligned on desktop */}
          <div className="flex justify-center lg:justify-end">
            {!session ? (
              <button
                onClick={() => signIn()}
                className={`bg-${theme.primaryColor}/80 hover:bg-${theme.primaryColor} text-white px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition shadow-lg backdrop-blur-sm text-sm md:text-base`}
              >
                🔐 Admin Login
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <span className="text-white font-medium text-sm md:text-base">Welcome, {session.user?.name}</span>
                {isAdmin && (
                  <button
                    onClick={() => router.push('/')}
                    className="bg-blue-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md text-sm md:text-base whitespace-nowrap"
                  >
                    📊 Dashboard
                  </button>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: '/jukebox' })}
                  className={`bg-${theme.secondaryColor}/80 hover:bg-${theme.secondaryColor} text-white px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition shadow-lg backdrop-blur-sm text-sm md:text-base whitespace-nowrap`}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Write to Santa Button (Christmas theme only) */}
        {isChristmasTheme && (
          <div className={`backdrop-blur-md ${theme.cardBg} rounded-xl shadow-2xl p-6 mb-6 border ${theme.cardBorder}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2 themed-font flex items-center gap-2">
                  🎅 Write a Letter to Santa! 🎄
                </h3>
                <p className="text-white/80 text-sm">
                  Send your Christmas wishes to the North Pole and receive a magical reply from Santa himself!
                </p>
              </div>
              <button
                onClick={() => setShowSantaModal(true)}
                className="bg-gradient-to-r from-red-600 to-green-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:shadow-2xl transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                ✉️ Write to Santa! ✉️
              </button>
            </div>
          </div>
        )}

        {/* Currently Playing */}
        <div className={`backdrop-blur-md ${theme.cardBg} rounded-xl shadow-2xl p-6 mb-6 border ${theme.cardBorder}`}>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-white themed-font">
            <span className="text-3xl">{theme.icons.nowPlaying}</span>
            Now Playing
          </h2>
          {currentlyPlaying ? (
            <div className={`bg-gradient-to-r from-${theme.primaryColor}/20 to-${theme.secondaryColor}/20 border-2 border-${theme.primaryColor}/40 rounded-xl p-4 backdrop-blur-sm`}>
              <div className="flex items-start space-x-4">
                {currentMetadata?.album_cover_url ? (
                  <img
                    src={currentMetadata.album_cover_url}
                    alt={`${currentMetadata.album} cover`}
                    className="w-24 h-24 rounded-lg object-cover shadow-md ring-2 ring-white/30"
                  />
                ) : (
                  <div className={`w-24 h-24 bg-${theme.primaryColor}/30 rounded-lg flex items-center justify-center backdrop-blur-sm`}>
                    <span className="text-white text-3xl">{theme.icons.nowPlaying}</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {currentMetadata?.song_title || currentlyPlaying.media_name || currentlyPlaying.sequence_name}
                  </h3>
                  {currentMetadata && (
                    <div className="text-white/90 space-y-1 text-sm">
                      <p><strong>Artist:</strong> {currentMetadata.artist}</p>
                      <p><strong>Album:</strong> {currentMetadata.album}</p>
                      {currentMetadata.release_year && (
                        <p><strong>Year:</strong> {currentMetadata.release_year}</p>
                      )}
                    </div>
                  )}
                  <p className="text-white/80 mt-2 text-sm">
                    Requested by: {currentlyPlaying.requester_name}
                  </p>
                  <p className="text-sm text-white/70 flex items-center gap-1">
                    <span>{theme.icons.time}</span>
                    Started: {new Date(currentlyPlaying.played_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {session?.user?.role === 'admin' && currentlyPlaying.id && (
                <div className="mt-4 space-x-2">
                  <button
                    onClick={() => updateStatus(currentlyPlaying.id, 'completed')}
                    className={`bg-green-500/80 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur-sm transition-all`}
                  >
                    ✓ Mark Complete
                  </button>
                  <button
                    onClick={() => updateStatus(currentlyPlaying.id, 'skipped')}
                    className={`bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur-sm transition-all`}
                  >
                    ⏭️ Skip
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/60">No sequence currently playing</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Form */}
          <div className={`backdrop-blur-md ${theme.cardBg} rounded-xl shadow-2xl p-6 border ${theme.cardBorder}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-white themed-font flex items-center gap-2">
                <span className="text-3xl">{theme.icons.queue}</span>
                Request a Song
              </h2>
              {isAdmin && (
                <button
                  onClick={refreshSequenceCache}
                  disabled={loadingSequences}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingSequences ? 'Loading...' : '🔄 Refresh'}
                </button>
              )}
            </div>
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Song Name *
                </label>
                {loadingSequences ? (
                  <div className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg backdrop-blur-sm">
                    <span className="text-white/60">Loading sequences...</span>
                  </div>
                ) : (
                  <select
                    value={newRequest}
                    onChange={(e) => setNewRequest(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm"
                  >
                    <option value="" className="bg-gray-800">Select a song...</option>
                    {availableSequences.map((sequence) => (
                      <option key={sequence} value={sequence} className="bg-gray-800">
                        {sequence}
                      </option>
                    ))}
                  </select>
                )}
                {availableSequences.length === 0 && !loadingSequences && (
                  <p className="text-sm text-white/60 mt-1">
                    No songs available. Make sure playlists are scheduled in FPP and try refreshing.
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-gradient-to-r from-${theme.primaryColor} to-${theme.secondaryColor} text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg backdrop-blur-sm`}
              >
                {loading ? 'Adding...' : '✓ Add to Queue'}
              </button>
            </form>
            {message && (
              <div className="mt-4 p-4 rounded-lg bg-white/10 border border-white/20 backdrop-blur-sm">
                <p className="text-sm text-white">{message}</p>
              </div>
            )}
          </div>

          {/* Popular Sequences */}
          <div className={`backdrop-blur-md ${theme.cardBg} rounded-xl shadow-2xl p-6 border ${theme.cardBorder}`}>
            <h2 className="text-2xl font-semibold mb-4 text-white themed-font flex items-center gap-2">
              <span className="text-3xl">{theme.icons.popular}</span>
              Popular Songs
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {popularSequences
                .filter(seq => availableSequences.includes(seq.sequence_name))
                .map((seq) => {
                  const counts = voteCounts[seq.sequence_name] || { upvotes: 0, downvotes: 0 };
                  const userVote = userVotes[seq.sequence_name];
                  return (
                    <div key={seq.sequence_name} className="p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex-1 text-white">{seq.sequence_name}</h3>
                        <button
                          onClick={() => requestPopularSequence(seq.sequence_name)}
                          disabled={loading}
                          className={`bg-gradient-to-r from-${theme.primaryColor} to-${theme.secondaryColor} text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md backdrop-blur-sm`}
                        >
                          + Request
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleVote(seq.sequence_name, 'up')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${userVote === 'up' ? 'bg-green-500 text-white shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                          👍 {counts.upvotes}
                        </button>
                        <button
                          onClick={() => handleVote(seq.sequence_name, 'down')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${userVote === 'down' ? 'bg-red-500 text-white shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                          👎 {counts.downvotes}
                        </button>
                        <span className="text-sm text-white/70 flex items-center gap-1">
                          <span>{theme.icons.nowPlaying}</span>
                          {seq.total_requests} requests
                        </span>
                      </div>
                    </div>
                  );
                })}
              {popularSequences.filter(seq => availableSequences.includes(seq.sequence_name)).length === 0 && (
                <p className="text-white/60 text-center py-4">
                  No popular sequences available from current schedule.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Queue */}
        <div className={`backdrop-blur-md ${theme.cardBg} rounded-xl shadow-2xl p-6 mt-6 border ${theme.cardBorder}`}>
          <h2 className="text-2xl font-semibold mb-4 text-white themed-font flex items-center gap-2">
            <span className="text-3xl">{theme.icons.queue}</span>
            Queue ({queue.length} items)
          </h2>
          {queue.length > 0 ? (
            <div className="space-y-3">
              {queue.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
                  <div className="flex items-center space-x-4">
                    <span className={`bg-gradient-to-r from-${theme.primaryColor} to-${theme.secondaryColor} text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md`}>
                      #{index + 1}
                    </span>
                    <div>
                      <h3 className="font-medium text-white">{item.sequence_name}</h3>
                      <p className="text-sm text-white/70 flex items-center gap-1">
                        <span>{theme.icons.time}</span>
                        By: {item.requester_name} • {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {session?.user?.role === 'admin' && (
                    <div className="space-x-2">
                      <button
                        onClick={() => updateStatus(item.id, 'playing')}
                        className="bg-blue-500/80 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur-sm transition-all"
                      >
                        ▶️ Play Now
                      </button>
                      <button
                        onClick={() => updateStatus(item.id, 'skipped')}
                        className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur-sm transition-all"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-white/60 py-8">
              <p>No songs in queue. Be the first to request one!</p>
            </div>
          )}
        </div>

        {/* All Available Songs with Voting */}
        <div className={`backdrop-blur-md ${theme.cardBg} rounded-xl shadow-2xl p-6 mt-6 border ${theme.cardBorder}`}>
          <h2 className="text-2xl font-semibold mb-4 text-white themed-font flex items-center gap-2">
            <span className="text-3xl">{theme.icons.vote}</span>
            All Available Songs - Vote for Your Favorites!
          </h2>
          <p className="text-sm text-white/80 mb-4">
            Help us know what songs you love! Your votes help determine which songs appear in the popular list.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {availableSequences.map((sequence) => {
              const counts = voteCounts[sequence] || { upvotes: 0, downvotes: 0 };
              const userVote = userVotes[sequence];
              return (
                <div key={sequence} className="p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
                  <h3 className="font-medium mb-3 text-sm text-white">{sequence}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleVote(sequence, 'up')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${userVote === 'up' ? 'bg-green-500 text-white shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                      👍 {counts.upvotes}
                    </button>
                    <button
                      onClick={() => handleVote(sequence, 'down')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${userVote === 'down' ? 'bg-red-500 text-white shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                      👎 {counts.downvotes}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {availableSequences.length === 0 && !loadingSequences && (
            <p className="text-white/60 text-center py-4">
              No songs available. Try refreshing the sequence cache.
            </p>
          )}
        </div>
      </div>

      {/* Letter to Santa Modal */}
      <LetterToSantaModal isOpen={showSantaModal} onClose={() => setShowSantaModal(false)} />
    </ThemedJukeboxWrapper>
  );
}
