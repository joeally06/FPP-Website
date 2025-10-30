'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function AdminNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: '🏠' },
    { name: 'Sequences', path: '/sequences', icon: '🎵' },
    { name: 'Playlists', path: '/playlists', icon: '📋' },
    { name: 'Analytics', path: '/admin', icon: '📊' },
    { name: 'Engagement', path: '/engagement', icon: '👥' },
    { name: 'Themes', path: '/theme-settings', icon: '🎨' },
    { name: 'Santa Letters', path: '/santa-letters', icon: '🎅' },
    { name: 'Device Monitor', path: '/device-status', icon: '📡' },
    { name: 'Jukebox', path: '/jukebox', icon: '🎶', public: true }
  ];

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/10 border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-white">
              ✨ FPP Control Center
            </h1>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:block">
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

          {/* User Menu */}
          <div className="flex items-center gap-4">
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
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3">
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${isActive 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/80 hover:bg-white/10'
                    }
                  `}
                >
                  {item.icon} {item.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
