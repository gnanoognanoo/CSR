import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { memberDivisions, members as backupRoster } from '../members/data';
import {
  getMembers,
  getAdminMembers,
  createMember,
  updateMember,
  deleteMember,
  syncStaticMembersToSupabase,
  getAllProfiles,
  updateProfileRole,
  getApplications,
  updateApplicationStatus,
  approveApplicationAndAddToRoster,
} from '../services/members';
import type { CsrMember, CsrProfile, CreateMemberInput, UserRole, CsrApplication } from '../types/database.types';
import AdminHeader from './AdminHeader';
import AdminStatsRow from './AdminStatsRow';
import AdminTabNav from './AdminTabNav';
import MembersTab from './MembersTab';
import RbacTab from './RbacTab';
import ApplicationsTab from './ApplicationsTab';
import './admin.css';

type AlertState = { type: 'success' | 'error' | 'info'; text: string } | null;
type ActiveTab = 'members' | 'rbac' | 'applications';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('members');

  // Cross-tab shared state
  const [members, setMembers] = useState<CsrMember[]>([]);
  const [fromSupabase, setFromSupabase] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [profiles, setProfiles] = useState<CsrProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [applications, setApplications] = useState<CsrApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Global feedback banner
  const [alert, setAlert] = useState<AlertState>(null);

  async function loadData() {
    setLoadingMembers(true);
    // C3 FIX: Admins fetch through protected getAdminMembers() to retain email and phone
    const res = await getAdminMembers();
    if (!res.error) {
      setMembers(res.members);
      setFromSupabase(true);
    } else {
      // Fallback to public directory view if base table is inaccessible
      const fallbackRes = await getMembers();
      setMembers(fallbackRes.raw);
      setFromSupabase(fallbackRes.fromSupabase);
      if (res.error) {
        setAlert({ type: 'info', text: res.error });
      }
    }
    setLoadingMembers(false);
  }

  async function loadProfilesData() {
    setLoadingProfiles(true);
    const res = await getAllProfiles();
    if (res.profiles) {
      setProfiles(res.profiles);
    }
    setLoadingProfiles(false);
  }

  async function loadApplicationsData() {
    setLoadingApplications(true);
    const res = await getApplications();
    if (res.applications) {
      setApplications(res.applications);
    }
    setLoadingApplications(false);
  }

  useEffect(() => {
    loadData();
    loadProfilesData();
    loadApplicationsData();
  }, []);

  async function handleSyncSeed() {
    if (!confirm(`This will restore all ${backupRoster.length} official cohort members in your Supabase database from the backup roster. Continue?`)) {
      return;
    }
    setSyncing(true);
    setAlert(null);
    const res = await syncStaticMembersToSupabase();
    setSyncing(false);
    if (res.error) {
      setAlert({ type: 'error', text: `Restore failed: ${res.error}` });
    } else {
      setAlert({ type: 'success', text: `Successfully restored ${res.inserted} official roster members in Supabase!` });
      loadData();
    }
  }

  async function handleSaveMember(editingMember: CsrMember | null, formData: CreateMemberInput, onDone: () => void) {
    setAlert(null);
    if (editingMember) {
      const res = await updateMember(editingMember.id, formData);
      if (res.error) {
        setAlert({ type: 'error', text: `Failed to update: ${res.error}` });
      } else {
        setAlert({ type: 'success', text: `Member "${formData.name}" updated successfully.` });
        onDone();
        loadData();
      }
    } else {
      const res = await createMember(formData);
      if (res.error) {
        setAlert({ type: 'error', text: `Failed to create: ${res.error}` });
      } else {
        setAlert({ type: 'success', text: `Member "${formData.name}" added to roster.` });
        onDone();
        loadData();
      }
    }
  }

  async function handleDelete(id: string, onDone: () => void) {
    setAlert(null);
    const res = await deleteMember(id);
    if (res.error) {
      setAlert({ type: 'error', text: `Failed to delete: ${res.error}` });
    } else {
      setAlert({ type: 'success', text: 'Member deleted from database.' });
      onDone();
      loadData();
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    const res = await updateProfileRole(userId, newRole);
    if (res.error) {
      setAlert({ type: 'error', text: `Role update failed: ${res.error}` });
    } else {
      setAlert({ type: 'success', text: `Role updated to ${newRole}.` });
      loadProfilesData();
    }
  }

  async function handleApprove(app: CsrApplication, onDone: () => void) {
    setAlert(null);
    const res = await approveApplicationAndAddToRoster(app);
    if (res.error) {
      setAlert({ type: 'error', text: `Approval failed: ${res.error}` });
    } else {
      setAlert({ type: 'success', text: `Approved! ${app.full_name} has been added to the official member roster.` });
      onDone();
      loadApplicationsData();
      loadData();
    }
  }

  async function handleReject(id: string, onDone: () => void) {
    setAlert(null);
    const res = await updateApplicationStatus(id, 'rejected');
    if (res.error) {
      setAlert({ type: 'error', text: `Failed to update status: ${res.error}` });
    } else {
      setAlert({ type: 'info', text: 'Application marked as rejected.' });
      onDone();
      loadApplicationsData();
    }
  }

  const leadCount = members.filter(m => m.role?.toLowerCase().includes('lead')).length || 7;
  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <main id="main-content" className="admin-page">
      <div className="section-wrap" style={{ padding: 0 }}>
        <AdminHeader
          syncing={syncing}
          backupRosterLength={backupRoster.length}
          onAddMember={() => setActiveTab('members')}
          onSyncSeed={handleSyncSeed}
          onSignOut={() => signOut()}
        />

        {/* Global Feedback Banner */}
        {alert && (
          <div className={`auth-alert ${alert.type}`} style={{ marginBottom: '24px' }}>
            <span>{alert.text}</span>
          </div>
        )}

        <AdminStatsRow
          memberCount={members.length}
          fromSupabase={fromSupabase}
          profileCount={profiles.length}
          divisionCount={memberDivisions.length}
          leadCount={leadCount}
        />

        <AdminTabNav
          activeTab={activeTab}
          memberCount={members.length}
          profileCount={profiles.length}
          pendingApplicationCount={pendingCount}
          onTabChange={setActiveTab}
        />

        {activeTab === 'members' && (
          <MembersTab
            members={members}
            loading={loadingMembers}
            onSaveMember={handleSaveMember}
            onDeleteMember={handleDelete}
          />
        )}

        {activeTab === 'rbac' && (
          <RbacTab
            profiles={profiles}
            loading={loadingProfiles}
            onRoleChange={handleRoleChange}
          />
        )}

        {activeTab === 'applications' && (
          <ApplicationsTab
            applications={applications}
            loading={loadingApplications}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </div>
    </main>
  );
}
