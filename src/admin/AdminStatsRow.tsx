// Styles loaded by AdminDashboard.tsx via admin.css

interface AdminStatsRowProps {
  memberCount: number;
  fromSupabase: boolean;
  profileCount: number;
  divisionCount: number;
  leadCount: number;
}

export default function AdminStatsRow({
  memberCount,
  fromSupabase,
  profileCount,
  divisionCount,
  leadCount,
}: AdminStatsRowProps) {
  return (
    <div className="admin-stats-grid">
      <div className="stat-card">
        <span className="stat-label">Total Roster Members</span>
        <div className="stat-num">{memberCount}</div>
        <div className="stat-sub">{fromSupabase ? '● Live from Supabase' : '○ Static Roster Mode'}</div>
      </div>
      <div className="stat-card">
        <span className="stat-label">Technical Divisions</span>
        <div className="stat-num">{divisionCount}</div>
        <div className="stat-sub">Active engineering groups</div>
      </div>
      <div className="stat-card">
        <span className="stat-label">Division Leads</span>
        <div className="stat-num">{leadCount}</div>
        <div className="stat-sub">Departmental leadership</div>
      </div>
      <div className="stat-card">
        <span className="stat-label">Registered Auth Users</span>
        <div className="stat-num">{profileCount}</div>
        <div className="stat-sub">Supabase auth accounts</div>
      </div>
    </div>
  );
}
