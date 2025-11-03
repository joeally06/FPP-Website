import React from 'react';
import { glassStyles } from '@/lib/theme';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ 
  children, 
  className = '', 
  hover = false,
  onClick 
}: GlassCardProps) {
  const baseStyles = hover ? glassStyles.cardHover : glassStyles.card;
  const cursorStyles = onClick ? 'cursor-pointer' : '';
  
  return (
    <div 
      className={`${baseStyles} ${cursorStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
