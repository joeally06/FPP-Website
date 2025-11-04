'use client';

import { useFPPConnection } from '@/contexts/FPPConnectionContext';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function FPPStatusIndicator() {
  const { isOnline, isChecking, error, nextRetryIn, resetRetry } = useFPPConnection();
  const [showDetails, setShowDetails] = useState(false);

  if (isOnline) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Wifi className="w-4 h-4" />
        <span className="hidden sm:inline">FPP Connected</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Compact indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 transition-colors"
      >
        <WifiOff className="w-4 h-4 animate-pulse" />
        <span className="hidden sm:inline">FPP Offline</span>
      </button>

      {/* Dropdown details */}
      {showDetails && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDetails(false)}
          ></div>
          
          {/* Details panel */}
          <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-amber-200 p-4 z-50">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <WifiOff className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-gray-900">FPP Server Offline</h3>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              Unable to connect to FPP. Some features are unavailable.
            </p>

            {error && (
              <div className="text-xs text-gray-500 mb-3 font-mono bg-gray-50 p-2 rounded border border-gray-200">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-200">
              <span className="text-gray-600">
                {isChecking ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Checking...
                  </span>
                ) : (
                  `Retry in ${nextRetryIn}s`
                )}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetRetry();
                }}
                disabled={isChecking}
                className="text-amber-600 hover:text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Retry Now
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
