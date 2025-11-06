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
    <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          {/* Left side - Version info */}
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="animate-pulse">Loading version...</span>
            ) : versionInfo ? (
              <>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  FPP Control Center
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  v{versionInfo.version}
                </span>
                {versionInfo.build && (
                  <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                    {versionInfo.build.substring(0, 7)}
                  </code>
                )}
              </>
            ) : (
              <span>FPP Control Center</span>
            )}
          </div>

          {/* Right side - Links */}
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Privacy Policy
            </Link>
            <a
              href="https://github.com/joeally06/FPP-Control-Center"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </a>
            <span className="text-gray-400 dark:text-gray-600">
              © {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
