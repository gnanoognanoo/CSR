import { useEffect, useState } from 'react';

// These faces are self-hosted and registered once by the shared entry stylesheet.
// Loading them here preserves Home's font-readiness signal without registering
// route-local duplicates or removing fonts when the visitor changes pages.
const homeFaces = [
  '500 16px "Sora"',
  '600 16px "Sora"',
  '400 16px "DM Sans"',
  '500 16px "DM Sans"',
  '600 16px "DM Sans"',
  '400 16px "IBM Plex Mono"',
  '500 16px "IBM Plex Mono"',
] as const;

export function useHomeFonts() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  useEffect(() => {
    let mounted = true;
    Promise.all(homeFaces.map(face => document.fonts.load(face))).then(loaded => {
      // A missing CSS face resolves to an empty array; it is not a successful load.
      const ready = loaded.every(faces => faces.length > 0 && faces.every(face => face.status === 'loaded'));
      if (mounted) setStatus(ready ? 'ready' : 'failed');
    }).catch(() => { if (mounted) setStatus('failed'); });
    return () => { mounted = false; };
  }, []);
  return status;
}
