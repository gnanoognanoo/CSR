// Styles loaded by AdminDashboard.tsx via admin.css
import type { CsrProfile, UserRole } from '../types/database.types';

interface RbacTabProps {
  profiles: CsrProfile[];
  loading: boolean;
  onRoleChange: (userId: string, newRole: UserRole) => Promise<void>;
}

export default function RbacTab({ profiles, loading, onRoleChange }: RbacTabProps) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Email</th>
            <th>Full Name</th>
            <th>Current Role</th>
            <th>Linked Member ID</th>
            <th>Role Assignment</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                Loading registered user profiles…
              </td>
            </tr>
          ) : profiles.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                No registered Supabase users found yet.
              </td>
            </tr>
          ) : (
            profiles.map(p => (
              <tr key={p.id}>
                <td className="mono" style={{ fontSize: '12px', color: 'var(--steel)' }}>
                  {p.id.slice(0, 8)}…
                </td>
                <td>{p.email}</td>
                <td>{p.full_name || '—'}</td>
                <td>
                  <span className={`role-badge ${p.role}`}>{p.role.toUpperCase()}</span>
                </td>
                <td className="mono" style={{ fontSize: '12px' }}>
                  {p.member_id || 'Not linked'}
                </td>
                <td>
                  <select
                    className="admin-filter-select"
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                    value={p.role}
                    onChange={e => onRoleChange(p.id, e.target.value as UserRole)}
                  >
                    <option value="member">Member</option>
                    <option value="lead">Lead</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
