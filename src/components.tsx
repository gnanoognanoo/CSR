import { useEffect, useRef, useState, type ReactNode, type KeyboardEvent } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { navigation, digital } from './content';
import { memberDivisions } from './members/data';
import { useAuth } from './context/AuthContext';
/** Routes that render on a light surface; the header and logo switch to their dark-ink variants there. */
const LIGHT_ROUTES = ['/projects', '/members', '/announcements', '/committee'];
export const isLightRoute = (pathname: string) => LIGHT_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));

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
export function Header(){
  const [scrolled,setScrolled]=useState(false),[open,setOpen]=useState(false);
  const location=useLocation(); const menuButton=useRef<HTMLButtonElement>(null);
  const { user, profile, isAdmin } = useAuth();
  useEffect(()=>{const fn=()=>setScrolled(window.scrollY>70);fn();window.addEventListener('scroll',fn,{passive:true});return()=>window.removeEventListener('scroll',fn);},[]);
  useEffect(()=>setOpen(false),[location]);
  useEffect(()=>{if(!open)return;const close=(e:globalThis.KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);menuButton.current?.focus();}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[open]);
  const light = isLightRoute(location.pathname);
  const headerClass = ['site-header', (scrolled || open || location.pathname !== '/') && 'is-scrolled', light ? 'is-light' : 'is-dark'].filter(Boolean).join(' ');
  return (
    <header className={headerClass}>
      <Brand tone={light ? 'light' : 'dark'} />
      <nav id="main-nav" className={open ? 'is-open' : ''} aria-label="Main navigation">
        {navigation.filter(([path]) => path !== '/join').map(([path, label]) => <NavLink key={path} to={path} end={path === '/'}>{label}</NavLink>)}
        {user && <NavLink to="/portal">Portal</NavLink>}
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        <div className="nav-actions">
          {navigation.filter(([path]) => path === '/join').map(([path, label]) => <NavLink key={path} to={path} className="nav-pill nav-pill--primary"><span className="nav-pill-dot" aria-hidden="true" />{label}</NavLink>)}
          {!user
            ? <NavLink to="/login" className="nav-pill nav-pill--outline">Sign In</NavLink>
            : <NavLink to={isAdmin ? '/admin' : '/portal'} className="nav-pill nav-pill--outline">{profile?.role || 'Account'}</NavLink>}
        </div>
      </nav>
      <button ref={menuButton} className="menu-toggle" aria-controls="main-nav" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}<span aria-hidden="true">{open ? '−' : '+'}</span></button>
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
  function onKey(event:KeyboardEvent<HTMLButtonElement>,i:number){let next=i;if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(i+1)%digital.length;else if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(i+digital.length-1)%digital.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=digital.length-1;else return;event.preventDefault();setActive(next);document.getElementById(`digital-tab-${next}`)?.focus();}
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
