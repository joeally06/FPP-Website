import React from 'react';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

interface LabelProps extends TypographyProps {
  htmlFor?: string;
}

/**
 * Admin Panel Typography Components
 * Ensures consistent font styling across all admin pages
 * Uses CSS variables from globals.css for consistent theming
 */

// ===== HEADINGS =====

/**
 * Page Title (H1)
 * Usage: Main page headings
 * Color: White, Size: 4xl, Weight: Bold
 */
export const AdminH1 = ({ children, className = '' }: TypographyProps) => (
  <h1 className={`admin-h1 ${className}`}>
    {children}
  </h1>
);

/**
 * Section Title (H2)
 * Usage: Major section headings
 * Color: White, Size: 2xl, Weight: Bold
 */
export const AdminH2 = ({ children, className = '' }: TypographyProps) => (
  <h2 className={`admin-h2 ${className}`}>
    {children}
  </h2>
);

/**
 * Subsection Title (H3)
 * Usage: Subsection headings
 * Color: White, Size: xl, Weight: Semibold
 */
export const AdminH3 = ({ children, className = '' }: TypographyProps) => (
  <h3 className={`admin-h3 ${className}`}>
    {children}
  </h3>
);

/**
 * Card/Small Section Title (H4)
 * Usage: Card headers, small sections
 * Color: White, Size: lg, Weight: Semibold
 */
export const AdminH4 = ({ children, className = '' }: TypographyProps) => (
  <h4 className={`text-lg font-semibold mb-2 text-white ${className}`}>
    {children}
  </h4>
);

// ===== BODY TEXT =====

/**
 * Body Text
 * Usage: Default paragraph text
 * Color: White 80%, Size: base
 */
export const AdminText = ({ children, className = '' }: TypographyProps) => (
  <p className={`admin-text ${className}`}>
    {children}
  </p>
);

/**
 * Muted Text
 * Usage: Helper text, descriptions, captions
 * Color: White 60%, Size: sm
 */
export const AdminTextMuted = ({ children, className = '' }: TypographyProps) => (
  <p className={`admin-text-muted ${className}`}>
    {children}
  </p>
);

/**
 * Small Text
 * Usage: Very small helper text
 * Color: White 60%, Size: sm
 * Alias for AdminTextMuted for semantic clarity
 */
export const AdminTextSmall = AdminTextMuted;

/**
 * Tiny Text
 * Usage: Extremely small labels, timestamps
 * Color: White 50%, Size: xs
 */
export const AdminTextTiny = ({ children, className = '' }: TypographyProps) => (
  <p className={`text-xs text-white/50 ${className}`}>
    {children}
  </p>
);

// ===== LABELS =====

/**
 * Form Label
 * Usage: Labels for form inputs
 * Color: White, Size: sm, Weight: Medium
 */
export const AdminLabel = ({ children, className = '', htmlFor }: LabelProps) => (
  <label htmlFor={htmlFor} className={`admin-label ${className}`}>
    {children}
  </label>
);

// ===== VALUES & STATS =====

/**
 * Large Value Display
 * Usage: Statistics, metrics, big numbers
 * Color: White, Size: 3xl, Weight: Bold
 */
export const AdminValue = ({ children, className = '' }: TypographyProps) => (
  <div className={`text-3xl font-bold text-white ${className}`}>
    {children}
  </div>
);

/**
 * Medium Value Display
 * Usage: Smaller stats
 * Color: White, Size: 2xl, Weight: Bold
 */
export const AdminValueMedium = ({ children, className = '' }: TypographyProps) => (
  <div className={`text-2xl font-bold text-white ${className}`}>
    {children}
  </div>
);

// ===== MESSAGE STATES =====

/**
 * Success Message
 * Usage: Success notifications
 * Color: Green 200, Size: sm
 */
export const AdminSuccess = ({ children, className = '' }: TypographyProps) => (
  <p className={`text-green-200 text-sm ${className}`}>
    {children}
  </p>
);

/**
 * Error Message
 * Usage: Error notifications
 * Color: Red 200, Size: sm
 */
export const AdminError = ({ children, className = '' }: TypographyProps) => (
  <p className={`text-red-200 text-sm ${className}`}>
    {children}
  </p>
);

/**
 * Warning Message
 * Usage: Warning notifications
 * Color: Amber 200, Size: sm
 */
export const AdminWarning = ({ children, className = '' }: TypographyProps) => (
  <p className={`text-amber-200 text-sm ${className}`}>
    {children}
  </p>
);

/**
 * Info Message
 * Usage: Informational notifications
 * Color: Blue 200, Size: sm
 */
export const AdminInfo = ({ children, className = '' }: TypographyProps) => (
  <p className={`text-blue-200 text-sm ${className}`}>
    {children}
  </p>
);

// ===== LAYOUT COMPONENTS =====

/**
 * Card Container
 * Usage: Card wrapper with glassmorphism
 */
export const AdminCard = ({ children, className = '' }: TypographyProps) => (
  <div className={`admin-card ${className}`}>
    {children}
  </div>
);

/**
 * Section Container
 * Usage: Section wrapper with bottom margin
 */
export const AdminSection = ({ children, className = '' }: TypographyProps) => (
  <div className={`admin-section ${className}`}>
    {children}
  </div>
);
