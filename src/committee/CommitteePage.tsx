import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import EngineeringEnvironment from '../background/EngineeringEnvironment';
import { createHubMotionController } from '../projects/hub-motion';
import { getHubScreenPulse } from '../projects/hub-geometry';
import { getMemberHubLayout } from '../members/hub-geometry';
import { useOrbitPhysics } from '../projects/useOrbitPhysics';
import { getMemberWindow, nearestMemberStep, wrapMemberIndex } from '../members/orbit-window';
import { getMemberInitials, type Member } from '../members/data';
import { getMemberBadgeLabel } from '../members/badge-label';
import { getDivisionAccent } from '../members/division-accent';
import { getBillboardMembers } from '../services/billboard';
import { MemberProfile, type MemberProfileOrigin } from '../members/MemberProfile';
import type { CsrBillboardMember } from '../types/database.types';
import type { MemberHoverState, MemberScreenPosition } from '../members/MemberOrbitScene';
import '../members/members.css';
import './committee.css';

const MemberOrbitScene = lazy(() => import('../members/MemberOrbitScene'));

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

class CommitteeSceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type Gesture = { id: number; x: number; y: number; time: number; moved: boolean };

export interface ExecutiveLeader extends Member {
  readonly tier: 'founding' | 'board' | 'council';
  readonly tierLabel: string;
  readonly badgeInitials: string;
  readonly highlightRole?: string;
  readonly bio?: string;
}

const STATIC_FOUNDERS: ExecutiveLeader[] = [
  {
    id: 'founder-001',
    name: 'Varun S',
    role: 'Founder & Technical Lead',
    highlightRole: 'Founder & Technical Lead',
    division: 'AI & Intelligent Systems',
    divisionId: 'ai',
    year: 'III Year',
    department: 'Electronics and Communication Engineering',
    tier: 'founding',
    tierLabel: 'Founding Leadership',
    badgeInitials: 'VS',
    bio: 'Founding architect of the CSR-RIT engineering ecosystem. Directs overarching technical architecture, research initiatives, and division infrastructure across student engineering cohorts.',
  },
  {
    id: 'founder-002',
    name: 'Lingeshram',
    role: 'Co-Founder & Administrative Head',
    highlightRole: 'Co-Founder & Administrative Head',
    division: 'Embedded & Electronics',
    divisionId: 'embedded',
    year: 'III Year',
    department: 'VLSI Design & Technology',
    tier: 'founding',
    tierLabel: 'Founding Leadership',
    badgeInitials: 'LR',
    bio: 'Co-founder supervising institutional partnerships, division governance, and operational execution for student innovation at Rajalakshmi Institute of Technology.',
  },
  {
    id: 'founder-003',
    name: 'Roger L Christopher',
    role: 'Co-Founder',
    highlightRole: 'Co-Founder',
    division: 'Software Engineering',
    divisionId: 'software',
    year: 'III Year',
    department: 'Computer Science and Business Systems',
    tier: 'founding',
    tierLabel: 'Founding Leadership',
    badgeInitials: 'RC',
    bio: 'Co-founder spearheading community strategy, industry collaboration pipelines, and cross-departmental project incubation.',
  },
];

const STATIC_BOARD: ExecutiveLeader[] = [
  {
    id: 'board-001',
    name: 'Priyadharshini',
    role: 'Deputy Technical Lead',
    highlightRole: 'Deputy Technical Lead',
    division: 'Embedded & Electronics',
    divisionId: 'embedded',
    year: 'II Year',
    department: 'Electronics and Communication Engineering',
    tier: 'board',
    tierLabel: 'Administrative Board',
    badgeInitials: 'PD',
    bio: 'Directs cross-division engineering cohorts, code-review governance, and technical workshop curricula.',
  },
  {
    id: 'board-002',
    name: 'Anto Merray',
    role: 'Secretary',
    highlightRole: 'Executive Secretary',
    division: 'Software Engineering',
    divisionId: 'software',
    year: 'III Year',
    department: 'Computer Science and Business Systems',
    tier: 'board',
    tierLabel: 'Administrative Board',
    badgeInitials: 'AM',
    bio: 'Oversees organizational records, administrative correspondence, meeting records, and university governance alignment.',
  },
  {
    id: 'board-003',
    name: 'Pooja S',
    role: 'Secretary',
    highlightRole: 'Executive Secretary',
    division: 'Embedded & Electronics',
    divisionId: 'embedded',
    year: 'III Year',
    department: 'VLSI Design & Technology',
    tier: 'board',
    tierLabel: 'Administrative Board',
    badgeInitials: 'PS',
    bio: 'Coordinates community administration, cohort schedules, and executive communications.',
  },
  {
    id: 'board-004',
    name: 'Paul Bryton Raj',
    role: 'Joint Secretary',
    highlightRole: 'Joint Secretary',
    division: 'Software Engineering',
    divisionId: 'software',
    year: 'II Year',
    department: 'Computer Science and Engineering',
    tier: 'board',
    tierLabel: 'Administrative Board',
    badgeInitials: 'PR',
    bio: 'Assists in secretarial operations, student engagement initiatives, and inter-division hackathons.',
  },
  {
    id: 'board-005',
    name: 'Sadhana Sri',
    role: 'Joint Secretary',
    highlightRole: 'Joint Secretary',
    division: 'AI & Intelligent Systems',
    divisionId: 'ai',
    year: 'II Year',
    department: 'Artificial Intelligence and Data Science',
    tier: 'board',
    tierLabel: 'Administrative Board',
    badgeInitials: 'SS',
    bio: 'Supports administrative initiatives, cohort communications, and division student onboarding.',
  },
  {
    id: 'board-006',
    name: 'G S Kowshik kumar',
    role: 'Treasurer',
    highlightRole: 'Chief Treasurer',
    division: 'Embedded & Electronics',
    divisionId: 'embedded',
    year: 'III Year',
    department: 'VLSI Design & Technology',
    tier: 'board',
    tierLabel: 'Administrative Board',
    badgeInitials: 'KK',
    bio: 'Manages treasury allocations, hardware lab equipment procurement, and financial ledgers.',
  },
  {
    id: 'board-007',
    name: 'Mohamed Mufrih S',
    role: 'Joint Treasurer',
    highlightRole: 'Joint Treasurer',
    division: 'Embedded & Electronics',
    divisionId: 'embedded',
    year: 'III Year',
    department: 'VLSI Design & Technology',
    tier: 'board',
    tierLabel: 'Administrative Board',
    badgeInitials: 'MM',
    bio: 'Assists in financial planning, event budget logistics, and resource management.',
  },
  {
    id: 'board-008',
    name: 'Padmavathy s',
    role: 'Public Relations Officer',
    highlightRole: 'Public Relations Officer',
    division: 'Embedded & Electronics',
    divisionId: 'embedded',
    year: 'III Year',
    department: 'VLSI Design & Technology',
    tier: 'board',
    tierLabel: 'Administrative Board',
    badgeInitials: 'PV',
    bio: 'Leads external community branding, institutional announcements, and campus media outreach.',
  },
];

export default function CommitteePage() {
  const compact = useMedia('(max-width: 760px)');
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const [capacity, setCapacity] = useState(compact ? 6 : 12);
  const [scope, setScope] = useState<'all' | 'founding' | 'board' | 'council'>('all');
  const [billboard, setBillboard] = useState<CsrBillboardMember[]>([]);

  // Load billboard members dynamically from Supabase
  useEffect(() => {
    let active = true;
    getBillboardMembers().then(res => {
      if (!active) return;
      setBillboard(res.items || []);
    });
    return () => {
      active = false;
    };
  }, []);

  // Map dynamic billboard members
  const dynamicCouncil = useMemo<ExecutiveLeader[]>(() => {
    return billboard
      .filter(item => Boolean(item.name && item.name.trim()))
      .map((item, idx) => {
        const divName = item.division || 'Software Engineering';
        const divId = divName.toLowerCase().includes('ai')
          ? 'ai'
          : divName.toLowerCase().includes('embed')
          ? 'embedded'
          : divName.toLowerCase().includes('robot')
          ? 'robotics'
          : divName.toLowerCase().includes('soft')
          ? 'software'
          : divName.toLowerCase().includes('iot')
          ? 'iot'
          : divName.toLowerCase().includes('operat')
          ? 'operations'
          : 'research';

        return {
          id: `council-${item.position || idx + 1}`,
          name: item.name,
          role: item.title || 'Executive Council Member',
          highlightRole: item.title || 'Executive Council Member',
          division: divName,
          divisionId: divId,
          year: item.year || 'II Year',
          department: item.department || 'Computer Science and Engineering',
          tier: 'council',
          tierLabel: 'Executive Council Billboard',
          badgeInitials: getMemberInitials(item.name),
          bio: `Representative council leader serving on the CSR-RIT Executive Billboard representing ${divName}.`,
        };
      });
  }, [billboard]);

  // Combined full leadership roster
  const allLeaders = useMemo<ExecutiveLeader[]>(() => {
    return [...STATIC_FOUNDERS, ...STATIC_BOARD, ...dynamicCouncil];
  }, [dynamicCouncil]);

  // Filtered dataset according to active scope
  const orbitLeaders = useMemo<ExecutiveLeader[]>(() => {
    if (scope === 'all') return allLeaders;
    return allLeaders.filter(l => l.tier === scope);
  }, [allLeaders, scope]);

  const [focusStep, setFocusStep] = useState(0);
  const [transition, setTransition] = useState(1);
  const [query, setQuery] = useState('');
  const [profile, setProfile] = useState<Member | null>(null);
  const [profileOrigin, setProfileOrigin] = useState<MemberProfileOrigin | null>(null);
  const [launch, setLaunch] = useState<{ member: Member; origin: MemberProfileOrigin } | null>(null);
  const [hover, setHover] = useState<MemberHoverState | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [hubMotion] = useState(createHubMotionController);

  const count = Math.max(1, Math.min(capacity, orbitLeaders.length));
  const physics = useOrbitPhysics({ count, reducedMotion, onFocusStep: setFocusStep });
  const slots = useMemo(() => getMemberWindow(orbitLeaders, focusStep, capacity), [orbitLeaders, focusStep, capacity]);
  const focused = orbitLeaders[wrapMemberIndex(focusStep, orbitLeaders.length)];
  const focusedPosition = wrapMemberIndex(focusStep, count);

  const stage = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLButtonElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const hubHover = useRef({ pointer: false, focused: false, liftPx: 0, time: 0 });
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const transitionPending = useRef(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = useRef({
    capacity,
    focusStep,
    orbitLeaders,
    overlayOpen: Boolean(profile),
  });
  current.current = {
    capacity,
    focusStep,
    orbitLeaders,
    overlayOpen: Boolean(profile),
  };

  const sceneLoaded = useCallback(() => {
    setSceneReady(true);
    setSceneFailed(false);
  }, []);

  const sceneUnavailable = useCallback(() => {
    setSceneFailed(true);
  }, []);

  const changeDataset = useCallback(
    (records: readonly ExecutiveLeader[], targetCapacity: number, targetIndex = 0, rotateIn = false) => {
      if (!records.length) return;
      transitionPending.current = true;
      setTransition(0);
      if (transitionTimer.current) clearTimeout(transitionTimer.current);

      const commit = () => {
        setCapacity(targetCapacity);
        physics.configure({ count: Math.max(1, Math.min(targetCapacity, records.length)) });
        setFocusStep(targetIndex);
        physics.setRotation(targetIndex * (360 / Math.max(1, Math.min(targetCapacity, records.length))));
        transitionPending.current = false;
        setTransition(1);
        if (rotateIn) physics.selectStep(targetIndex);
        transitionTimer.current = null;
      };

      if (reducedMotion) commit();
      else transitionTimer.current = setTimeout(commit, 230);
    },
    [physics, reducedMotion]
  );

  useEffect(() => {
    const nextCapacity = compact ? 6 : 12;
    if (nextCapacity === current.current.capacity) return;
    const state = current.current;
    changeDataset(state.orbitLeaders, nextCapacity, wrapMemberIndex(state.focusStep, state.orbitLeaders.length));
  }, [compact, changeDataset]);

  const selectTier = (id: 'all' | 'founding' | 'board' | 'council') => {
    setQuery('');
    if (id === scope && !transitionPending.current) return;
    setScope(id);
    const subset = id === 'all' ? allLeaders : allLeaders.filter(l => l.tier === id);
    changeDataset(subset, capacity);
  };

  const focusLeader = useCallback(
    (leader: ExecutiveLeader) => {
      setQuery('');
      const state = current.current;
      const index = state.orbitLeaders.findIndex(candidate => candidate.id === leader.id);
      if (index >= 0) {
        const target = nearestMemberStep(state.focusStep, index, state.orbitLeaders.length);
        if (Math.abs(target - state.focusStep) <= Math.floor(state.capacity / 2) || reducedMotion) {
          physics.selectStep(target);
        } else {
          changeDataset(state.orbitLeaders, state.capacity, index, true);
        }
      } else {
        setScope('all');
        changeDataset(allLeaders, state.capacity, allLeaders.findIndex(c => c.id === leader.id), true);
      }
    },
    [physics, changeDataset, reducedMotion, allLeaders]
  );

  // Real-time search matches
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allLeaders.filter(
      l =>
        l.name.toLowerCase().includes(q) ||
        (l.role && l.role.toLowerCase().includes(q)) ||
        (l.department && l.department.toLowerCase().includes(q)) ||
        (l.division && l.division.toLowerCase().includes(q))
    );
  }, [allLeaders, query]);

  useEffect(() => {
    if (matches.length !== 1 || query.trim().length < 2) return;
    const timer = setTimeout(() => focusLeader(matches[0]), 280);
    return () => clearTimeout(timer);
  }, [query, matches, focusLeader]);

  const positionControls = useCallback(
    (_rotation: number, width: number, height: number, positions: MemberScreenPosition[]) => {
      const now = performance.now();
      const interaction = hubHover.current;
      const delta = interaction.time ? Math.min(0.05, (now - interaction.time) / 1000) : 0;
      const hoverLift =
        !reducedMotion && !current.current.overlayOpen && (interaction.pointer || interaction.focused) ? 4 : 0;
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
    },
    [compact, hubMotion, reducedMotion]
  );

  const openLeaderProfile = (leader: Member, element?: HTMLElement | null) => {
    if (element) {
      const bounds = element.getBoundingClientRect();
      const origin = { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height };
      setProfileOrigin(origin);
      setLaunch({ member: leader, origin });
      setTimeout(() => setLaunch(null), 240);
    } else {
      setProfileOrigin(null);
    }
    setProfile(leader);
  };

  // Wheel interaction
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || current.current.overlayOpen || transitionPending.current) return;
      event.preventDefault();
      const pixels =
        (event.deltaY || event.deltaX) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      physics.impulse(pixels);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    const cancel = () => {
      physics.cancelDrag();
      gesture.current = null;
      suppressClick.current = false;
      hubHover.current.pointer = false;
      hubHover.current.focused = false;
      setDragging(false);
    };
    window.addEventListener('blur', cancel);
    return () => {
      element.removeEventListener('wheel', wheel);
      window.removeEventListener('blur', cancel);
    };
  }, [physics]);

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || current.current.overlayOpen || transitionPending.current) return;
    setHover(null);
    suppressClick.current = false;
    physics.beginDrag();
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
  };

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (current.current.overlayOpen || transitionPending.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!compact && !reducedMotion) {
      setPointer({
        x: ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        y: ((event.clientY - bounds.top) / bounds.height) * 2 - 1,
      });
    }
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    if (!active.moved && Math.hypot(event.clientX - active.x, event.clientY - active.y) < 5) return;
    active.moved = true;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    const now = performance.now();
    physics.dragBy((event.clientX - active.x) * (compact ? 0.5 : 0.32), Math.max(0.008, (now - active.time) / 1000));
    active.x = event.clientX;
    active.y = event.clientY;
    active.time = now;
  };

  const pointerEnd = (event: ReactPointerEvent<HTMLDivElement>, cancel = false) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    gesture.current = null;
    suppressClick.current = active.moved && !cancel;
    if (cancel) physics.cancelDrag();
    else physics.endDrag();
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const tierStats = useMemo(() => {
    return {
      total: allLeaders.length,
      founders: STATIC_FOUNDERS.length,
      board: STATIC_BOARD.length,
      council: dynamicCouncil.length,
    };
  }, [allLeaders.length, dynamicCouncil.length]);

  return (
    <main
      id="main-content"
      className={`members-page committee-page ${
        sceneReady && !sceneFailed ? 'has-member-scene' : 'member-fallback'
      } ${dragging ? 'member-dragging' : ''} ${profile ? 'member-overlay-open' : ''} ${
        launch ? 'member-profile-opening' : ''
      }`}
      aria-label="CSR-RIT Core Committee 3D Leadership Orbit"
    >
      <EngineeringEnvironment
        variant="members"
        motion={physics}
        compact={compact}
        reducedMotion={reducedMotion}
        paused={Boolean(profile) || transition === 0}
      />

      {/* Row 1: Topline Header */}
      <header className="member-topline">
        <div>
          <p className="member-eyebrow">
            <span />
            CSR-RIT / EXECUTIVE ADMINISTRATION
          </p>
          <h1>
            {tierStats.total} Leaders<span>.</span>{' '}
            <small>
              {tierStats.founders} FOUNDERS · {tierStats.board} ADMINISTRATIVE BOARD · {tierStats.council} COUNCIL MINDS
            </small>
          </h1>
        </div>

        <div className="member-topline-actions">
          <span>{allLeaders.length} EXECUTIVE PROFILES</span>
        </div>
      </header>

      {/* Row 2: Executive Tier Filter Toolbar */}
      <div className="member-toolbar committee-toolbar">
        <div className="member-filters" role="group" aria-label="Filter leadership orbit by tier">
          <button aria-pressed={scope === 'all'} onClick={() => selectTier('all')}>
            All Leaders ({allLeaders.length})
          </button>
          <button
            aria-pressed={scope === 'founding'}
            onClick={() => selectTier('founding')}
            style={{ '--accent': '#C28B10' } as CSSProperties}
          >
            <span className="member-filter-dot" style={{ background: '#C28B10' }} aria-hidden="true" />
            ★ Founders ({STATIC_FOUNDERS.length})
          </button>
          <button
            aria-pressed={scope === 'board'}
            onClick={() => selectTier('board')}
            style={{ '--accent': '#118AC6' } as CSSProperties}
          >
            <span className="member-filter-dot" style={{ background: '#118AC6' }} aria-hidden="true" />
            ✦ Admin Board ({STATIC_BOARD.length})
          </button>
          <button
            aria-pressed={scope === 'council'}
            onClick={() => selectTier('council')}
            style={{ '--accent': '#5457D6' } as CSSProperties}
          >
            <span className="member-filter-dot" style={{ background: '#5457D6' }} aria-hidden="true" />
            ◆ Executive Council ({dynamicCouncil.length})
          </button>
        </div>

        {/* Quick Search across leaders */}
        <div className="member-search">
          <label htmlFor="committee-leader-search" className="member-search-label">
            Search leaders
          </label>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="10" cy="10" r="6" />
            <path d="m15 15 5 5" />
          </svg>
          <input
            id="committee-leader-search"
            type="search"
            value={query}
            placeholder="Find an executive leader"
            autoComplete="off"
            aria-controls="committee-search-results"
            aria-expanded={Boolean(query.trim())}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Escape') setQuery('');
              if (event.key === 'Enter' && matches[0]) {
                event.preventDefault();
                focusLeader(matches[0]);
              }
            }}
          />
          {query && (
            <button aria-label="Clear leader search" onClick={() => setQuery('')}>
              ×
            </button>
          )}

          {query.trim() && (
            <div id="committee-search-results" className="member-search-results">
              <p role="status">
                {matches.length ? `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}` : 'No matching leaders'}
              </p>
              {matches.slice(0, 6).map(leader => (
                <button
                  key={leader.id}
                  onClick={() => focusLeader(leader)}
                  aria-label={`Focus ${leader.name} in 3D orbit`}
                >
                  <strong>{leader.name}</strong>
                  <span>{leader.role || leader.department}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: 3D Three.js Leadership Orbit Stage */}
      <div className="member-orbit-region">
            <div className="member-scope-label" aria-live="polite">
              <p>
                {scope === 'founding'
                  ? 'FOUNDING ARCHITECTS'
                  : scope === 'board'
                  ? 'ADMINISTRATIVE BOARD'
                  : scope === 'council'
                  ? 'EXECUTIVE COUNCIL BILLBOARD'
                  : 'CSR LEADERSHIP CONSTELLATION'}{' '}
                <span>{orbitLeaders.length} EXECUTIVES</span>
              </p>
              <small>
                {scope === 'founding'
                  ? 'Founding visionaries who established CSR-RIT.'
                  : scope === 'board'
                  ? 'Office bearers driving technical direction & student governance.'
                  : scope === 'council'
                  ? 'Elected representative council minds.'
                  : 'Interactive 3D Leadership & Governance Orbit.'}
              </small>
            </div>

            <div
              ref={stage}
              className="member-orbit-stage"
              role="group"
              aria-label="Executive leadership orbit. Scroll or drag to browse. Arrow keys select next or previous leader."
              tabIndex={0}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={event => pointerEnd(event)}
              onPointerCancel={event => pointerEnd(event, true)}
              onLostPointerCapture={event => pointerEnd(event, true)}
              onPointerLeave={() => {
                if (gesture.current && !gesture.current.moved) {
                  physics.cancelDrag();
                  gesture.current = null;
                }
                if (!gesture.current) setPointer({ x: 0, y: 0 });
                setHover(null);
              }}
              onClickCapture={event => {
                if (suppressClick.current) {
                  event.preventDefault();
                  event.stopPropagation();
                  suppressClick.current = false;
                }
              }}
              onKeyDown={event => {
                if (profile) return;
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                  event.preventDefault();
                  physics.step(event.key === 'ArrowRight' ? 1 : -1);
                } else if (event.key === 'Home' || event.key === 'End') {
                  event.preventDefault();
                  focusLeader(event.key === 'Home' ? orbitLeaders[0] : orbitLeaders[orbitLeaders.length - 1]);
                }
              }}
            >
              {/* 3D WebGL Canvas */}
              <div className="member-canvas">
                <CommitteeSceneBoundary onFailure={sceneUnavailable}>
                  <Suspense fallback={null}>
                    <MemberOrbitScene
                      slots={slots}
                      physics={physics}
                      hubMotion={hubMotion}
                      hubHover={hubHover}
                      focusedPosition={focusedPosition}
                      compact={compact}
                      reducedMotion={reducedMotion}
                      pointer={pointer}
                      hover={hover}
                      transition={transition}
                      onMemberClick={openLeaderProfile}
                      onFrame={positionControls}
                      onReady={sceneLoaded}
                      onFailure={sceneUnavailable}
                    />
                  </Suspense>
                </CommitteeSceneBoundary>
              </div>

              {/* Central 3D Medallion Disc */}
              <button
                ref={hub}
                className="member-hub committee-hub"
                onClick={() => physics.step(1)}
                aria-label="CSR-RIT Leadership Core — Step Orbit"
                title="CSR-RIT Leadership Core"
                onPointerDown={event => {
                  event.stopPropagation();
                  suppressClick.current = false;
                }}
                onKeyDown={event => event.stopPropagation()}
                onPointerEnter={event => {
                  hubHover.current.pointer = event.pointerType !== 'touch';
                  setHover(null);
                }}
                onPointerLeave={() => {
                  hubHover.current.pointer = false;
                }}
                onFocus={event => {
                  hubHover.current.focused = event.currentTarget.matches(':focus-visible');
                }}
                onBlur={() => {
                  hubHover.current.focused = false;
                }}
              >
                <span className="member-hub-disc" aria-hidden="true">
                  {[false, true].map(back => (
                    <span
                      key={String(back)}
                      className={`member-hub-face ${back ? 'member-hub-face-back' : ''}`}
                    >
                      <img src="/brand/rit-emblem.png" alt="" />
                      <strong>CSR-RIT</strong>
                      <small>CORE COMMITTEE</small>
                    </span>
                  ))}
                </span>
              </button>

              {/* DOM Hit Targets for sharp badges & accessibility */}
              <div className="member-hit-targets" style={{ opacity: transition }}>
                {slots.map(slot => {
                  const leader = slot.member as ExecutiveLeader;
                  const accentColor =
                    leader.tier === 'founding' ? '#C28B10' : getDivisionAccent(leader).accent;

                  return (
                    <button
                      key={slot.position}
                      ref={element => {
                        buttons.current[slot.position] = element;
                      }}
                      className={`member-node ${
                        slot.position === focusedPosition ? 'is-focused' : ''
                      } ${hover?.position === slot.position ? 'is-hovered' : ''} ${
                        leader.tier === 'founding' ? 'is-founder-badge' : ''
                      }`}
                      data-member-id={leader.id}
                      style={{ '--accent': accentColor } as CSSProperties}
                      aria-label={`View executive profile: ${leader.name}`}
                      aria-pressed={slot.position === focusedPosition}
                      onPointerMove={event => {
                        if (compact || reducedMotion || gesture.current || profile) return;
                        const bounds = event.currentTarget.getBoundingClientRect();
                        setHover({
                          position: slot.position,
                          x: Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1)),
                          y: Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1)),
                        });
                      }}
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => {
                        if (!reducedMotion) setHover({ position: slot.position, x: 0, y: 0 });
                      }}
                      onBlur={() => setHover(null)}
                      onClick={() => openLeaderProfile(leader)}
                    >
                      <span className="member-badge-label" key={leader.id} aria-hidden="true">
                        <b>{leader.badgeInitials || getMemberBadgeLabel(leader).initials}</b>
                      </span>
                      <span className="member-node-fallback">
                        <b>{leader.badgeInitials || getMemberInitials(leader.name)}</b>
                        <small>{leader.role || leader.division}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <span className="member-axis-label member-axis-left" aria-hidden="true">
              RIT / LEADERSHIP & GOVERNANCE
            </span>
            <span className="member-axis-label member-axis-right" aria-hidden="true">
              {String(wrapMemberIndex(focusStep, orbitLeaders.length) + 1).padStart(3, '0')} /{' '}
              {orbitLeaders.length}
            </span>
          </div>

          {/* Row 4: Focused Leader Details Panel */}
          <section className="member-focus" aria-label="Focused executive leader">
            <button className="member-step" aria-label="Previous leader" onClick={() => physics.step(-1)}>
              ←
            </button>

            {focused && (
              <div
                className={`member-focus-copy ${focused.name.length > 27 ? 'has-long-name' : ''}`}
                key={focused.id}
                style={{
                  '--accent': focused.tier === 'founding' ? '#C28B10' : getDivisionAccent(focused).accent,
                } as CSSProperties}
                aria-live="polite"
                aria-atomic="true"
              >
                <p>
                  {focused.tierLabel}
                  <span>{focused.role || 'Executive Leader'}</span>
                </p>

                <h2>{focused.name}</h2>

                <div className="member-focus-meta">
                  {focused.year && <span>{focused.year}</span>}
                  {focused.department && <span>{focused.department}</span>}
                </div>

                <button className="member-profile-link" onClick={() => openLeaderProfile(focused)}>
                  View Executive Dossier <span aria-hidden="true">↗</span>
                </button>
              </div>
            )}

            <button className="member-step" aria-label="Next leader" onClick={() => physics.step(1)}>
              →
            </button>
          </section>

          {/* Row 5: Instructions Footer */}
          <footer className="member-instructions">
            <span>
              {compact
                ? 'SWIPE TO EXPLORE LEADERS · TAP A BADGE'
                : 'SCROLL OR DRAG TO EXPLORE LEADERSHIP · SELECT A BADGE TO MEET A LEADER'}
            </span>
            <span>{allLeaders.length} EXECUTIVE & ADMINISTRATIVE BOARD MINDS</span>
          </footer>

      {/* Animated Card Launch transition */}
      {launch && (
        <div
          className="member-launch-card"
          aria-hidden="true"
          style={{
            left: launch.origin.x,
            top: launch.origin.y,
            width: launch.origin.width,
            height: launch.origin.height,
          }}
        >
          <span>CSR / EXECUTIVE</span>
          <b>{launch.member.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</b>
          <small>{launch.member.role || launch.member.division}</small>
        </div>
      )}

      {/* Accessible Leadership Dossier Modal */}
      <MemberProfile
        member={profile}
        origin={profileOrigin}
        onClose={() => {
          setProfile(null);
          setProfileOrigin(null);
        }}
      />
    </main>
  );
}
