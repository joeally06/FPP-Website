'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal, X, CheckCircle, AlertCircle } from 'lucide-react';

interface LiveUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LiveUpdateModal({ isOpen, onClose }: LiveUpdateModalProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Reset state
    setOutput([]);
    setIsComplete(false);
    setHasError(false);
    setAutoCloseCountdown(null);

    // Start the update stream
    const eventSource = new EventSource('/api/system/update/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[Update Modal] Stream opened');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Update Modal] Received:', data);

        if (data.type === 'start' || data.type === 'stdout' || data.type === 'stderr') {
          setOutput((prev) => [...prev, data.message]);
        } else if (data.type === 'complete') {
          setOutput((prev) => [...prev, '', data.message]);
          setIsComplete(true);
          
          // Start auto-close countdown
          let countdown = 5;
          setAutoCloseCountdown(countdown);
          
          const interval = setInterval(() => {
            countdown--;
            setAutoCloseCountdown(countdown);
            
            if (countdown <= 0) {
              clearInterval(interval);
              // Reload the page to get the new version
              window.location.reload();
            }
          }, 1000);
        } else if (data.type === 'error') {
          setOutput((prev) => [...prev, '', data.message]);
          setHasError(true);
          setIsComplete(true);
        }
      } catch (error) {
        console.error('[Update Modal] Parse error:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[Update Modal] Stream error:', error);
      setOutput((prev) => [...prev, '', '❌ Connection lost or update process ended.']);
      setHasError(true);
      setIsComplete(true);
      eventSource.close();
    };

    return () => {
      if (eventSourceRef.current) {
        console.log('[Update Modal] Closing stream');
        eventSourceRef.current.close();
      }
    };
  }, [isOpen]);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/30">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-green-400" />
            <h2 className="text-2xl font-bold text-white">
              {isComplete 
                ? (hasError ? '❌ Update Failed' : '✅ Update Complete') 
                : '🔄 Installing Update...'}
            </h2>
          </div>
          
          {isComplete && !autoCloseCountdown && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          )}
        </div>

        {/* Terminal Output */}
        <div className="h-[500px] overflow-y-auto bg-black/50 p-6 font-mono text-sm">
          <div className="space-y-1">
            {output.map((line, index) => (
              <div
                key={index}
                className="text-green-400 whitespace-pre-wrap break-words"
                style={{
                  textShadow: '0 0 5px rgba(34, 197, 94, 0.5)',
                }}
              >
                {line}
              </div>
            ))}
            {!isComplete && (
              <div className="flex items-center gap-2 text-green-400 animate-pulse">
                <span>▊</span>
                <span className="text-white/50">Processing...</span>
              </div>
            )}
          </div>
          <div ref={outputEndRef} />
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-black/30">
          {autoCloseCountdown !== null && (
            <div className="flex items-center justify-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-white">
                Page will reload in <span className="font-bold text-green-400 text-xl">{autoCloseCountdown}</span> seconds...
              </p>
            </div>
          )}
          
          {hasError && !autoCloseCountdown && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-white">
                  Update failed. Check the output above for details.
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
          
          {!isComplete && (
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-400 border-t-transparent"></div>
              <p className="text-white/70">
                Update in progress... <span className="font-semibold text-yellow-400">Do not close this window.</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
