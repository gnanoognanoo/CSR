import type { Project } from './data';

export const PROJECT_SLOT_COUNT = 6;
export const PROJECT_PLACEHOLDER_IMAGE = '/projects/placeholder.svg';

export type ProjectSlot = {
  /** The display position keeps its identity while its project changes. */
  id: string;
  index: number;
  /** Unwrapped carousel step assigned to this physical display position. */
  logicalIndex: number;
  /** Index in the complete project dataset; null only for an empty position. */
  projectIndex: number | null;
  title: string;
  project: Project | null;
};

export type ProjectWindow = { start: number };

const integer = (value: number) => Number.isFinite(value) ? Math.round(value) : 0;
const wrap = (value: number, length: number) => ((value % length) + length) % length;

/** Keep the accumulated turns: physical focus alone repeats after six steps. */
export function getProjectFocusStep(rotation: number): number {
  return integer(rotation / (360 / PROJECT_SLOT_COUNT));
}

/**
 * Keep the current six-item window until the selected project leaves it.
 * Forward traversal first replaces position zero on step six (project seven).
 * Reverse traversal shifts the opposite edge using the same unwrapped steps.
 */
export function updateProjectWindow(window: ProjectWindow, focusStep: number, projectCount: number): ProjectWindow {
  const start = integer(window.start);
  const focus = integer(focusStep);
  const count = Number.isFinite(projectCount) ? Math.max(0, Math.floor(projectCount)) : 0;
  const nextStart = count <= PROJECT_SLOT_COUNT ? 0
    : focus < start ? focus
    : focus >= start + PROJECT_SLOT_COUNT ? focus - PROJECT_SLOT_COUNT + 1
    : start;
  return nextStart === window.start ? window : { start: nextStart };
}

/**
 * Six permanent display positions backed by the complete archive.
 * A logical project keeps the same physical position modulo six as the ring
 * turns; its dataset index wraps independently, so eight records never create
 * eight meshes. Empty positions belong to the selector, never to the archive.
 */
export function getProjectSlots(records: readonly Project[], scopeId: string, windowStart = 0): ProjectSlot[] {
  const count = records.length;
  const start = count > PROJECT_SLOT_COUNT ? integer(windowStart) : 0;
  const slots: ProjectSlot[] = new Array(PROJECT_SLOT_COUNT);
  for (let offset = 0; offset < PROJECT_SLOT_COUNT; offset++) {
    const logicalIndex = start + offset;
    const index = wrap(logicalIndex, PROJECT_SLOT_COUNT);
    const projectIndex = count > PROJECT_SLOT_COUNT ? wrap(logicalIndex, count)
      : logicalIndex < count ? logicalIndex : null;
    const project = projectIndex === null ? null : records[projectIndex];
    slots[index] = {
      id: `${scopeId}-slot-${index + 1}`,
      index,
      logicalIndex,
      projectIndex,
      title: project?.title ?? 'Coming Soon',
      project,
    };
  }
  return slots;
}
