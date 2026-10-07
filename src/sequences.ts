export const sequences = [
  { id: 'begin', label: 'Begin', folder: '01-desk', count: 240, focal: .5 },
  { id: 'design', label: 'Design', folder: '02-blueprint', count: 240, focal: .5 },
  { id: 'build', label: 'Build', folder: '03-prototype', count: 240, focal: .5 },
  { id: 'community', label: 'Community', folder: '04-community', count: 240, focal: .54 },
  // CLIP 5 has not been supplied. Use the matching digital endpoint, not a fabricated sequence.
  { id: 'intelligence', label: 'Intelligence', folder: '04-community', count: 1, still: 240, focal: .58 },
] as const;
export function frameUrl(scene: number, frame: number, mobile: boolean) {
  const sequence = sequences[scene];
  return `/sequences/${sequence.folder}/${mobile ? 'mobile/' : ''}frame_${String('still' in sequence ? sequence.still : frame + 1).padStart(4, '0')}.jpg`;
}
export function frameAt(progress: number, count: number, step = 1) {
  const raw = Math.round(Math.max(0, Math.min(1, progress)) * (count - 1));
  return raw === count - 1 ? raw : Math.floor(raw / step) * step;
}
