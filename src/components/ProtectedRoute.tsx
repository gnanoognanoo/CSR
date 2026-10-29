import { type ReactNode } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Label } from '../components';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'member';
}

export function ProtectedRoute({ children, requiredRole = 'member' }: ProtectedRouteProps) {
  const { user, profile, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main id="main-content" className="coming-soon">
        <div className="section-wrap">
          <Label>CSR-RIT / SECURITY</Label>
          <p className="body-copy" role="status">Verifying secure credentials…</p>
        </div>
      </main>
    );
  }

  if (!isConfigured) {
    return (
      <main id="main-content" className="coming-soon">
        <div className="section-wrap" style={{ maxWidth: '640px' }}>
          <Label>CONFIGURATION REQUIRED</Label>
          <h1>Supabase Not Configured</h1>
          <p className="body-copy">
            Please add your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to the <code>.env</code> file in your project root to activate authentication and database features.
          </p>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link className="outline-link" to="/">Return to CSR Home</Link>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole === 'admin' && profile?.role !== 'admin') {
    return (
      <main id="main-content" className="coming-soon">
        <div className="section-wrap" style={{ maxWidth: '640px' }}>
          <Label>403 / RESTRICTED ACCESS</Label>
          <h1>Admin Authorization <br /><span className="accent">Required.</span></h1>
          <p className="body-copy">
            Your account (<code>{user.email}</code>) currently has the role <strong>{profile?.role || 'member'}</strong>.
            This area is restricted to CSR Administrators.
          </p>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link className="outline-link" to="/portal">Go to Member Portal</Link>
            <Link className="outline-link" to="/">Return to CSR-RIT</Link>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
