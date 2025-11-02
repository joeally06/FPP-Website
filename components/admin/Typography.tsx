import React from 'react';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Admin Panel Typography Components
 * Ensures consistent font styling across all admin pages
 */

export const AdminH1 = ({ children, className = '' }: TypographyProps) => (
  <h1 className={`admin-h1 ${className}`}>
    {children}
  </h1>
);

export const AdminH2 = ({ children, className = '' }: TypographyProps) => (
  <h2 className={`admin-h2 ${className}`}>
    {children}
  </h2>
);

export const AdminH3 = ({ children, className = '' }: TypographyProps) => (
  <h3 className={`admin-h3 ${className}`}>
    {children}
  </h3>
);

export const AdminText = ({ children, className = '' }: TypographyProps) => (
  <p className={`admin-text ${className}`}>
    {children}
  </p>
);

export const AdminTextMuted = ({ children, className = '' }: TypographyProps) => (
  <p className={`admin-text-muted ${className}`}>
    {children}
  </p>
);

export const AdminLabel = ({ children, className = '' }: TypographyProps) => (
  <label className={`admin-label ${className}`}>
    {children}
  </label>
);

export const AdminCard = ({ children, className = '' }: TypographyProps) => (
  <div className={`admin-card ${className}`}>
    {children}
  </div>
);

export const AdminSection = ({ children, className = '' }: TypographyProps) => (
  <div className={`admin-section ${className}`}>
    {children}
  </div>
);
