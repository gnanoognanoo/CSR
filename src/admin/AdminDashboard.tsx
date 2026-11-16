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
import { getBillboardMembers, saveBillboardMembers } from '../services/billboard';
import type {
  CsrMember,
  CsrProfile,
  CreateMemberInput,
  UserRole,
  CsrApplication,
  CsrBillboardMember,
} from '../types/database.types';
import AdminHeader from './AdminHeader';
import AdminStatsRow from './AdminStatsRow';
import AdminTabNav, { type AdminTab } from './AdminTabNav';
import MembersTab from './MembersTab';
import RbacTab from './RbacTab';
import ApplicationsTab from './ApplicationsTab';
import BillboardTab from './BillboardTab';
import './admin.css';

type AlertState = { type: 'success' | 'error' | 'info'; text: string } | null;

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('members');

  // Cross-tab shared state
  const [members, setMembers] = useState<CsrMember[]>([]);
  const [fromSupabase, setFromSupabase] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [profiles, setProfiles] = useState<CsrProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [applications, setApplications] = useState<CsrApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Billboard state
  const [billboardSlots, setBillboardSlots] = useState<CsrBillboardMember[]>([]);
  const [savingBillboard, setSavingBillboard] = useState(false);

  // Global feedback banner
  const [alert, setAlert] = useState<AlertState>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

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

  async function loadBillboardData() {
    const res = await getBillboardMembers();
    setBillboardSlots(res.items);
  }

  useEffect(() => {
    loadData();
    loadProfilesData();
    loadApplicationsData();
    loadBillboardData();
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

  async function handleSaveBillboard() {
    setSavingBillboard(true);
    setAlert(null);
    const res = await saveBillboardMembers(billboardSlots);
    setSavingBillboard(false);

    if (res.error) {
      setAlert({ type: 'error', text: `Failed to save billboard: ${res.error}` });
    } else {
      setAlert({
        type: 'success',
        text: 'Executive Council Billboard saved! Updates are now live on the Member Portfolio page.',
      });
    }
  }

  function updateBillboardSlot(index: number, updates: Partial<CsrBillboardMember>) {
    setBillboardSlots(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }

  function handleClearBillboardSlot(index: number) {
    updateBillboardSlot(index, {
      member_id: null,
      name: '',
      title: '',
      division: 'Software Engineering',
      year: '',
      department: '',
      avatar_url: null,
    });
  }

  const leadCount = members.filter(m => m.role?.toLowerCase().includes('lead')).length || 7;
  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <main id="main-content" className="admin-page">
      <div className="section-wrap" style={{ padding: 0 }}>
        <AdminHeader
          syncing={syncing}
          backupRosterLength={backupRoster.length}
          onAddMember={() => {
            setActiveTab('members');
            setIsAddMemberOpen(true);
          }}
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
          onTabChange={tab => {
            setActiveTab(tab);
            if (tab === 'billboard' && !billboardSlots.length) {
              loadBillboardData();
            }
          }}
        />

        {activeTab === 'members' && (
          <MembersTab
            members={members}
            loading={loadingMembers}
            onSaveMember={handleSaveMember}
            onDeleteMember={handleDelete}
            isAddOpen={isAddMemberOpen}
            onOpenAdd={() => setIsAddMemberOpen(true)}
            onCloseAdd={() => setIsAddMemberOpen(false)}
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

        {activeTab === 'billboard' && (
          <BillboardTab
            billboardSlots={billboardSlots}
            members={members}
            savingBillboard={savingBillboard}
            onSaveBillboard={handleSaveBillboard}
            onUpdateSlot={updateBillboardSlot}
            onClearSlot={handleClearBillboardSlot}
          />
        )}
      </div>
    </main>
  );
}
