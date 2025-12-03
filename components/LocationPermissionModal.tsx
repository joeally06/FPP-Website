'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/themes/theme-context';
import { getBrowserLocation, UserLocation } from '@/lib/location-utils';

interface LocationPermissionModalProps {
  onLocationGranted: (location: UserLocation) => void;
  onLocationDenied: () => void;
  onSkip: () => void;
}

export default function LocationPermissionModal({ 
  onLocationGranted, 
  onLocationDenied,
  onSkip 
}: LocationPermissionModalProps) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has already responded (stored in sessionStorage)
    const hasRespondedBefore = sessionStorage.getItem('location-permission-requested');
    
    if (!hasRespondedBefore) {
      // Show modal after 1 second delay (let page load first)
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleAllow = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    
    try {
      const location = await getBrowserLocation();
      sessionStorage.setItem('location-permission-requested', 'granted');
      sessionStorage.setItem('user-location', JSON.stringify(location));
      setIsVisible(false);
      onLocationGranted(location);
    } catch (error: any) {
      console.error('[Location] Permission denied:', error);
      // Show error but keep modal open so user can try again or see instructions
      setErrorMessage(error.message || 'Location permission was denied');
      // Don't set denied status yet - let user try again or manually deny
    } finally {
      setIsChecking(false);
    }
  };

  const handleDeny = () => {
    sessionStorage.setItem('location-permission-requested', 'denied');
    setIsVisible(false);
    onLocationDenied();
  };

  const handleSkip = () => {
    sessionStorage.setItem('location-permission-requested', 'skipped');
    setIsVisible(false);
    onSkip();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div 
        className={`
          max-w-lg w-full rounded-2xl shadow-2xl border-2 overflow-hidden
          ${theme.id === 'christmas' 
            ? 'bg-gradient-to-br from-red-900/95 to-green-900/95 border-yellow-400' 
            : theme.id === 'halloween'
            ? 'bg-gradient-to-br from-purple-900/95 to-orange-900/95 border-orange-500'
            : 'bg-gradient-to-br from-blue-900/95 to-purple-900/95 border-blue-400'
          }
          animate-scale-in
        `}
      >
        {/* Header */}
        <div className="bg-white/10 p-6 border-b border-white/20">
          <div className="flex items-center gap-4">
            <div className="text-6xl animate-pulse">📍</div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Welcome to the Light Show!
              </h2>
              <p className="text-white/80 text-sm">
                We need your location for a better experience
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-500/20 border-2 border-red-500/60 rounded-lg p-4 animate-scale-in">
              <div className="flex items-start gap-3">
                <span className="text-3xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-2">Permission Denied</h3>
                  <p className="text-white/90 text-sm mb-3">{errorMessage}</p>
                  <div className="bg-black/30 rounded p-3 text-xs text-white/80 space-y-2">
                    <p className="font-semibold">To enable location access:</p>
                    <p>• <strong>Chrome/Edge:</strong> Click the 🔒 or ⓘ icon in the address bar → Site settings → Location → Allow</p>
                    <p>• <strong>Firefox:</strong> Click the 🔒 icon → Clear permissions → Reload → Try again</p>
                    <p>• <strong>Safari:</strong> Safari menu → Settings → Websites → Location → Allow</p>
                    <p>• <strong>Mobile:</strong> Phone Settings → Apps → Browser → Permissions → Location → Allow</p>
                  </div>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="mt-3 text-sm text-white/60 hover:text-white underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/10 rounded-lg p-4 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Why we need your location:
            </h3>
            
            <div className="space-y-3 text-white/90">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">🎵</span>
                <p className="text-sm">
                  <strong>Fair Song Requests:</strong> Only visitors at the show can request songs, 
                  preventing remote viewers from disrupting the experience for on-site guests.
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">👍</span>
                <p className="text-sm">
                  <strong>Authentic Voting:</strong> Ensures votes come from real attendees, 
                  making the jukebox reflect what people at the show actually want to hear.
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">🏠</span>
                <p className="text-sm">
                  <strong>Local Experience:</strong> You must be within a short distance 
                  (typically 1-3 miles) of the display to participate.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-500/20 border border-blue-400/40 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div className="text-sm text-white/90">
                <p className="font-semibold mb-1">Your Privacy Matters</p>
                <p>
                  Your location is only used to calculate distance from the light show. 
                  We don&apos;t store your exact coordinates or share your location with anyone.
                </p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <details className="bg-white/5 rounded-lg p-4 border border-white/10 cursor-pointer">
            <summary className="text-white font-semibold text-sm flex items-center gap-2">
              <span>ℹ️</span>
              How does this work?
            </summary>
            <div className="mt-3 text-white/80 text-xs space-y-2 pl-6">
              <p>
                1. Your browser/phone uses GPS to get your precise location (accurate to ~5-50 meters)
              </p>
              <p>
                2. We calculate the distance between you and the light show
              </p>
              <p>
                3. If you&apos;re within range, you can request songs and vote
              </p>
              <p>
                4. If you&apos;re too far away, you can still watch but can&apos;t interact
              </p>
            </div>
          </details>
        </div>

        {/* Footer Buttons */}
        <div className="bg-white/10 p-6 border-t border-white/20 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAllow}
            disabled={isChecking}
            className={`
              flex-1 py-4 px-6 rounded-lg font-bold text-white text-lg
              transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
              ${theme.id === 'christmas'
                ? 'bg-gradient-to-r from-green-600 to-red-600 hover:from-green-700 hover:to-red-700'
                : theme.id === 'halloween'
                ? 'bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-700 hover:to-purple-700'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              }
              shadow-lg hover:shadow-xl
            `}
          >
            {isChecking ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">📍</span>
                Getting Location...
              </span>
            ) : errorMessage ? (
              <span className="flex items-center justify-center gap-2">
                🔄 Try Again
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                ✓ Allow Location Access
              </span>
            )}
          </button>
          
          <button
            onClick={handleDeny}
            disabled={isChecking}
            className="sm:w-auto py-4 px-6 rounded-lg font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            No Thanks
          </button>
        </div>

        {/* Deny consequences notice */}
        <div className="bg-yellow-500/20 border-t-2 border-yellow-500/40 p-4">
          <p className="text-yellow-100 text-xs text-center">
            ⚠️ If you deny location access, you won&apos;t be able to request songs or vote, 
            but you can still view the queue and watch videos.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
