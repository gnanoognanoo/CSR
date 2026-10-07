import type { Member } from './data';

export const wrapMemberIndex = (index: number, count: number) => count ? ((Math.round(index) % count) + count) % count : 0;

/** Recycle the rear position, keeping neighbours on both sides of the focused person. */
export function getMemberWindow(records: readonly Member[], focusStep: number, capacity: number) {
  const count = Math.min(records.length, Math.max(1, Math.floor(capacity)));
  const start = Math.round(focusStep) - Math.floor((count - 1) / 2);
  const slots = Array.from({ length: count }, (_, offset) => {
    const logicalIndex = start + offset;
    return { position: wrapMemberIndex(logicalIndex, count), logicalIndex, member: records[wrapMemberIndex(logicalIndex, records.length)] };
  });
  return slots.sort((a, b) => a.position - b.position);
}

export function nearestMemberStep(current: number, memberIndex: number, total: number) {
  return total ? memberIndex + Math.round((current - memberIndex) / total) * total : 0;
}
