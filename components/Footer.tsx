'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface VersionInfo {
  version: string;
  build?: string;
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export default function Footer() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        setVersionInfo(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load version info:', err);
        setLoading(false);
      });
  }, []);

  return (
    <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          {/* Left side - Version info */}
          <div className="flex items-center gap-2 group">
            {loading ? (
              <span className="animate-pulse">Loading version...</span>
            ) : versionInfo ? (
              <>
                <span className="font-semibold text-gray-900 dark:text-gray-100 transition-all duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  🎄 FPP Control Center
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold animate-pulse">
                  v{versionInfo.version}
                </span>
                {versionInfo.build && (
                  <code className="px-2 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded text-xs font-mono hover:scale-110 transition-transform duration-200">
                    {versionInfo.build.substring(0, 7)}
                  </code>
                )}
              </>
            ) : (
              <span>🎄 FPP Control Center</span>
            )}
          </div>

          {/* Right side - Links */}
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 hover:scale-110 hover:font-semibold"
            >
              🔒 Privacy Policy
            </Link>
            <span className="text-gray-400 dark:text-gray-600 font-mono">
              © {new Date().getFullYear()} 🎅
            </span>
          </div>
        </div>
      </div>
      
      {/* Add custom animation */}
      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        
        .animate-spin-slow:hover {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </footer>
  );
}
