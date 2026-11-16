// Styles loaded by AdminDashboard.tsx via admin.css

type AdminTab = 'members' | 'rbac' | 'applications';

interface AdminTabNavProps {
  activeTab: AdminTab;
  memberCount: number;
  profileCount: number;
  pendingApplicationCount: number;
  onTabChange: (tab: AdminTab) => void;
}

export default function AdminTabNav({
  activeTab,
  memberCount,
  profileCount,
  pendingApplicationCount,
  onTabChange,
}: AdminTabNavProps) {
  return (
    <div className="admin-nav-tabs" role="tablist">
      <button
        type="button"
        className={`admin-tab-btn ${activeTab === 'members' ? 'is-active' : ''}`}
        onClick={() => onTabChange('members')}
      >
        Member Directory ({memberCount})
      </button>
      <button
        type="button"
        className={`admin-tab-btn ${activeTab === 'rbac' ? 'is-active' : ''}`}
        onClick={() => onTabChange('rbac')}
      >
        RBAC &amp; User Access ({profileCount})
      </button>
      <button
        type="button"
        className={`admin-tab-btn ${activeTab === 'applications' ? 'is-active' : ''}`}
        onClick={() => onTabChange('applications')}
      >
        Applications ({pendingApplicationCount} pending)
      </button>
    </div>
  );
}
