import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { memberDivisions, getMemberStats, searchMembers, getMemberInitials, type Member } from './data';
import { getMembers } from '../services/members';
import { useOrbitPhysics } from '../projects/useOrbitPhysics';
import { createHubMotionController } from '../projects/hub-motion';
import { getHubScreenPulse } from '../projects/hub-geometry';
import { getMemberHubLayout } from './hub-geometry';
import { getMemberBadgeLabel } from './badge-label';
import { getMemberWindow, nearestMemberStep, wrapMemberIndex } from './orbit-window';
import { projectMemberSlots, type MemberScreenPosition, type MemberHoverState } from './orbit-geometry';
import { MemberProfile, type MemberProfileOrigin } from './MemberProfile';
import { MemberDirectory } from './MemberDirectory';
import EngineeringEnvironment from '../background/EngineeringEnvironment';
import './members.css';

const MemberOrbitScene = lazy(() => import('./MemberOrbitScene'));
function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => { const media = window.matchMedia(query); const update = () => setMatches(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, [query]);
  return matches;
}
class MemberSceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}
type Gesture = { id: number; x: number; y: number; time: number; moved: boolean };

export default function MemberOrbitPage() {
  const compact = useMedia('(max-width: 760px)');
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const [capacity, setCapacity] = useState(compact ? 6 : 12);
  const [scope, setScope] = useState('all');
  const [allMembers, setAllMembers] = useState<readonly Member[]>([]);
  const [orbitMembers, setOrbitMembers] = useState<readonly Member[]>([]);
  const [memberDataLoading, setMemberDataLoading] = useState(true);
  const [memberDataError, setMemberDataError] = useState('');

  useEffect(() => {
    let active = true;
    getMembers().then(res => {
      if (!active) return;
      setMemberDataError(res.error ?? '');
      setAllMembers(res.error ? [] : res.members);
      setMemberDataLoading(false);
    }).catch(error => {
      if (!active) return;
      setMemberDataError(error instanceof Error ? error.message : 'Member records could not be loaded.');
      setAllMembers([]);
      setMemberDataLoading(false);
    });
    return () => { active = false; };
  }, []);

  const [focusStep, setFocusStep] = useState(0);
  const [transition, setTransition] = useState(1);
  const [query, setQuery] = useState('');
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [profile, setProfile] = useState<Member | null>(null);
  const [profileOrigin, setProfileOrigin] = useState<MemberProfileOrigin | null>(null);
  const [launch, setLaunch] = useState<{ member: Member; origin: MemberProfileOrigin } | null>(null);
  const [hover, setHover] = useState<MemberHoverState | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [hubMotion] = useState(createHubMotionController);
  const count = Math.max(1, Math.min(capacity, orbitMembers.length));
  const memberStats = useMemo(() => getMemberStats(allMembers), [allMembers]);
  const physics = useOrbitPhysics({ count, reducedMotion, onFocusStep: setFocusStep });
  const slots = useMemo(() => getMemberWindow(orbitMembers, focusStep, capacity), [orbitMembers, focusStep, capacity]);
  const focused = orbitMembers[wrapMemberIndex(focusStep, orbitMembers.length)];
  const focusedPosition = wrapMemberIndex(focusStep, count);
  const division = memberDivisions.find(candidate => candidate.id === scope);
  useEffect(() => {
    setOrbitMembers(scope === 'all' ? allMembers : allMembers.filter(member => member.divisionId === scope || member.division === division?.name));
  }, [allMembers, scope, division?.name]);
  const matches = useMemo(() => query.trim() ? searchMembers(allMembers, query) : [], [query, allMembers]);
  const overlayOpen = directoryOpen || Boolean(profile) || Boolean(launch);
  const stage = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLButtonElement>(null);
  const hubHover = useRef({ liftPx: 0, pointer: false, focused: false, time: 0 });
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionPending = useRef(false);
  const current = useRef({ orbitMembers, focusStep, capacity, overlayOpen });
  current.current = { orbitMembers, focusStep, capacity, overlayOpen };
  const sceneLoaded = useCallback(() => setSceneReady(true), []);
  const sceneUnavailable = useCallback(() => setSceneFailed(true), []);
  const openMemberDirectory = useCallback(() => {
    physics.cancelDrag(); gesture.current = null; suppressClick.current = false;
    setDragging(false); setHover(null); setQuery(''); setDirectoryOpen(true);
  }, [physics]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; if (transitionTimer.current) clearTimeout(transitionTimer.current); if (profileTimer.current) clearTimeout(profileTimer.current); };
  }, []);
  useEffect(() => { physics.pause(overlayOpen || transitionPending.current); }, [physics, overlayOpen]);
  useEffect(() => { hubMotion.pause(overlayOpen || dragging || transition === 0); }, [hubMotion, overlayOpen, dragging, transition]);

  const openProfile = useCallback((member: Member) => {
    if (current.current.overlayOpen || profileTimer.current) return;
    const slot = buttons.current.find(button => button?.dataset.memberId === member.id);
    const bounds = slot?.getBoundingClientRect();
    physics.cancelDrag(); setDragging(false); setHover(null);
    if (reducedMotion || !bounds) { setProfileOrigin(null); setProfile(member); return; }
    const origin = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    setLaunch({ member, origin });
    profileTimer.current = setTimeout(() => {
      setProfileOrigin({ x: origin.x - origin.width * .09, y: origin.y - origin.height * .09 - 18, width: origin.width * 1.18, height: origin.height * 1.18 });
      setProfile(member); setLaunch(null); profileTimer.current = null;
    }, 210);
  }, [physics, reducedMotion]);
  useEffect(() => {
    if (!launch) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (profileTimer.current) clearTimeout(profileTimer.current);
      profileTimer.current = null; setLaunch(null);
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, [launch]);

  const changeDataset = useCallback((records: readonly Member[], nextCapacity: number, targetIndex = 0, rotateIn = false) => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    physics.cancelDrag(); physics.pause(true);
    transitionPending.current = true;
    setDragging(false); gesture.current = null;
    setHover(null);
    setTransition(0);
    const commit = () => {
      const physicalCount = Math.max(1, Math.min(nextCapacity, records.length));
      const step = rotateIn && !reducedMotion ? targetIndex - 1 : targetIndex;
      setOrbitMembers(records); setCapacity(nextCapacity);
      physics.configure({ count: physicalCount });
      physics.setRotation(step * 360 / physicalCount);
      setFocusStep(step);
      setTransition(1);
      transitionPending.current = false;
      physics.pause(current.current.overlayOpen);
      if (rotateIn) physics.selectStep(targetIndex);
      transitionTimer.current = null;
    };
    if (reducedMotion) commit();
    else transitionTimer.current = setTimeout(commit, 230);
  }, [physics, reducedMotion]);

  useEffect(() => {
    const nextCapacity = compact ? 6 : 12;
    if (nextCapacity === current.current.capacity) return;
    const state = current.current;
    changeDataset(state.orbitMembers, nextCapacity, wrapMemberIndex(state.focusStep, state.orbitMembers.length));
  }, [compact, changeDataset]);

  const selectDivision = (id: string) => {
    setQuery('');
    if (id === scope && !transitionPending.current) return;
    setScope(id);
    changeDataset(id === 'all' ? allMembers : allMembers.filter(member => member.divisionId === id), capacity);
  };
  const focusMember = useCallback((member: Member) => {
    setQuery('');
    const state = current.current;
    const index = state.orbitMembers.findIndex(candidate => candidate.id === member.id);
    if (index >= 0) {
      const target = nearestMemberStep(state.focusStep, index, state.orbitMembers.length);
      if (Math.abs(target - state.focusStep) <= Math.floor(state.capacity / 2) || reducedMotion) physics.selectStep(target);
      else changeDataset(state.orbitMembers, state.capacity, index, true);
    } else {
      setScope('all');
      changeDataset(allMembers, state.capacity, allMembers.findIndex(candidate => candidate.id === member.id), true);
    }
  }, [physics, changeDataset, reducedMotion, allMembers]);

  useEffect(() => {
    if (matches.length !== 1 || query.trim().length < 2) return;
    const timer = setTimeout(() => focusMember(matches[0]), 280);
    return () => clearTimeout(timer);
  }, [query, matches, focusMember]);

  const positionControls = useCallback((_rotation: number, width: number, height: number, positions: MemberScreenPosition[]) => {
    const now = performance.now();
    const interaction = hubHover.current;
    const delta = interaction.time ? Math.min(.05, (now - interaction.time) / 1000) : 0;
    const hoverLift = !reducedMotion && !current.current.overlayOpen && (interaction.pointer || interaction.focused) ? 4 : 0;
    interaction.liftPx += (hoverLift - interaction.liftPx) * (reducedMotion ? 1 : 1 - Math.exp(-delta * 14));
    interaction.time = now;
    if (hub.current) {
      const pulse = getHubScreenPulse(hubMotion.pose, height);
      hub.current.style.setProperty('--member-hub-diameter', `${getMemberHubLayout(width, height, compact).diameterPx}px`);
      hub.current.style.setProperty('--member-hub-lift', `${pulse.liftPx + interaction.liftPx}px`);
      hub.current.style.setProperty('--member-hub-spin-y', `${pulse.rotationY}rad`);
    }
    positions.forEach(position => {
      const button = buttons.current[position.position];
      if (!button) return;
      button.style.transform = `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`;
      button.style.width = `${position.width}px`;
      button.style.height = `${position.height}px`;
      button.style.zIndex = String(Math.round(position.depth * 10) + 30);
      button.dataset.depth = position.depth > 0 ? 'front' : 'back';
      button.style.setProperty('--member-label-roll', `${-position.roll}rad`);
      button.style.setProperty('--member-label-yaw', `${position.yaw}rad`);
    });
  }, [hubMotion, compact, reducedMotion]);

  useEffect(() => {
    if (sceneReady && !sceneFailed) return;
    let frame = 0, previous = performance.now();
    const animate = (time: number) => {
      const delta = Math.min(.05, (time - previous) / 1000);
      physics.tick(delta); hubMotion.tick(document.hidden ? 0 : delta, reducedMotion); previous = time;
      const bounds = stage.current?.getBoundingClientRect();
      if (bounds) positionControls(physics.rotation, bounds.width, bounds.height, projectMemberSlots(physics.rotation, count, bounds.width, bounds.height, focusedPosition, compact, pointer, transition, hover));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [sceneReady, sceneFailed, physics, hubMotion, reducedMotion, count, focusedPosition, positionControls, compact, pointer, transition, hover]);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || current.current.overlayOpen || transitionPending.current) return;
      event.preventDefault();
      const pixels = (event.deltaY || event.deltaX) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      physics.impulse(pixels);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    const cancel = () => { physics.cancelDrag(); gesture.current = null; suppressClick.current = false; hubHover.current.pointer = false; hubHover.current.focused = false; setDragging(false); };
    window.addEventListener('blur', cancel);
    return () => { element.removeEventListener('wheel', wheel); window.removeEventListener('blur', cancel); };
  }, [physics]);

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || overlayOpen || transitionPending.current) return;
    setHover(null);
    suppressClick.current = false;
    physics.beginDrag();
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (overlayOpen || transitionPending.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!compact && !reducedMotion) setPointer({ x: (event.clientX - bounds.left) / bounds.width * 2 - 1, y: (event.clientY - bounds.top) / bounds.height * 2 - 1 });
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    if (!active.moved && Math.hypot(event.clientX - active.x, event.clientY - active.y) < 5) return;
    active.moved = true; setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    const now = performance.now();
    physics.dragBy((event.clientX - active.x) * (compact ? .5 : .32), Math.max(.008, (now - active.time) / 1000));
    active.x = event.clientX; active.y = event.clientY; active.time = now;
  };
  const pointerEnd = (event: ReactPointerEvent<HTMLDivElement>, cancel = false) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    gesture.current = null;
    suppressClick.current = active.moved && !cancel;
    if (cancel) physics.cancelDrag(); else physics.endDrag();
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <main id="main-content" className={`members-page ${sceneReady && !sceneFailed ? 'has-member-scene' : 'member-fallback'} ${dragging ? 'member-dragging' : ''} ${profile || directoryOpen ? 'member-overlay-open' : ''} ${launch ? 'member-profile-opening' : ''}`} aria-label="CSR Member Orbit">
    <EngineeringEnvironment variant="members" motion={physics} compact={compact} reducedMotion={reducedMotion} paused={overlayOpen || transition === 0} />
    <header className="member-topline">
      <div><p className="member-eyebrow"><span />CSR-RIT / MEMBER PORTFOLIO</p><h1>{memberDataLoading ? 'Loading' : memberDataError ? '—' : memberStats.total} {memberDataLoading ? 'members' : 'minds'}<span>.</span> <small>{memberDataLoading ? 'Loading roster statistics' : memberDataError ? 'Roster statistics unavailable' : `${memberStats.divisions} divisions · ${Object.entries(memberStats.byYear).map(([year, total]) => `${year.toUpperCase()} ${total}`).join(' · ') || 'No academic year records'}`}</small></h1>{memberDataError && <p role="status" className="member-data-status">Live member totals unavailable: {memberDataError}</p>}{!memberDataLoading && !memberDataError && !allMembers.length && <p role="status" className="member-data-status">No member records are currently available.</p>}</div>
      <div className="member-topline-actions"><span>{memberDataLoading ? 'LOADING PROFILES' : memberDataError ? 'PROFILES UNAVAILABLE' : memberStats.listed + ' LISTED PROFILES'}</span><button onClick={openMemberDirectory}>Directory <span aria-hidden="true">↗</span></button></div>
    </header>
    <div className="member-toolbar">
      <div className="member-filters" role="group" aria-label="Filter member orbit by division"><button aria-pressed={scope === 'all'} onClick={() => selectDivision('all')}>All members</button>{memberDivisions.map(item => <button key={item.id} aria-pressed={scope === item.id} onClick={() => selectDivision(item.id)}>{item.shortName}</button>)}</div>
      <div className="member-search"><label htmlFor="member-name-search" className="member-search-label">Search members</label><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input id="member-name-search" type="search" value={query} placeholder="Find a member" autoComplete="off" aria-controls="member-search-results" aria-expanded={Boolean(query.trim())} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setQuery(''); if (event.key === 'Enter' && matches[0]) { event.preventDefault(); focusMember(matches[0]); } }} />{query && <button aria-label="Clear member search" onClick={() => setQuery('')}>×</button>}
        {query.trim() && <div id="member-search-results" className="member-search-results"><p role="status">{matches.length ? `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}` : 'No matching members'}</p>{matches.slice(0, 6).map(member => <button key={member.id} onClick={() => focusMember(member)} aria-label={`Focus ${member.name} in orbit`}><strong>{member.name}</strong><span>{member.division}</span></button>)}{matches.length > 6 && <small>Refine the name or browse the directory.</small>}</div>}
      </div>
    </div>
    <div className="member-orbit-region">
      <div className="member-scope-label" aria-live="polite"><p>{division?.name ?? 'CSR MEMBER ORBIT'} <span>{orbitMembers.length} MEMBERS</span></p>{division?.lead ? <small>DIVISION LEAD <strong>{division.lead}</strong></small> : <small>Explore the people behind CSR.</small>}</div>
      <div ref={stage} className="member-orbit-stage" role="group" aria-label="Member orbit. Scroll or drag to browse. Arrow keys select the next or previous member." tabIndex={0} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event => pointerEnd(event)} onPointerCancel={event => pointerEnd(event, true)} onLostPointerCapture={event => pointerEnd(event, true)} onPointerLeave={() => { if (gesture.current && !gesture.current.moved) { physics.cancelDrag(); gesture.current = null; } if (!gesture.current) setPointer({ x: 0, y: 0 }); setHover(null); }} onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }} onKeyDown={event => { if (overlayOpen) return; if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); physics.step(event.key === 'ArrowRight' ? 1 : -1); } else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); focusMember(event.key === 'Home' ? orbitMembers[0] : orbitMembers[orbitMembers.length - 1]); } }}>
        <div className="member-canvas"><MemberSceneBoundary onFailure={sceneUnavailable}><Suspense fallback={null}><MemberOrbitScene slots={slots} physics={physics} hubMotion={hubMotion} hubHover={hubHover} focusedPosition={focusedPosition} compact={compact} reducedMotion={reducedMotion} pointer={pointer} hover={hover} transition={transition} onMemberClick={openProfile} onFrame={positionControls} onReady={sceneLoaded} onFailure={sceneUnavailable} /></Suspense></MemberSceneBoundary></div>
        <button ref={hub} className="member-hub" onClick={openMemberDirectory} aria-label="CSR-RIT — open Member Directory" aria-haspopup="dialog" aria-expanded={directoryOpen} title="Open Member Directory" onPointerDown={event => { event.stopPropagation(); suppressClick.current = false; }} onKeyDown={event => event.stopPropagation()} onPointerEnter={event => { hubHover.current.pointer = event.pointerType !== 'touch'; setHover(null); }} onPointerLeave={() => { hubHover.current.pointer = false; }} onFocus={event => { hubHover.current.focused = event.currentTarget.matches(':focus-visible'); }} onBlur={() => { hubHover.current.focused = false; }}><span className="member-hub-disc" aria-hidden="true">{[false, true].map(back => <span key={String(back)} className={`member-hub-face ${back ? 'member-hub-face-back' : ''}`}><img src="/brand/rit-emblem.png" alt=""/><strong>CSR-RIT</strong><small>MEMBER PORTFOLIO</small></span>)}</span></button>
        <div className="member-hit-targets" style={{ opacity: transition }}>{slots.map(slot => <button key={slot.position} ref={element => { buttons.current[slot.position] = element; }} className={`member-node ${slot.position === focusedPosition ? 'is-focused' : ''} ${hover?.position === slot.position ? 'is-hovered' : ''}`} data-member-id={slot.member.id} aria-label={`View member portfolio: ${slot.member.name}`} aria-pressed={slot.position === focusedPosition} onPointerMove={event => { if (compact || reducedMotion || gesture.current || overlayOpen) return; const bounds = event.currentTarget.getBoundingClientRect(); setHover({ position: slot.position, x: Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1)), y: Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1)) }); }} onPointerLeave={() => setHover(null)} onFocus={() => { if (!reducedMotion) setHover({ position: slot.position, x: 0, y: 0 }); }} onBlur={() => setHover(null)} onClick={() => openProfile(slot.member)}><span className={`member-badge-label ${slot.member.name.length > 27 ? 'has-long-name' : ''}`} key={slot.member.id} aria-hidden="true"><b>{getMemberBadgeLabel(slot.member).initials}</b><strong>{slot.member.name}</strong>{slot.position === focusedPosition && <small>{getMemberBadgeLabel(slot.member, true).divisionShort}</small>}</span><span className="member-node-fallback"><b>{getMemberInitials(slot.member.name)}</b><strong>{slot.member.name}</strong><small>{slot.member.division}</small></span></button>)}</div>
      </div>
      <span className="member-axis-label member-axis-left" aria-hidden="true">RIT / PEOPLE & POSSIBILITIES</span><span className="member-axis-label member-axis-right" aria-hidden="true">{String(wrapMemberIndex(focusStep, orbitMembers.length) + 1).padStart(3, '0')} / {orbitMembers.length}</span>
    </div>
    <section className="member-focus" aria-label="Focused member">
      <button className="member-step" aria-label="Previous member" onClick={() => physics.step(-1)}>←</button>
      {focused && <div className={`member-focus-copy ${focused.name.length > 27 ? 'has-long-name' : ''}`} key={focused.id} aria-live="polite" aria-atomic="true"><p>{focused.division}{focused.role === 'Division Lead' && <span>DIVISION LEAD</span>}</p><h2>{focused.name}</h2><div className="member-focus-meta">{focused.year && <span>{focused.year}</span>}{focused.department && <span>{focused.department}</span>}</div><button className="member-profile-link" onClick={() => openProfile(focused)}>View portfolio <span aria-hidden="true">↗</span></button></div>}
      <button className="member-step" aria-label="Next member" onClick={() => physics.step(1)}>→</button>
    </section>
    <footer className="member-instructions"><span>{compact ? 'SWIPE TO EXPLORE · TAP A BADGE' : 'SCROLL OR DRAG TO EXPLORE · SELECT A BADGE TO MEET A MEMBER'}</span><span>{allMembers.length} named profiles from the member roster</span></footer>
    {launch && <div className="member-launch-card" aria-hidden="true" style={{ left: launch.origin.x, top: launch.origin.y, width: launch.origin.width, height: launch.origin.height }}><span>CSR / MEMBER</span><b>{getMemberInitials(launch.member.name)}</b><strong>{launch.member.name}</strong><small>{launch.member.division}</small></div>}
    <MemberProfile member={profile} origin={profileOrigin} onClose={() => { setProfile(null); setProfileOrigin(null); }} />
    <MemberDirectory open={directoryOpen} members={allMembers} divisions={memberDivisions} onClose={() => setDirectoryOpen(false)} onSelect={focusMember} />
  </main>;
}
