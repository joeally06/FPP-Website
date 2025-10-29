'use client';

import { useEffect, useRef } from 'react';

let sessionId: number | null = null;
let trackingInitialized = false;

export function useVisitorTracking(page: string = '/jukebox') {
  const lastPageRef = useRef<string>(page);
  const unloadListenerAdded = useRef(false);

  useEffect(() => {
    // Initialize tracking on first visit
    if (!trackingInitialized) {
      trackingInitialized = true;
      
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'visit', page })
      })
        .then(res => res.json())
        .then(data => {
          if (data.sessionId) {
            sessionId = data.sessionId;
          }
        })
        .catch(err => console.log('Tracking init failed:', err));
    } else if (page !== lastPageRef.current) {
      // Track page view on page change
      lastPageRef.current = page;
      
      if (sessionId) {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'pageview', page, sessionId })
        }).catch(err => console.log('Pageview tracking failed:', err));
      }
    }

    // Track session end on page unload
    if (!unloadListenerAdded.current) {
      unloadListenerAdded.current = true;
      
      const handleUnload = () => {
        if (sessionId) {
          // Use sendBeacon for reliable tracking on page unload
          const blob = new Blob(
            [JSON.stringify({ action: 'end', sessionId })],
            { type: 'application/json' }
          );
          navigator.sendBeacon('/api/analytics/track', blob);
        }
      };

      window.addEventListener('beforeunload', handleUnload);
      
      // Cleanup
      return () => {
        window.removeEventListener('beforeunload', handleUnload);
      };
    }
  }, [page]);
}
