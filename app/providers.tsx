'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/lib/themes/theme-context';
import { FPPConnectionProvider } from '@/contexts/FPPConnectionContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <FPPConnectionProvider>
          {children}
        </FPPConnectionProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
