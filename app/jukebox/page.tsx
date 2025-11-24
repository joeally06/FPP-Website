'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useVisitorTracking } from '@/hooks/useVisitorTracking';
import { useTheme } from '@/lib/themes/theme-context';
import ThemedJukeboxWrapper from '@/components/ThemedJukeboxWrapper';
import LetterToSantaModal from '@/components/LetterToSantaModal';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import EnhancedVotingCard from '@/components/EnhancedVotingCard';
import JukeboxBanner from '@/components/JukeboxBanner';
import { formatDateTime } from '@/lib/time-utils';
import { LayoutGrid, List, Music, Radio } from 'lucide-react';

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
  cached?: boolean; // Whether data is from cache or direct FPP query
  cache_age_seconds?: number; // Age of cached data in seconds
}

interface SequenceMetadata {
  sequence_name: string; // Now contains sequence names without .fseq extension
  song_title: string;
  artist: string;
  album: string;
  release_year: number | null;
  album_cover_url: string | null;
  spotify_id: string | null;
  spotify_url: string | null; // Spotify external URL for "Listen on Spotify" button
  cached: boolean;
}

interface YouTubeVideo {
  id: number;
  title: string;
  videoId: string;
  description: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  publishedAt: string;
  theme?: string;
  youtubeUrl?: string;
  embedUrl?: string;
}

interface ScheduleStatus {
  isActive: boolean;
  currentPlaylist: string | null;
  status: string;
  message: string;
  nextShowTime: string | null;
  nextShowDate: string | null;
  nextShowDay: string | null;
  nextShowStartTime: string | null;
  nextShowEndTime: string | null;
  countdown: string | null;
  lastChecked: string;
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
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [selectedYouTubeVideo, setSelectedYouTubeVideo] = useState<YouTubeVideo | null>(null);
  const [loadingYouTubeVideos, setLoadingYouTubeVideos] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [jukeboxRateLimit, setJukeboxRateLimit] = useState<number>(3);
  const [requestsRemaining, setRequestsRemaining] = useState<number | null>(null);

  // Re-fetch YouTube videos when theme changes
  useEffect(() => {
    fetchYouTubeVideos();
  }, [theme.id]);

  useEffect(() => {
    fetchAvailableSequences();
    fetchData();
    fetchVotes();
    fetchYouTubeVideos();
    fetchScheduleStatus(); // Check schedule status
    fetchJukeboxSettings(); // Fetch jukebox rate limit and insert mode
    
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    const scheduleInterval = setInterval(fetchScheduleStatus, 30000); // Check every 30 seconds
    
    // Refresh request status every 10 seconds to keep it up to date
    const requestStatusInterval = setInterval(() => {
      if (jukeboxRateLimit > 0) {
        fetchRequestStatus(jukeboxRateLimit);
      }
    }, 10000);
    
    // Background queue processor - check every 10 seconds (runs for everyone)
    const queueProcessorInterval = setInterval(async () => {
      try {
        await fetch('/api/jukebox/process-queue', { method: 'POST' });
      } catch (error) {
        console.error('Queue processor failed:', error);
      }
    }, 10000); // 10 seconds
    
    // Admin-only background operations
    let cacheRefreshInterval: NodeJS.Timeout | undefined;
    
    if (isAdmin) {
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
      clearInterval(scheduleInterval); // Cleanup schedule status check
      clearInterval(requestStatusInterval); // Cleanup request status check
      clearInterval(queueProcessorInterval); // Always cleanup queue processor
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

  const fetchYouTubeVideos = async () => {
    try {
      setLoadingYouTubeVideos(true);
      const response = await fetch('/api/jukebox/videos');
      if (response.ok) {
        const data = await response.json();
        const videos = data.videos || [];
        setYoutubeVideos(videos);
        // Don't auto-select - let user choose which video to play
      }
    } catch (error) {
      console.error('Failed to fetch YouTube videos:', error);
    } finally {
      setLoadingYouTubeVideos(false);
    }
  };

  const fetchScheduleStatus = async () => {
    try {
      const response = await fetch('/api/jukebox/schedule-status');
      if (response.ok) {
        const data = await response.json();
        setScheduleStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch schedule status:', error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const fetchJukeboxSettings = async () => {
    try {
      const response = await fetch('/api/jukebox/settings');
      if (response.ok) {
        const data = await response.json();
        setJukeboxRateLimit(data.rateLimit || 3);
        // Insert mode is used server-side only, visitors don't need to see it
        
        // After getting rate limit, fetch current request status
        await fetchRequestStatus(data.rateLimit || 3);
      }
    } catch (error) {
      console.error('Failed to fetch jukebox settings:', error);
      // Keep defaults on error
    }
  };

  const fetchRequestStatus = async (rateLimit: number) => {
    try {
      // Get user's IP-based request count from the queue
      const response = await fetch('/api/jukebox/request-status');
      if (response.ok) {
        const data = await response.json();
        // Use the requestsRemaining from the API response directly
        // instead of recalculating, to avoid race conditions with rate limit updates
        setRequestsRemaining(data.requestsRemaining);
      }
    } catch (error) {
      console.error('Failed to fetch request status:', error);
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
    setLoadingSequences(true);
    setMessage('');
    
    try {
      console.log('[Jukebox] Fetching available sequences from cache...');
      
      // Always use the public cached sequences endpoint
      const response = await fetch('/api/jukebox/sequences');
      
      if (response.ok) {
        const data = await response.json();
        setAvailableSequences(Array.isArray(data.sequences) ? data.sequences : []);
        
        if (data.sequences.length === 0) {
          setMessage('⚠️ No songs available. Admin needs to refresh the cache.');
        } else {
          console.log(`[Jukebox] Loaded ${data.sequences.length} sequences from cache`);
        }
      } else {
        console.error('[Jukebox] Failed to fetch sequences');
        setAvailableSequences([]);
        setMessage('❌ Failed to load available songs. Please try again.');
      }
    } catch (error) {
      console.error('[Jukebox] Error fetching available sequences:', error);
      setAvailableSequences([]);
      setMessage('❌ Failed to load available songs. Please check your connection.');
    } finally {
      setLoadingSequences(false);
    }
  };

  const refreshSequenceCache = async () => {
    if (!isAdmin) {
      setMessage('⚠️ Only admins can refresh the song cache.');
      return;
    }
    
    setLoadingSequences(true);
    setMessage('🔄 Refreshing sequence cache from FPP...');
    
    try {
      const response = await fetch('/api/jukebox/refresh-cache', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ Cache refreshed! ${data.sequencesCached} sequences loaded.`);
        // Reload sequences from cache
        await fetchAvailableSequences();
      } else {
        const errorMsg = data.details || data.error || 'Failed to refresh cache';
        if (data.error === 'FPP is offline') {
          setMessage('⚠️ FPP is offline. Cannot refresh cache at this time.');
        } else if (data.error === 'FPP server timeout') {
          setMessage('⏱️ FPP server timeout. The server may be offline or busy.');
        } else {
          setMessage(`❌ ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error('[Jukebox] Error refreshing cache:', error);
      setMessage('❌ Network error while refreshing cache.');
    } finally {
      setLoadingSequences(false);
      setTimeout(() => setMessage(''), 5000);
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
        setMessage(data.message || '✅ Song added to queue!');
        
        // Update remaining requests count
        if (typeof data.requestsRemaining === 'number') {
          setRequestsRemaining(data.requestsRemaining);
        }
        
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
        setMessage(data.message || `✅ "${sequenceName}" added to queue!`);
        
        // Update remaining requests count
        if (typeof data.requestsRemaining === 'number') {
          setRequestsRemaining(data.requestsRemaining);
        }
        
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

  // Determine if interactive features should be shown
  const showInteractiveFeatures = scheduleStatus?.isActive || isAdmin;

  // Format time in both standard and military format
  const formatTime = (timeStr: string) => {
    // timeStr is in HH:MM:SS or HH:MM format
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parts[1];
    
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const standardTime = `${hours12}:${minutes} ${period}`;
    
    // Military time (already in 24-hour format)
    const militaryTime = `${String(hours).padStart(2, '0')}:${minutes}`;
    
    return `${standardTime} (${militaryTime})`;
  };

  // Format next show time
  const formatNextShowTime = (isoString: string | null) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    const now = new Date();
    
    // Calculate time until show
    const msUntil = date.getTime() - now.getTime();
    const hoursUntil = Math.floor(msUntil / (1000 * 60 * 60));
    const minutesUntil = Math.floor((msUntil % (1000 * 60 * 60)) / (1000 * 60));
    
    const formattedDate = date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    // Add countdown if less than 24 hours away
    if (hoursUntil < 24 && hoursUntil >= 0) {
      if (hoursUntil > 0) {
        return `${formattedDate} (in ${hoursUntil}h ${minutesUntil}m)`;
      } else if (minutesUntil > 0) {
        return `${formattedDate} (in ${minutesUntil} minutes!)`;
      } else {
        return `${formattedDate} (Starting soon!)`;
      }
    }
    
    return formattedDate;
  };

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

        {/* Unified Banner System */}
        <JukeboxBanner
          fppStatus={currentlyPlaying ? 'playing' : 'idle'}
          isMonitoringActive={scheduleStatus?.isActive || false}
          timeUntilNextShow={scheduleStatus?.countdown || undefined}
        />

        {/* Admin Override Notice - Also Themed */}
        {isAdmin && !scheduleStatus?.isActive && (
          <div className={`backdrop-blur-md ${
            theme.id === 'christmas' 
              ? 'bg-blue-600/20 border-2 border-blue-500/40 shadow-lg shadow-blue-500/20'
              : theme.id === 'halloween'
              ? 'bg-purple-600/20 border-2 border-purple-500/40 shadow-lg shadow-purple-500/20'
              : 'bg-blue-500/20 border-2 border-blue-500/40'
          } rounded-xl shadow-2xl p-4 mb-6`}>
            <p className="text-white text-center text-sm flex items-center justify-center gap-2">
              <span className="text-xl">🔧</span>
              <span className="font-semibold">Admin Mode:</span> 
              <span>Show is inactive but you can still test requests and voting</span>
            </p>
          </div>
        )}

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
              {/* Cache status indicator - only show if using cached data and it's stale */}
              {currentlyPlaying.cached && currentlyPlaying.cache_age_seconds && currentlyPlaying.cache_age_seconds > 30 && (
                <div className="mb-3 px-3 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-lg">
                  <p className="text-yellow-200 text-sm flex items-center gap-2">
                    <span>⚠️</span>
                    <span>
                      Data may be outdated ({currentlyPlaying.cache_age_seconds}s old) - FPP poller may be offline
                    </span>
                  </p>
                </div>
              )}
              
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
                    Started: {formatDateTime(currentlyPlaying.played_at, 'short')}
                  </p>
                </div>
              </div>
              
              {/* Spotify Link Button - Shows for all users when URL is available */}
              {currentMetadata?.spotify_url && (
                <div className="mt-4">
                  <a
                    href={currentMetadata.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`
                      inline-flex items-center justify-center gap-2 w-full
                      px-4 py-3 rounded-lg font-semibold text-white
                      transition-all duration-200 transform hover:scale-105
                      shadow-lg hover:shadow-xl
                      ${theme.id === 'christmas' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-orange-600 hover:bg-orange-700'
                      }
                    `}
                    aria-label="Listen on Spotify"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <span>Listen on Spotify</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
              
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

        {/* Interactive Features - Only show when active or admin */}
        {showInteractiveFeatures && (
          <>
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

            {/* Rate Limit Info */}
            <div className="mb-4 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  <div>
                    <p className="text-white/90 text-sm font-medium">
                      You can request up to <strong className="text-blue-300">{jukeboxRateLimit} {jukeboxRateLimit === 1 ? 'song' : 'songs'} per hour</strong>
                    </p>
                    {requestsRemaining !== null && (
                      <p className="text-white/70 text-xs mt-1">
                        {requestsRemaining > 0 
                          ? `${requestsRemaining} ${requestsRemaining === 1 ? 'request' : 'requests'} remaining` 
                          : 'No requests remaining this hour'}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Show remaining count badge */}
                {requestsRemaining !== null && (
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${requestsRemaining > 0 ? 'text-blue-300' : 'text-red-300'}`}>
                      {requestsRemaining}
                    </div>
                    <p className="text-white/70 text-xs">
                      left
                    </p>
                  </div>
                )}
              </div>
              
              {/* Visual progress bar */}
              {requestsRemaining !== null && (
                <div className="mt-3">
                  <div className="w-full bg-blue-900/30 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        requestsRemaining > 0 ? 'bg-blue-400' : 'bg-red-400'
                      }`}
                      style={{ 
                        width: `${(requestsRemaining / jukeboxRateLimit) * 100}%` 
                      }}
                    />
                  </div>
                </div>
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
                        By: {item.requester_name} • {formatDateTime(item.created_at, 'medium')}
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
          {/* Enhanced Header with Animation */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Radio className="w-8 h-8 text-purple-400 animate-pulse" />
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  🎵 Music Jukebox
                </h2>
                <Music className="w-8 h-8 text-blue-400 animate-bounce" />
              </div>
              <p className="text-lg text-gray-300 font-light ml-11">
                Vote for your favorite songs and help build the perfect playlist! 🎶
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/50'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:scale-105'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/50'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:scale-105'
                }`}
                title="List View"
              >
                <List size={20} />
              </button>
            </div>
          </div>

          <div className={`max-h-[600px] overflow-y-auto ${
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          }`}>
            {availableSequences
              .sort((a, b) => {
                // Sort by votes (descending)
                const votesA = (voteCounts[a]?.upvotes || 0) - (voteCounts[a]?.downvotes || 0);
                const votesB = (voteCounts[b]?.upvotes || 0) - (voteCounts[b]?.downvotes || 0);
                return votesB - votesA;
              })
              .map((sequence, index) => {
                const counts = voteCounts[sequence] || { upvotes: 0, downvotes: 0 };
                const userVote = userVotes[sequence];
                const netVotes = counts.upvotes - counts.downvotes;
                
                return (
                  <EnhancedVotingCard
                    key={sequence}
                    song={{
                      id: index,
                      name: sequence,
                      votes: counts.upvotes,
                      position: index + 1 <= 10 ? index + 1 : undefined,
                      hasVoted: userVote === 'up',
                      playCount: undefined
                    }}
                    onVote={async () => {
                      await handleVote(sequence, 'up');
                    }}
                    loading={loading}
                    compact={viewMode === 'list'}
                  />
                );
              })}
          </div>
          
          {availableSequences.length === 0 && !loadingSequences && (
            <p className="text-white/60 text-center py-8">
              No songs available. Try refreshing the sequence cache.
            </p>
          )}
        </div>
          </>
        )}

        {/* YouTube Videos */}
        {youtubeVideos.length > 0 && (
          <div className={`backdrop-blur-md ${theme.cardBg} rounded-xl shadow-2xl p-6 mt-6 border ${theme.cardBorder}`}>
            <h2 className="text-2xl font-semibold mb-4 text-white themed-font flex items-center gap-2">
              <span className="text-3xl">🎬</span>
              Watch Past Light Shows
            </h2>
            <p className="text-sm text-white/80 mb-4">
              Enjoy videos of previous light shows and holiday displays!
            </p>

            {/* YouTube Player */}
            {selectedYouTubeVideo && (
              <div className="space-y-4">
                <div className="bg-black/50 rounded-lg overflow-hidden aspect-video">
                  <YouTubePlayer
                    videoId={selectedYouTubeVideo.videoId}
                    width="100%"
                    height="100%"
                  />
                </div>

                {/* Video Info */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {selectedYouTubeVideo.title}
                  </h3>
                  {selectedYouTubeVideo.description && (
                    <p className="text-white/80 text-sm mb-2">
                      {selectedYouTubeVideo.description}
                    </p>
                  )}
                  <p className="text-white/60 text-xs">
                    Published {formatDateTime(selectedYouTubeVideo.publishedAt, 'medium')}
                  </p>
                </div>
              </div>
            )}

            {/* Video Thumbnails Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {youtubeVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setSelectedYouTubeVideo(video)}
                  className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedYouTubeVideo?.id === video.id
                      ? 'border-white shadow-lg scale-105'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-24 object-cover"
                    />
                  ) : (
                    <div className="w-full h-24 bg-white/10 flex items-center justify-center">
                      <span className="text-white/60 text-2xl">🎬</span>
                    </div>
                  )}
                  <div className="p-2 bg-white/5">
                    <h4 className="text-xs font-medium text-white truncate">
                      {video.title}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Letter to Santa Modal */}
      <LetterToSantaModal isOpen={showSantaModal} onClose={() => setShowSantaModal(false)} />

      {/* Enhanced Animation Styles */}
      <style jsx>{`
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
        
        h2.bg-gradient-to-r {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </ThemedJukeboxWrapper>
  );
}


