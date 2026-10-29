import { lazy, Suspense, useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Header, Label } from './components';
import { navigation } from './content';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Home from './Home';
import Announcements from './announcements/AnnouncementsPage';

const Projects = lazy(() => import('./projects/ProjectOrbitPage'));
const Members = lazy(() => import('./members/MemberOrbitPage'));
const LoginPage = lazy(() => import('./auth/LoginPage'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const MemberPortalPage = lazy(() => import('./portal/MemberPortalPage'));
const JoinCommunityPage = lazy(() => import('./join/JoinCommunityPage'));

function NotFound() {
  return (
    <main id="main-content" className="coming-soon">
      <div className="section-wrap">
        <Label>404 / OFF THE DRAWING BOARD</Label>
        <h1>Let's get you<br /><span className="accent">back on track.</span></h1>
        <Link className="outline-link" to="/">Return to CSR-RIT</Link>
      </div>
    </main>
  );
}

function PageSuspenseFallback({ label, message }: { label: string; message: string }) {
  return (
    <main id="main-content" className="coming-soon">
      <div className="section-wrap">
        <Label>{label}</Label>
        <p className="body-copy" role="status">{message}</p>
      </div>
    </main>
  );
}

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const match = navigation.find(([p]) => p === pathname);
    let title = 'CSR-RIT — Rajalakshmi Institute of Technology';
    if (pathname === '/login') title = 'Sign In — CSR-RIT';
    else if (pathname === '/admin') title = 'Admin Portal — CSR-RIT';
    else if (pathname === '/portal') title = 'Member Portal — CSR-RIT';
    else if (match) title = `${match[1]} — CSR-RIT`;
    document.title = title;
  }, [pathname]);

  return (
    <AuthProvider>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route
          path="/projects"
          element={
            <Suspense fallback={<PageSuspenseFallback label="CSR-RIT / PROJECTS" message="Preparing the project archive…" />}>
              <Projects />
            </Suspense>
          }
        />
        <Route
          path="/members"
          element={
            <Suspense fallback={<PageSuspenseFallback label="CSR-RIT / MEMBER PORTFOLIO" message="Preparing the member orbit…" />}>
              <Members />
            </Suspense>
          }
        />
        <Route
          path="/join"
          element={
            <Suspense fallback={<PageSuspenseFallback label="CSR-RIT / ADMISSIONS" message="Loading admissions portal…" />}>
              <JoinCommunityPage />
            </Suspense>
          }
        />
        <Route
          path="/login"
          element={
            <Suspense fallback={<PageSuspenseFallback label="CSR-RIT / SECURITY" message="Loading authentication portal…" />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<PageSuspenseFallback label="CSR-RIT / ADMINISTRATION" message="Loading executive console…" />}>
                <AdminDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal"
          element={
            <ProtectedRoute requiredRole="member">
              <Suspense fallback={<PageSuspenseFallback label="CSR-RIT / PORTFOLIO" message="Loading member workspace…" />}>
                <MemberPortalPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
