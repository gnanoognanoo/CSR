import { useEffect, useRef, useState, type ReactNode, type KeyboardEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { navigation, digital } from './content';
import { memberDivisions } from './members/data';
import { useAuth } from './context/useAuth';
/** Routes that render on a light surface; the header and logo switch to their dark-ink variants there. */
const LIGHT_ROUTES = ['/projects', '/members', '/announcements', '/committee'];
const isLightRoute = (pathname: string) => LIGHT_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));

type Tone = 'dark' | 'light';
const LOGOS: Record<Tone, { src: string; width: number; height: number }> = {
  dark: { src: '/brand/rit-logo-white.png', width: 795, height: 163 },
  light: { src: '/brand/rit-logo-color.png', width: 294, height: 67 },
};

export function Brand({ tone = 'dark' }: { tone?: Tone }) {
  const logo = LOGOS[tone];
  return (
    <Link className={`brand brand--${tone}`} to="/" aria-label="CSR-RIT home — Rajalakshmi Institute of Technology">
      <img className="rit-logo" src={logo.src} width={logo.width} height={logo.height} alt="Rajalakshmi Institute of Technology" decoding="async" />
      <span className="community-wordmark">CSR<span className="brand-divider">—</span>RIT<small>Student Engineering Community</small></span>
    </Link>
  );
}
/** Short labels for the top bar; the full names still live in content.ts for page titles. */
const NAV_LABELS: Record<string, string> = {
  '/': 'Home',
  '/announcements': 'Announcements',
  '/committee': 'Committee',
  '/projects': 'Projects',
  '/members': 'Members',
};

function initialsFor(name: string) {
  const parts = name.trim().split(/[\s._@-]+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function Header(){
  const [scrolled,setScrolled]=useState(false),[open,setOpen]=useState(false),[accountOpen,setAccountOpen]=useState(false);
  const location=useLocation(); const navigate=useNavigate();
  const menuButton=useRef<HTMLButtonElement>(null); const accountRef=useRef<HTMLDivElement>(null);
  const { user, profile, isAdmin, signOut } = useAuth();
  useEffect(()=>{const fn=()=>setScrolled(window.scrollY>24);fn();window.addEventListener('scroll',fn,{passive:true});return()=>window.removeEventListener('scroll',fn);},[]);
  useEffect(()=>{setOpen(false);setAccountOpen(false);},[location]);
  useEffect(()=>{
    if(!open&&!accountOpen)return;
    const onKey=(e:globalThis.KeyboardEvent)=>{if(e.key==='Escape'){if(open)menuButton.current?.focus();setOpen(false);setAccountOpen(false);}};
    const onClick=(e:MouseEvent)=>{if(accountOpen&&accountRef.current&&!accountRef.current.contains(e.target as Node))setAccountOpen(false);};
    window.addEventListener('keydown',onKey);document.addEventListener('mousedown',onClick);
    return()=>{window.removeEventListener('keydown',onKey);document.removeEventListener('mousedown',onClick);};
  },[open,accountOpen]);

  const light = isLightRoute(location.pathname);
  const headerClass = ['site-header', (scrolled || open || location.pathname !== '/') && 'is-scrolled', light ? 'is-light' : 'is-dark', open && 'menu-open'].filter(Boolean).join(' ');
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Account';
  const handleSignOut = async () => { setAccountOpen(false); setOpen(false); await signOut(); navigate('/'); };

  const links = navigation.filter(([path]) => path in NAV_LABELS);
  const accountLinks = user ? [
    ...(isAdmin ? [['/admin', 'Admin dashboard'] as const] : []),
    ['/portal', 'Member portal'] as const,
  ] : [];

  return (
    <header className={headerClass}>
      <Brand tone={light ? 'light' : 'dark'} />
      <nav id="main-nav" className={`site-nav${open ? ' is-open' : ''}`} aria-label="Main navigation">
        <ul className="nav-links">
          {links.map(([path]) => <li key={path}><NavLink className="nav-link" to={path} end={path === '/'}>{NAV_LABELS[path]}</NavLink></li>)}
        </ul>

        {/* Collapsed menu only: account entries live inline here instead of in a dropdown. */}
        {user && (
          <div className="nav-mobile-account">
            <p className="nav-mobile-account-label">Signed in as <strong>{displayName}</strong></p>
            {accountLinks.map(([path, label]) => <NavLink key={path} className="nav-link" to={path}>{label}</NavLink>)}
            <button type="button" className="nav-link nav-link--button" onClick={handleSignOut}>Sign out</button>
          </div>
        )}
        {!user && (
          <div className="nav-mobile-actions">
            <Link className="nav-btn nav-btn--ghost" to="/login">Sign in</Link>
            <Link className="nav-btn nav-btn--primary" to="/join">Join CSR</Link>
          </div>
        )}
      </nav>

      <div className="nav-actions">
        {!user ? (
          <>
            <NavLink className="nav-btn nav-btn--ghost" to="/login">Sign in</NavLink>
            <NavLink className="nav-btn nav-btn--primary" to="/join">Join CSR</NavLink>
          </>
        ) : (
          <div className="account" ref={accountRef}>
            <button
              type="button"
              className="account-trigger"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-controls="account-menu"
              onClick={() => setAccountOpen(v => !v)}
            >
              <span className="account-avatar" aria-hidden="true">{initialsFor(displayName)}</span>
              <span className="sr-only">Account menu for {displayName}</span>
              <svg className="account-chevron" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {accountOpen && (
              <div id="account-menu" className="account-menu" role="menu">
                <div className="account-menu-head">
                  <strong>{displayName}</strong>
                  {user.email && <span>{user.email}</span>}
                  {isAdmin && <em className="account-badge">Admin</em>}
                </div>
                {accountLinks.map(([path, label]) => <Link key={path} role="menuitem" to={path}>{label}</Link>)}
                <button type="button" role="menuitem" className="account-signout" onClick={handleSignOut}>Sign out</button>
              </div>
            )}
          </div>
        )}
      </div>

      <button ref={menuButton} className="menu-toggle" aria-controls="main-nav" aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
        <span className="menu-icon" aria-hidden="true"><i /><i /></span>
      </button>
    </header>
  );
}
export function Label({number,children}:{number?:string;children:ReactNode}){return <p className="eyebrow"><span className="accent-line"/>{number&&<span className="accent">{number} /</span>}{children}</p>}
export function Divisions({ counts = {} }: { counts?: Readonly<Record<string, number>> }){
  const [selected,setSelected]=useState<number|null>(0);
  return <div className="division-directory">{memberDivisions.map((division,i)=><div className={`division ${selected===i?'is-selected':''}`} key={division.id}><h3><button aria-expanded={selected===i} aria-controls={`division-${i}`} onClick={()=>setSelected(selected===i?null:i)}><span className="division-index mono">0{i+1}</span><span className="division-name">{division.name}</span><span className="division-count mono">{counts[division.id] ?? '—'}<span> members</span></span><span className="division-toggle" aria-hidden="true">{selected===i?'−':'+'}</span></button></h3><div id={`division-${i}`} className="division-detail" hidden={selected!==i}><span className="mono">DIVISION LEAD</span><p>{division.lead}</p><span className="division-detail-note mono">CSR-RIT / TECHNICAL DIVISION 0{i+1}</span></div></div>)}</div>;
}
export function DigitalExplorer(){
  const [active,setActive]=useState(0); const current=digital[active];
  function onKey(event:KeyboardEvent<HTMLButtonElement>,i:number){let next:number;if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(i+1)%digital.length;else if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(i+digital.length-1)%digital.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=digital.length-1;else return;event.preventDefault();setActive(next);document.getElementById(`digital-tab-${next}`)?.focus();}
  return <div className="digital-explorer"><div className="digital-tabs" role="tablist" aria-label="Explore the digital side of CSR" aria-orientation="vertical">{digital.map((item,i)=><button role="tab" id={`digital-tab-${i}`} aria-controls="digital-panel" aria-selected={active===i} tabIndex={active===i?0:-1} key={item.code} onClick={()=>setActive(i)} onKeyDown={e=>onKey(e,i)}><span className="mono">0{i+1}</span>{item.name}<span className="tab-marker" aria-hidden="true"/></button>)}</div><div id="digital-panel" role="tabpanel" aria-labelledby={`digital-tab-${active}`} tabIndex={0} className="digital-panel"><span className="digital-code" aria-hidden="true">{current.code}</span><p className="mono accent">THE DIGITAL SIDE OF CSR</p><h3>{current.headline}</h3><p className="body-copy">{current.description}</p><div className="digital-areas">{current.areas.map(area=><span key={area}>{area}</span>)}</div></div></div>;
}
export function Footer({ tone = 'dark' }: { tone?: Tone }) {
  return (
    <footer className={`footer footer--${tone}`}>
      <Brand tone={tone} />
      <p className="mono">Rajalakshmi Institute of Technology<br />Chennai / Student Technical Community</p>
      <a href="#main-content" className="mono footer-top-link">Back to top <span aria-hidden="true">↑</span></a>
    </footer>
  );
}
