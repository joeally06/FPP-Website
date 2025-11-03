/**
 * FPP Control Center Theme Configuration
 * Centralized theme constants for consistent UI across all pages
 */

export const gradients = {
  // Main background gradient
  background: 'from-purple-900 via-blue-900 to-indigo-900',
  
  // Stat card gradients
  blue: 'from-blue-500/80 to-blue-600/80',
  purple: 'from-purple-500/80 to-purple-600/80',
  green: 'from-green-500/80 to-emerald-600/80',
  orange: 'from-orange-500/80 to-amber-600/80',
  indigo: 'from-indigo-500/80 to-indigo-600/80',
  red: 'from-red-500/80 to-red-600/80',
  pink: 'from-pink-500/80 to-rose-600/80',
  cyan: 'from-cyan-500/80 to-cyan-600/80',
} as const;

export const glassStyles = {
  // Glass card with border
  card: 'backdrop-blur-md bg-white/10 rounded-xl shadow-2xl border border-white/20',
  
  // Glass card with hover effect
  cardHover: 'backdrop-blur-md bg-white/10 rounded-xl shadow-2xl border border-white/20 hover:bg-white/20 transition-all',
  
  // Glass input field
  input: 'backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  
  // Glass button
  button: 'backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-all shadow-lg hover:shadow-xl',
  
  // Glass modal/overlay
  modal: 'backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-2xl',
} as const;

export const textStyles = {
  // Page title
  pageTitle: 'text-4xl font-bold text-white mb-2',
  
  // Page subtitle
  pageSubtitle: 'text-white/70 text-lg',
  
  // Card title
  cardTitle: 'text-xl font-bold text-white mb-1',
  
  // Card subtitle
  cardSubtitle: 'text-sm text-white/70',
  
  // Body text
  body: 'text-white/80',
  
  // Muted text
  muted: 'text-white/50',
} as const;

export const animations = {
  // Scale on hover
  scaleHover: 'transform transition-all hover:scale-105',
  
  // Fade in
  fadeIn: 'animate-fade-in',
  
  // Spin (for loading)
  spin: 'animate-spin',
} as const;
