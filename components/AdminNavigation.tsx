'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import TimezoneIndicator from './TimezoneIndicator';
import FPPStatusIndicator from './FPPStatusIndicator';

export default function AdminNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: '🏠' },
    { name: 'Media Library', path: '/media', icon: '📚' },
    { name: 'Models', path: '/models', icon: '🎄' },
    { name: 'Analytics', path: '/analytics', icon: '📊' },
    { name: 'Devices', path: '/device-status', icon: '📡' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
    { name: 'Jukebox', path: '/jukebox', icon: '🎶', public: true }
  ];

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/10 border-b border-white/20 shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Logo/Brand - Far Left */}
          <div className="flex-shrink-0 mr-4">
            <h1 className="text-lg md:text-2xl font-bold text-white whitespace-nowrap">
              ✨ FPP Control Center
            </h1>
          </div>

          {/* Desktop Navigation Links - Hidden on mobile */}
          <div className="hidden lg:flex flex-1 items-center">
            <div className="flex items-center space-x-2">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      flex items-center gap-2
                      ${isActive 
                        ? 'bg-white/20 text-white shadow-lg' 
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }
                      ${item.public ? 'border border-green-400/50' : ''}
                    `}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop User Menu - Hidden on mobile */}
          <div className="hidden lg:flex items-center gap-4 ml-auto">
            <FPPStatusIndicator />
            <TimezoneIndicator />
            
            {session?.user && (
              <div className="hidden md:flex items-center gap-3 bg-white/10 px-4 py-2 rounded-lg">
                {session.user.image && (
                  <img 
                    src={session.user.image} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full border-2 border-white/50"
                  />
                )}
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{session.user.name}</p>
                  <p className="text-xs text-white/60">{session.user.role || 'User'}</p>
                </div>
              </div>
            )}
            
            {session && (
              <button
                onClick={() => signOut({ callbackUrl: '/jukebox' })}
                className="px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur-sm"
              >
                Logout
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden ml-auto p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 space-y-2">
            {/* Mobile Navigation Items */}
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-semibold
                    ${isActive 
                      ? 'bg-white text-black' 
                      : 'text-white hover:bg-white/10'
                    }
                    ${item.public ? 'border border-green-400/50' : ''}
                  `}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              );
            })}

            {/* Mobile User Info & Logout */}
            <div className="mt-4 pt-4 border-t border-white/20 space-y-3">
              <div className="px-4 flex justify-between items-center">
                <FPPStatusIndicator />
                <TimezoneIndicator />
              </div>
              
              {session?.user && (
                <div className="px-4 py-2 bg-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    {session.user.image && (
                      <img 
                        src={session.user.image} 
                        alt="Profile" 
                        className="w-10 h-10 rounded-full border-2 border-white/50"
                      />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{session.user.name}</p>
                      <p className="text-xs text-white/60">{session.user.role || 'User'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {session && (
                <button
                  onClick={() => {
                    signOut({ callbackUrl: '/jukebox' });
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 bg-red-500/80 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
