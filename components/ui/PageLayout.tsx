import React from 'react';
import { LucideIcon } from 'lucide-react';
import { gradients, textStyles } from '@/lib/theme';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function PageLayout({ 
  title, 
  subtitle, 
  icon: Icon, 
  actions, 
  children 
}: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-linear-to-br ${gradients.background}`}>
      <div className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {Icon && (
              <div className="p-3 bg-white/10 rounded-xl border border-white/20 backdrop-blur-md">
                <Icon className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h1 className={textStyles.pageTitle}>{title}</h1>
              {subtitle && <p className={textStyles.pageSubtitle}>{subtitle}</p>}
            </div>
          </div>
          
          {/* Action Buttons */}
          {actions && (
            <div className="flex gap-3">
              {actions}
            </div>
          )}
        </div>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
