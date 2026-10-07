import { useEffect, useState } from 'react';

// Vite copies these local WOFF2 files into the production asset bundle.
const homeFaces = [
  ['Space Grotesk', '500', new URL('../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2', import.meta.url).href],
  ['DM Sans', '400', new URL('../node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2', import.meta.url).href],
  ['DM Sans', '500', new URL('../node_modules/@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2', import.meta.url).href],
  ['IBM Plex Mono', '500', new URL('../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2', import.meta.url).href],
] as const;

export function useHomeFonts() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  useEffect(() => {
    let mounted = true;
    const faces = homeFaces.map(([family, weight, url]) => new FontFace(family, `url("${url}")`, { weight, style: 'normal', display: 'swap' }));
    faces.forEach(face => document.fonts.add(face));
    Promise.all(faces.map(face => face.load())).then(loaded => {
      if (mounted) setStatus(loaded.every(face => face.status === 'loaded') ? 'ready' : 'failed');
    }).catch(() => { if (mounted) setStatus('failed'); });
    // The Home-only Plex 500 face must not alter the other routes' existing type.
    return () => { mounted = false; faces.forEach(face => document.fonts.delete(face)); };
  }, []);
  return status;
}
