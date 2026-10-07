import { lazy, Suspense, useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Header, Label } from './components';
import { navigation } from './content';
import Home from './Home';
import Announcements from './announcements/AnnouncementsPage';
const Projects = lazy(() => import('./projects/ProjectOrbitPage'));
const Members = lazy(() => import('./members/MemberOrbitPage'));
function NotFound(){return <main id="main-content" className="coming-soon"><div className="section-wrap"><Label>404 / OFF THE DRAWING BOARD</Label><h1>Let's get you<br/><span className="accent">back on track.</span></h1><Link className="outline-link" to="/">Return to CSR-RIT</Link></div></main>}
export default function App(){
  const {pathname}=useLocation();
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});document.title=pathname==='/'?'CSR-RIT — Rajalakshmi Institute of Technology':`${navigation.find(([p])=>p===pathname)?.[1]||'Page not found'} — CSR-RIT`;},[pathname]);
  return <><a className="skip-link" href="#main-content">Skip to content</a><Header/><Routes><Route path="/" element={<Home/>}/><Route path="/announcements" element={<Announcements/>}/><Route path="/projects" element={<Suspense fallback={<main id="main-content" className="coming-soon"><div className="section-wrap"><Label>CSR-RIT / PROJECTS</Label><p className="body-copy" role="status">Preparing the project archive…</p></div></main>}><Projects/></Suspense>}/><Route path="/members" element={<Suspense fallback={<main id="main-content" className="coming-soon"><div className="section-wrap"><Label>CSR-RIT / MEMBER PORTFOLIO</Label><p className="body-copy" role="status">Preparing the member orbit…</p></div></main>}><Members/></Suspense>}/><Route path="*" element={<NotFound/>}/></Routes></>;
}

