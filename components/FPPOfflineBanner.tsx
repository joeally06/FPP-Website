'use client';

import { useFPPConnection } from '@/contexts/FPPConnectionContext';
import { XCircle, RefreshCw } from 'lucide-react';

export default function FPPOfflineBanner() {
  const { isOnline, isChecking, error, nextRetryIn, resetRetry } = useFPPConnection();

  if (isOnline) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-md shadow-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <XCircle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            FPP Server Offline
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>Unable to connect to FPP server. Please check if it is online and accessible.</p>
            {error && (
              <p className="mt-1 text-xs text-red-600">
                Error: {error}
              </p>
            )}
            <p className="mt-2 text-xs">
              {isChecking ? (
                <span className="flex items-center">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Checking connection...
                </span>
              ) : (
                <span>
                  Next automatic retry in {nextRetryIn} seconds
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={resetRetry}
              disabled={isChecking}
              className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              title="Retry now"
            >
              <span className="sr-only">Retry now</span>
              <RefreshCw className={`h-5 w-5 ${isChecking ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
