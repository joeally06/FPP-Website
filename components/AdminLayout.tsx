'use client';

import { ReactNode } from 'react';
import AdminNavigation from './AdminNavigation';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(title || subtitle) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg animate-pulse-slow">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-lg text-white/70">
                {subtitle}
              </p>
            )}
          </div>
        )}
        
        {children}
      </div>
    </div>
  );
}
