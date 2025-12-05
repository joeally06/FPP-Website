'use client';

import { useState } from 'react';
import { ThumbsUp, Clock, TrendingUp, Music, Play } from 'lucide-react';

interface EnhancedVotingCardProps {
  song: {
    id: number;
    name: string;
    artist?: string;
    album?: string;
    duration?: number;
    votes: number;
    position?: number;
    hasVoted?: boolean;
    playCount?: number;
  };
  onVote: (songId: number) => Promise<void>;
  loading?: boolean;
  compact?: boolean;
}

export default function EnhancedVotingCard({
  song,
  onVote,
  loading = false,
  compact = false
}: EnhancedVotingCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [showThumbsAnimation, setShowThumbsAnimation] = useState(false);

  const handleVote = async () => {
    if (song.hasVoted || isVoting || loading) return;

    setIsVoting(true);
    setShowThumbsAnimation(true);

    try {
      await onVote(song.id);
      
      // Reset animation after delay
      setTimeout(() => {
        setShowThumbsAnimation(false);
        setIsVoting(false);
      }, 1000);
    } catch (error) {
      setIsVoting(false);
      setShowThumbsAnimation(false);
    }
  };

  // Determine if song is "hot" (high votes)
  const isHot = song.votes >= 10;
  const isTrending = song.votes >= 5 && song.votes < 10;

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-3 hover:border-blue-500/50 transition-all duration-300 group">
        <div className="flex items-center justify-between gap-3">
          {/* Position Badge */}
          {song.position && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm">
              {song.position}
            </div>
          )}

          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
              {song.name}
            </h3>
            {song.artist && (
              <p className="text-sm text-gray-400 truncate">{song.artist}</p>
            )}
          </div>

          {/* Vote Button */}
          <button
            onClick={handleVote}
            disabled={song.hasVoted || isVoting || loading}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all duration-300
              ${song.hasVoted
                ? 'bg-green-600/30 text-green-400 cursor-not-allowed'
                : 'bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white hover:scale-110 shadow-lg hover:shadow-blue-500/50'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <ThumbsUp 
              size={18} 
              className={`${song.hasVoted ? 'fill-current' : ''} ${showThumbsAnimation ? 'animate-ping' : ''}`}
            />
            <span className="font-bold">{song.votes}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-linear-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20">
      {/* Trending/Hot Badge */}
      {(isHot || isTrending) && (
        <div className="absolute top-3 right-3 z-10">
          {isHot && (
            <div className="flex items-center gap-1 bg-linear-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
              🔥 HOT
            </div>
          )}
          {isTrending && !isHot && (
            <div className="flex items-center gap-1 bg-linear-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
              <TrendingUp size={12} />
              Trending
            </div>
          )}
        </div>
      )}

      {/* Position Badge */}
      {song.position && (
        <div className="absolute -top-3 -left-3 w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg z-10">
          #{song.position}
        </div>
      )}

      <div className="space-y-4">
        {/* Song Title */}
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
            {song.name}
          </h3>
          
          {/* Artist & Album */}
          {song.artist && (
            <p className="text-gray-400 flex items-center gap-2">
              <Music size={14} className="flex-shrink-0" />
              <span className="truncate">{song.artist}</span>
            </p>
          )}
          {song.album && (
            <p className="text-sm text-gray-500 truncate">
              Album: {song.album}
            </p>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          {song.duration && (
            <div className="flex items-center gap-1">
              <Clock size={14} />
              {formatDuration(song.duration)}
            </div>
          )}
          {song.playCount && song.playCount > 0 && (
            <div className="flex items-center gap-1">
              <Play size={14} />
              {song.playCount} plays
            </div>
          )}
        </div>

        {/* Vote Button - Large */}
        <button
          onClick={handleVote}
          disabled={song.hasVoted || isVoting || loading}
          className={`
            relative w-full py-4 rounded-xl font-bold text-lg transition-all duration-300
            flex items-center justify-center gap-3
            ${song.hasVoted
              ? 'bg-linear-to-r from-green-600/30 to-emerald-600/30 text-green-400 cursor-not-allowed border-2 border-green-500/50'
              : 'bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white hover:scale-[1.02] shadow-lg hover:shadow-blue-500/50 active:scale-[0.98]'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {/* Thumbs Up Animation Overlay */}
          {showThumbsAnimation && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ThumbsUp className="w-16 h-16 fill-current text-blue-500 animate-ping" />
            </div>
          )}

          <ThumbsUp 
            size={24} 
            className={`${song.hasVoted ? 'fill-current' : ''} transition-all duration-300`}
          />
          
          <span className="flex items-center gap-2">
            {song.hasVoted ? (
              <>
                <span>Voted!</span>
                <span className="text-2xl font-bold">{song.votes}</span>
              </>
            ) : (
              <>
                <span>Vote</span>
                {song.votes > 0 && (
                  <span className="text-2xl font-bold">({song.votes})</span>
                )}
              </>
            )}
          </span>
        </button>

        {/* Already Voted Message */}
        {song.hasVoted && (
          <p className="text-center text-sm text-green-400 animate-pulse">
            ✓ You've voted for this song
          </p>
        )}
      </div>

      {/* Glow Effect on Hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-xl bg-linear-to-r from-blue-500/10 to-purple-500/10 blur-xl" />
      </div>
    </div>
  );
}
