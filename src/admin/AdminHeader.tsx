// Styles loaded by AdminDashboard.tsx via admin.css
import { useAuth } from '../context/AuthContext';
import { Label } from '../components';

interface AdminHeaderProps {
  syncing: boolean;
  backupRosterLength: number;
  onAddMember: () => void;
  onSyncSeed: () => void;
  onSignOut: () => void;
}

export default function AdminHeader({
  syncing,
  backupRosterLength,
  onAddMember,
  onSyncSeed,
  onSignOut,
}: AdminHeaderProps) {
  const { user, profile } = useAuth();

  return (
    <div className="admin-header">
      <div>
        <Label>CSR-RIT / EXECUTIVE ADMINISTRATION</Label>
        <h1>Admin Operations</h1>
        <p className="body-copy" style={{ margin: '8px 0 0', fontSize: '15px' }}>
          Logged in as <strong>{profile?.full_name || user?.email}</strong> ({profile?.role?.toUpperCase()})
        </p>
      </div>
      <div className="admin-actions">
        <button
          type="button"
          className="btn-admin primary"
          onClick={onAddMember}
        >
          + Add Member
        </button>
        <button
          type="button"
          className="btn-admin"
          onClick={onSyncSeed}
          disabled={syncing}
          title={`Restore all ${backupRosterLength} official cohort members from backup`}
        >
          {syncing ? 'Restoring Roster…' : 'Restore Default Roster'}
        </button>
        <button type="button" className="btn-admin" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
