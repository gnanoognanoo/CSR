import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { projectDivisions, projects, type Project } from './projects';
import { useOrbitPhysics } from './useOrbitPhysics';
import { createModelMotionController, isModelDrag } from './model-motion';
import { getProjectSlots, updateProjectWindow, PROJECT_SLOT_COUNT, PROJECT_PLACEHOLDER_IMAGE } from './project-slots';
import { getOrbitViewSize, getOrbitTilt, getOrbitPreviewHeight, ORBIT_PREVIEW_WIDTH, ORBIT_MODEL_SIZE, getModelPositions, getProjectPositions, type ModelScreenPosition, type ProjectScreenPosition } from './orbit-geometry';
import DivisionIcon from './DivisionIcon';
import { AllProjectsOverlay } from './AllProjectsOverlay';
import { ProjectDossier } from './ProjectDossier';
import EngineeringEnvironment from '../background/EngineeringEnvironment';
import { getHubLayout, getHubScreenPulse } from './hub-geometry';
import { PROJECT_PREVIEW_ACTIVE_SCALE } from './project-preview';
import { createHubMotionController } from './hub-motion';
import './projects.css';

const OrbitScene = lazy(() => import('./OrbitScene'));
const wrap = (index: number, count: number) => count ? ((index % count) + count) % count : 0;

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => { const media = window.matchMedia(query); const update = () => setMatches(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, [query]);
  return matches;
}

class SceneBoundary extends Component<{children: ReactNode; onFailure: () => void}, {failed: boolean}> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

type RingGesture = { pointerId: number; x: number; y: number; angle: number; lastTime: number; moved: boolean; horizontal: boolean };
type ModelGesture = { pointerId: number; index: number; target: HTMLButtonElement; x: number; y: number; lastTime: number; moved: boolean };

export default function ProjectOrbitPage({ archive = projects }: { archive?: readonly Project[] }) {
  const [divisionIndex, setDivisionIndex] = useState(() => Math.max(0, projectDivisions.findIndex(division => division.id === archive[0]?.division)));
  const [projectStep, setProjectStep] = useState(0);
  const [projectWindow, setProjectWindow] = useState({ start: 0 });
  const [divisionNotice, setDivisionNotice] = useState('');
  const [allProjectsOpen, setAllProjectsOpen] = useState(false);
  const [archiveDivision, setArchiveDivision] = useState<string | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [isDraggingRing, setIsDraggingRing] = useState(false);
  const [draggedModel, setDraggedModel] = useState<number | null>(null);
  const [hoveredModel, setHoveredModel] = useState<number | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const compact = useMedia('(max-width: 760px)');
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const selectedDivision = projectDivisions[divisionIndex];
  const projectIndex = wrap(projectStep, PROJECT_SLOT_COUNT);
  const projectSlots = getProjectSlots(archive, 'archive', projectWindow.start);
  const selectedSlot = projectSlots[projectIndex];
  const selectedProject = selectedSlot.project;
  const currentDivision = projectDivisions.find(division => division.id === selectedProject?.division);
  const overlayOpen = allProjectsOpen || !!detailProject;
  const sceneLoaded = useCallback(() => { setSceneReady(true); setSceneFailed(false); }, []);
  const sceneUnavailable = useCallback(() => setSceneFailed(true), []);
  const projectPhysics = useOrbitPhysics({ count: PROJECT_SLOT_COUNT, reducedMotion, onFocusStep: step => {
    setProjectStep(step);
    setProjectWindow(previous => updateProjectWindow(previous, step, archive.length));
    setDivisionNotice('');
    const project = archive[wrap(step, archive.length)];
    const division = projectDivisions.findIndex(candidate => candidate.id === project?.division);
    if (division >= 0) setDivisionIndex(division);
  } });
  const [modelMotion] = useState(() => createModelMotionController(7));
  const [hubMotion] = useState(createHubMotionController);
  const main = useRef<HTMLElement>(null), stage = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLButtonElement>(null);
  const projectButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const modelButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const modelProjection = useRef<ModelScreenPosition[]>([]);
  const ringGesture = useRef<RingGesture | null>(null);
  const modelGesture = useRef<ModelGesture | null>(null);
  const suppressClick = useRef<{ until: number; target: HTMLButtonElement | null } | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);
  useEffect(() => { projectPhysics.pause(overlayOpen || draggedModel !== null); modelMotion.slow(overlayOpen ? .06 : 1); }, [projectPhysics, modelMotion, overlayOpen, draggedModel]);
  useEffect(() => { hubMotion.pause(overlayOpen || isDraggingRing || draggedModel !== null); }, [hubMotion, overlayOpen, isDraggingRing, draggedModel]);
  useEffect(() => {
    const cancelGestures = () => {
      const ring = ringGesture.current;
      if (ring) projectPhysics.cancelDrag();
      const held = modelGesture.current;
      if (held?.moved) modelMotion.cancelDrag(held.index);
      // A cancelled pointer can release after the tab regains focus. Keep its
      // click blocked until that release or a fresh pointerdown starts anew.
      suppressClick.current = held ? { until: Infinity, target: held.target } : null;
      ringGesture.current = null; modelGesture.current = null;
      if (ring && stage.current?.hasPointerCapture(ring.pointerId)) stage.current.releasePointerCapture(ring.pointerId);
      if (held?.target.hasPointerCapture(held.pointerId)) held.target.releasePointerCapture(held.pointerId);
      projectPhysics.pause(overlayOpen);
      setIsDraggingRing(false); setDraggedModel(null);
    };
    const onVisibility = () => { if (document.hidden) cancelGestures(); };
    window.addEventListener('blur', cancelGestures);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('blur', cancelGestures); document.removeEventListener('visibilitychange', onVisibility); };
  }, [projectPhysics, modelMotion, overlayOpen]);

  const focusProject = useCallback((index: number) => {
    if (!archive.length) return;
    const currentStep = Math.round(projectPhysics.rotation / (360 / PROJECT_SLOT_COUNT));
    const target = index + Math.round((currentStep - index) / archive.length) * archive.length;
    projectPhysics.selectStep(target);
  }, [archive.length, projectPhysics]);
  const selectDivision = useCallback((index: number) => {
    const next = projectDivisions[wrap(index, 7)];
    setDivisionIndex(wrap(index, 7));
    setArchiveDivision(next.id);
    setAllProjectsOpen(true);
    projectPhysics.pause(true);
    modelMotion.slow(.06);
    hubMotion.pause(true);
    setDivisionNotice('');
  }, [projectPhysics, modelMotion, hubMotion]);
  const advance = useCallback((step: number) => {
    if (modelGesture.current || overlayOpen) return;
    projectPhysics.step(step);
  }, [projectPhysics, overlayOpen]);
  const selectPlaceholder = (index: number) => projectPhysics.selectStep(projectSlots[index].logicalIndex);
  const openProject = (project: Project) => { projectPhysics.pause(true); modelMotion.slow(.06); hubMotion.pause(true); setDetailProject(project); };
  const openArchive = () => { projectPhysics.pause(true); modelMotion.slow(.06); hubMotion.pause(true); setArchiveDivision(null); setAllProjectsOpen(true); };

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || overlayOpen) return;
      event.preventDefault();
      if (modelGesture.current) return;
      const pixels = (event.deltaY || event.deltaX) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      projectPhysics.impulse(pixels);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [projectPhysics, overlayOpen]);

  const positionControls = useCallback((rotation: number, width: number, height: number, models: ModelScreenPosition[], slots?: ProjectScreenPosition[]) => {
    const core = hub.current;
    const diameter = `${getHubLayout(width, height).diameterPx}px`;
    if (core) {
      if (core.style.getPropertyValue('--hub-diameter') !== diameter) core.style.setProperty('--hub-diameter', diameter);
      const pulse = getHubScreenPulse(hubMotion.pose, height);
      core.style.setProperty('--hub-lift', `${pulse.liftPx}px`);
      core.style.setProperty('--hub-spin-y', `${pulse.rotationY}rad`);
    }
    const scale = Math.min(width, height) / getOrbitViewSize(width, height);
    const previewHeight = getOrbitPreviewHeight(width, height);
    const projectPositions = slots ?? getProjectPositions(rotation, PROJECT_SLOT_COUNT, width, height);
    for (let index = 0; index < PROJECT_SLOT_COUNT; index++) {
      const position = projectPositions[index];
      const button = projectButtons.current[index];
      if (button && position) {
        const moduleScale = button.classList.contains('is-active') ? PROJECT_PREVIEW_ACTIVE_SCALE : 1;
        button.style.transform = `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${position.scale})`;
        button.style.setProperty('--preview-width', `${ORBIT_PREVIEW_WIDTH * scale * moduleScale}px`);
        button.style.setProperty('--preview-height', `${previewHeight * scale * moduleScale}px`);
        button.dataset.hemisphere = position.y >= 0 ? 'lower' : 'upper';
        const slotDelta = ((rotation - index * 360 / PROJECT_SLOT_COUNT + 180) % 360 + 360) % 360 - 180;
        button.dataset.resting = Math.abs(slotDelta) < 3 ? 'true' : 'false';
      }
    }
    modelProjection.current = models;
    models.forEach((position, index) => {
      const button = modelButtons.current[index];
      if (button) {
        button.style.transform = `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`;
        button.style.width = `${Math.max(34, position.size ?? ORBIT_MODEL_SIZE * scale * position.scale)}px`;
        button.style.height = `${Math.max(34, position.size ?? ORBIT_MODEL_SIZE * scale * position.scale)}px`;
        button.style.zIndex = modelGesture.current?.index === index ? '8' : position.scale >= 1 ? '6' : '3';
        button.dataset.hemisphere = position.y >= 0 ? 'lower' : 'upper';
      }
    });
  }, [hubMotion]);

  // Accessible selectors continue to work if a device cannot create a WebGL context.
  useEffect(() => {
    if (sceneReady && !sceneFailed) return;
    let frame = 0, previous = performance.now();
    const animate = (time: number) => {
      const elapsed = Math.min(.05, (time - previous) / 1000); previous = time;
      projectPhysics.tick(elapsed); modelMotion.tick(elapsed, reducedMotion);
      hubMotion.tick(document.hidden ? 0 : elapsed, reducedMotion);
      const bounds = stage.current?.getBoundingClientRect();
      if (bounds) {
        const positions = getModelPositions(modelMotion, bounds.width, bounds.height, divisionIndex);
        positionControls(projectPhysics.rotation, bounds.width, bounds.height, positions);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [sceneReady, sceneFailed, projectPhysics, modelMotion, hubMotion, positionControls, reducedMotion, divisionIndex]);

  const angleAt = (event: ReactPointerEvent) => {
    const bounds = stage.current!.getBoundingClientRect();
    return Math.atan2((event.clientY - bounds.top - bounds.height / 2) / Math.cos(getOrbitTilt(bounds.width, bounds.height)), event.clientX - bounds.left - bounds.width / 2) * 180 / Math.PI;
  };
  const ringPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || overlayOpen || ringGesture.current || modelGesture.current || (event.target as HTMLElement).closest('.orbit-model-target')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    projectPhysics.beginDrag(); suppressClick.current = null;
    ringGesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, angle: angleAt(event), lastTime: performance.now(), moved: false, horizontal: Math.hypot(event.clientX - bounds.left - bounds.width / 2, event.clientY - bounds.top - bounds.height / 2) < Math.min(bounds.width, bounds.height) * .13 };
  };
  const ringPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!reducedMotion && event.pointerType !== 'touch' && !modelGesture.current) {
      const next = { x: (event.clientX - bounds.left) / bounds.width * 2 - 1, y: (event.clientY - bounds.top) / bounds.height * 2 - 1 };
      setPointer(next);
    }
    const active = ringGesture.current;
    if (!active || active.pointerId !== event.pointerId || modelGesture.current) return;
    if (!active.moved && Math.hypot(event.clientX - active.x, event.clientY - active.y) < 5) return;
    active.moved = true; setIsDraggingRing(true); event.currentTarget.setPointerCapture(event.pointerId);
    const now = performance.now(), angle = angleAt(event);
    let delta = angle - active.angle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    if (active.horizontal) delta = (event.clientX - active.x) * .4;
    projectPhysics.dragBy(delta, Math.max(.008, (now - active.lastTime) / 1000));
    active.angle = angle; active.x = event.clientX; active.y = event.clientY; active.lastTime = now;
  };
  const ringPointerEnd = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const active = ringGesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    ringGesture.current = null; suppressClick.current = active.moved ? { until: performance.now() + 500, target: null } : null;
    if (cancelled) projectPhysics.cancelDrag(); else projectPhysics.endDrag();
    setIsDraggingRing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const modelPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
    event.stopPropagation();
    if (!event.isPrimary || event.button !== 0 || overlayOpen || modelGesture.current || ringGesture.current) return;
    suppressClick.current = null;
    modelGesture.current = { pointerId: event.pointerId, index, target: event.currentTarget, x: event.clientX, y: event.clientY, lastTime: performance.now(), moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const modelPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const active = modelGesture.current;
    if (!active || active.pointerId !== event.pointerId || !stage.current) return;
    if (!active.moved && !isModelDrag(event.clientX - active.x, event.clientY - active.y)) return;
    event.preventDefault();
    if (!active.moved) { active.moved = true; modelMotion.beginDrag(active.index); projectPhysics.pause(true); setDraggedModel(active.index); }
    const bounds = stage.current.getBoundingClientRect(), now = performance.now();
    const unitsPerPixel = modelProjection.current[active.index]?.unitsPerPixel ?? getOrbitViewSize(bounds.width, bounds.height) / Math.min(bounds.width, bounds.height);
    modelMotion.dragBy(active.index, (event.clientX - active.x) * unitsPerPixel, -(event.clientY - active.y) * unitsPerPixel, Math.max(.008, (now - active.lastTime) / 1000));
    active.x = event.clientX; active.y = event.clientY; active.lastTime = now;
  };
  const modelPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    event.stopPropagation();
    const active = modelGesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    modelGesture.current = null;
    suppressClick.current = active.moved || cancelled ? { until: performance.now() + 500, target: active.target } : null;
    if (active.moved) { if (cancelled) modelMotion.cancelDrag(active.index); else modelMotion.endDrag(active.index); }
    projectPhysics.pause(overlayOpen);
    setDraggedModel(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <main id="main-content" ref={main} className={`projects-page orbital-experience independent-layers ${sceneReady && !sceneFailed ? 'has-webgl' : ''} ${overlayOpen ? 'has-overlay' : ''} ${isDraggingRing ? 'is-dragging' : ''} ${draggedModel !== null ? 'is-model-dragging' : ''} ${sceneFailed ? 'is-scene-fallback' : ''}`} aria-label="CSR-RIT project archive">
    <EngineeringEnvironment variant="projects" motion={projectPhysics} compact={compact} reducedMotion={reducedMotion} paused={overlayOpen} />
    <header className="orbital-topline"><p><span/>CSR-RIT / PROJECT ARCHIVE{archive.some(project => project.isDemo) && <small className="orbit-demo-badge">DEMO</small>}</p><label className="orbit-division-picker"><span>DIVISION</span><select aria-label="Choose division" value={selectedDivision.id} onChange={event => selectDivision(projectDivisions.findIndex(division => division.id === event.target.value))}>{projectDivisions.map(division => <option key={division.id} value={division.id}>{division.name}</option>)}</select></label><button onClick={openArchive}>All projects <span aria-hidden="true">↗</span></button></header>
    <div className="orbital-stage-wrap">
      <div ref={stage} className="orbital-stage" role="group" aria-label="Project selector ring. Scroll or drag the ring to browse projects. Drag and throw a floating division model, or click to open its division projects." tabIndex={0}
        onPointerDown={ringPointerDown} onPointerMove={ringPointerMove} onPointerUp={event => ringPointerEnd(event)} onPointerCancel={event => ringPointerEnd(event, true)} onLostPointerCapture={event => ringPointerEnd(event, true)}
        onPointerLeave={() => { if (ringGesture.current && !ringGesture.current.moved) { projectPhysics.cancelDrag(); ringGesture.current = null; setIsDraggingRing(false); } if (!ringGesture.current) setPointer({ x: 0, y: 0 }); }}
        onClickCapture={event => { if (event.detail === 0) return; const blocked = suppressClick.current; if (!blocked) return; if (performance.now() >= blocked.until) { suppressClick.current = null; return; } if (blocked.target && !blocked.target.contains(event.target as Node)) return; suppressClick.current = null; event.preventDefault(); event.stopPropagation(); }}
        onKeyDown={event => { if (overlayOpen || modelGesture.current || (event.target as HTMLElement).closest('.orbit-model-target')) return; if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); advance(event.key === 'ArrowRight' ? 1 : -1); } else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); focusProject(event.key === 'Home' ? 0 : archive.length - 1); } }}>
        <div className="orbital-canvas"><SceneBoundary onFailure={sceneUnavailable}><Suspense fallback={null}><OrbitScene projectPhysics={projectPhysics} modelMotion={modelMotion} hubMotion={hubMotion} selectedDivision={divisionIndex} projectCount={PROJECT_SLOT_COUNT} projects={archive} projectSlots={projectSlots} selectedProject={projectIndex} reducedMotion={reducedMotion} compact={compact} pointer={pointer} modelHoverIndex={hoveredModel} onSelect={selectDivision} onProjectClick={openProject} onPlaceholderClick={selectPlaceholder} onFrame={positionControls} onReady={sceneLoaded} onFailure={sceneUnavailable}/></Suspense></SceneBoundary></div>
        <button ref={hub} className="orbit-sun" onClick={openArchive} aria-label="RIT — show all CSR projects">
          <span className="orbit-disc-fallback">
            <span className="orbit-hub-face"><img src="/brand/rit-emblem.png" alt="Rajalakshmi Institute of Technology emblem"/><strong>CSR-RIT</strong><span>PROJECT ARCHIVE</span></span>
            <span className="orbit-hub-face orbit-hub-back" aria-hidden="true"><img src="/brand/rit-emblem.png" alt=""/><strong>CSR-RIT</strong><span>PROJECT ARCHIVE</span></span>
          </span>
        </button>
        <div className="project-ring-items">{projectSlots.map(({ id, project, index, projectIndex: recordIndex, title }) => <button key={id} ref={element => { projectButtons.current[index] = element; }} className={`ring-project ${projectIndex === index ? 'is-active' : ''} ${project ? '' : 'is-placeholder'}`} data-project-number={project ? (recordIndex ?? index) + 1 : undefined} aria-label={project ? `Open project ${(recordIndex ?? index) + 1}: ${title}` : `Coming soon — slot ${index + 1}`} aria-pressed={projectIndex === index} onClick={() => project ? openProject(project) : selectPlaceholder(index)}>
          <span className="ring-project-preview">{project?.images[0] ? <img key={project.id} src={project.images[0].src} alt={project.images[0].alt} loading="eager" draggable={false}/> : <img src={PROJECT_PLACEHOLDER_IMAGE} alt="" draggable={false}/>}<span>{String(project ? (recordIndex ?? index) + 1 : index + 1).padStart(2, '0')}</span></span><strong key={project?.id ?? id}>{title}</strong>
        </button>)}</div>
        <div className="orbital-model-targets">{projectDivisions.map((division, index) => <button key={division.id} ref={element => { modelButtons.current[index] = element; }} className={`orbit-model-target ${index === divisionIndex ? 'is-active' : ''} ${index === draggedModel ? 'is-dragged' : ''}`} onClick={() => selectDivision(index)} onPointerDown={event => modelPointerDown(event, index)} onPointerMove={modelPointerMove} onPointerUp={event => modelPointerEnd(event)} onPointerCancel={event => modelPointerEnd(event, true)} onLostPointerCapture={event => modelPointerEnd(event, true)} onPointerEnter={() => { modelMotion.setHovered(index, true); setHoveredModel(index); }} onPointerLeave={() => { modelMotion.setHovered(index, false); setHoveredModel(null); }} aria-label={`Explore ${division.name} projects. Drag and throw this model.`} aria-pressed={index === divisionIndex}><span className="model-fallback-icon" aria-hidden="true"><DivisionIcon index={index}/></span><span className="model-name">{division.name}<small>{index === draggedModel ? 'THROW · RELEASE TO RETURN' : 'EXPLORE · GRAB TO MOVE'}</small></span></button>)}</div>
      </div>
    </div>
    <section className="orbital-focus" aria-label="Current project">
      <button className="orbit-step" onClick={() => advance(-1)} aria-label="Previous project">←</button>
      <div className="orbital-focus-copy" key={selectedSlot.project?.id ?? selectedSlot.id} aria-live="polite" aria-atomic="true">
        <p className="orbital-selection-index">{currentDivision?.name ?? selectedDivision.name}{selectedProject && ` · PROJECT ${String((selectedSlot.projectIndex ?? projectIndex) + 1).padStart(2, '0')} / ${String(archive.length).padStart(2, '0')}`}</p>
        {selectedProject ? <><h1>{selectedProject.title}</h1><p className="orbital-project-summary">{selectedProject.shortDescription}</p><button className="orbital-primary" onClick={() => openProject(selectedProject)}>View {selectedProject.isDemo ? 'demo ' : ''}project <span aria-hidden="true">↗</span></button></> : <><h1 className="orbital-empty-title">Coming Soon</h1><p className="orbital-project-summary">This project slot is reserved for future work.</p><p className="orbital-pending-slot">SLOT {String(selectedSlot.index + 1).padStart(2, '0')} / 06</p></>}
      </div>
      <button className="orbit-step" onClick={() => advance(1)} aria-label="Next project">→</button>
    </section>
    <div className={`orbital-instructions ${divisionNotice ? 'has-notice' : ''}`} role={divisionNotice ? 'status' : undefined}><span>{divisionNotice || (compact ? 'SWIPE TO BROWSE · TAP FOR DIVISION PROJECTS · DRAG & THROW' : 'SCROLL TO BROWSE · CLICK FOR DIVISION PROJECTS · DRAG & THROW')}</span></div>
    <AllProjectsOverlay open={allProjectsOpen} archive={archive} initialDivision={archiveDivision} onClose={() => setAllProjectsOpen(false)} onOpenProject={openProject}/>
    <ProjectDossier project={detailProject} divisionName={projectDivisions.find(division => division.id === detailProject?.division)?.name ?? ''} projectNumber={detailProject ? archive.findIndex(project => project.id === detailProject.id) + 1 : undefined} onClose={() => setDetailProject(null)} backLabel={allProjectsOpen ? archiveDivision ? 'Back to division projects' : 'Back to all projects' : 'Back to orbit'}/>
  </main>;
}


