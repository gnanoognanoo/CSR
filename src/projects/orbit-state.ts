import { useReducer } from 'react';
import { getDivisionProjects, projectDivisions, projects, type Project } from './data';

export function wrapIndex(index: number, count: number): number {
  if (!Number.isFinite(index) || !Number.isFinite(count) || count < 1) return 0;
  const length = Math.floor(count);
  return ((Math.trunc(index) % length) + length) % length;
}

/** Degrees, with slot zero at the bottom. Direction is the numeric rotation sign. */
export function nearestRotation(current: number, targetIndex: number, count: number, direction?: 1 | -1): number {
  const origin = Number.isFinite(current) ? current : 0;
  if (!Number.isFinite(count) || count < 1) return origin;
  const target = -wrapIndex(targetIndex, count) * 360 / Math.floor(count);
  const positiveDelta = ((target - origin) % 360 + 360) % 360;
  if (positiveDelta < 1e-8 || 360 - positiveDelta < 1e-8) return origin;
  const delta = direction === 1 ? positiveDelta
    : direction === -1 ? positiveDelta - 360
      : positiveDelta > 180 ? positiveDelta - 360 : positiveDelta;
  return origin + delta;
}

export interface OrbitState {
  selectedDivision: string;
  selectedProjects: Record<string, string | null>;
  outerRotation: number;
  innerRotations: Record<string, number>;
  detailOpen: boolean;
}

export type OrbitAction =
  | { type: 'select-division'; id: string; direction?: 1 | -1 }
  | { type: 'select-project'; id: string; open?: boolean; direction?: 1 | -1 }
  | { type: 'close-project' }
  | { type: 'outer-rotation'; degrees: number }
  | { type: 'inner-rotation'; degrees: number };

export function createOrbitState(archive: readonly Project[] = projects): OrbitState {
  return {
    selectedDivision: projectDivisions[0].id,
    selectedProjects: Object.fromEntries(projectDivisions.map(division => [division.id, getDivisionProjects(division.id, archive)[0]?.id ?? null])),
    outerRotation: 0,
    innerRotations: Object.fromEntries(projectDivisions.map(division => [division.id, 0])),
    detailOpen: false,
  };
}

export function orbitReducer(state: OrbitState, action: OrbitAction, archive: readonly Project[] = projects): OrbitState {
  switch (action.type) {
    case 'select-division': {
      const index = projectDivisions.findIndex(division => division.id === action.id);
      if (index < 0) return state;
      const divisionProjects = getDivisionProjects(action.id, archive);
      const previousProject = state.selectedProjects[action.id];
      const selectedProject = divisionProjects.some(project => project.id === previousProject)
        ? previousProject : divisionProjects[0]?.id ?? null;
      return {
        ...state,
        selectedDivision: action.id,
        selectedProjects: { ...state.selectedProjects, [action.id]: selectedProject },
        outerRotation: nearestRotation(state.outerRotation, index, projectDivisions.length, action.direction),
        detailOpen: false,
      };
    }
    case 'select-project': {
      const project = archive.find(candidate => candidate.id === action.id);
      if (!project) return state;
      const divisionIndex = projectDivisions.findIndex(division => division.id === project.division);
      if (divisionIndex < 0) return state;
      const divisionProjects = getDivisionProjects(project.division, archive);
      const projectIndex = divisionProjects.findIndex(candidate => candidate.id === project.id);
      const previousRotation = state.innerRotations[project.division] ?? 0;
      const oppositeDirection = action.direction ? (action.direction * -1) as 1 | -1 : undefined;
      return {
        ...state,
        selectedDivision: project.division,
        selectedProjects: { ...state.selectedProjects, [project.division]: project.id },
        outerRotation: project.division === state.selectedDivision ? state.outerRotation
          : nearestRotation(state.outerRotation, divisionIndex, projectDivisions.length),
        innerRotations: {
          ...state.innerRotations,
          [project.division]: -nearestRotation(-previousRotation, projectIndex, divisionProjects.length, oppositeDirection),
        },
        detailOpen: action.open ?? state.detailOpen,
      };
    }
    case 'close-project':
      return state.detailOpen ? { ...state, detailOpen: false } : state;
    case 'outer-rotation':
      return Number.isFinite(action.degrees) ? { ...state, outerRotation: action.degrees } : state;
    case 'inner-rotation':
      return Number.isFinite(action.degrees)
        ? { ...state, innerRotations: { ...state.innerRotations, [state.selectedDivision]: action.degrees } }
        : state;
  }
}

export function useProjectOrbit(archive: readonly Project[] = projects) {
  const [state, dispatch] = useReducer((current: OrbitState, action: OrbitAction) => orbitReducer(current, action, archive), undefined, () => createOrbitState(archive));
  const selectedDivision = projectDivisions.find(division => division.id === state.selectedDivision) ?? projectDivisions[0];
  const divisionProjects = getDivisionProjects(selectedDivision.id, archive);
  const selectedProject = divisionProjects.find(project => project.id === state.selectedProjects[selectedDivision.id]) ?? null;

  function selectDivision(id: string, direction?: 1 | -1) {
    dispatch({ type: 'select-division', id, direction });
  }

  function rotateDivision(step: number) {
    if (!Number.isFinite(step) || !Math.trunc(step)) return;
    const index = projectDivisions.findIndex(division => division.id === state.selectedDivision);
    selectDivision(projectDivisions[wrapIndex(index + step, projectDivisions.length)].id, step > 0 ? -1 : 1);
  }

  function selectProject(id: string, options: { open?: boolean; direction?: 1 | -1 } = {}) {
    dispatch({ type: 'select-project', id, ...options });
  }

  function rotateProject(step: number) {
    if (!divisionProjects.length || !Number.isFinite(step) || !Math.trunc(step)) return;
    const index = Math.max(0, divisionProjects.findIndex(project => project.id === selectedProject?.id));
    selectProject(divisionProjects[wrapIndex(index + step, divisionProjects.length)].id, { direction: step > 0 ? 1 : -1 });
  }

  return {
    state, selectedDivision, divisionProjects, selectedProject,
    selectDivision, rotateDivision, selectProject, rotateProject,
    openProject: (id: string) => selectProject(id, { open: true }),
    closeProject: () => dispatch({ type: 'close-project' }),
    setOuterRotation: (degrees: number) => dispatch({ type: 'outer-rotation', degrees }),
    setInnerRotation: (degrees: number) => dispatch({ type: 'inner-rotation', degrees }),
  };
}
