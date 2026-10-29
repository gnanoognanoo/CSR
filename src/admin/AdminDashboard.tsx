import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { memberDivisions } from '../members/data';
import {
  getMembers,
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
import { Label } from '../components';
import './admin.css';

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'rbac' | 'applications'>('members');

  // Applications state
  const [applications, setApplications] = useState<CsrApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<CsrApplication | null>(null);
  const [appStatusFilter, setAppStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Members state
  const [members, setMembers] = useState<CsrMember[]>([]);
  const [fromSupabase, setFromSupabase] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [memberSearch, setMemberSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');

  // RBAC state
  const [profiles, setProfiles] = useState<CsrProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Modal states
  const [editingMember, setEditingMember] = useState<CsrMember | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Alert message
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Form input state
  const [formData, setFormData] = useState<CreateMemberInput>({
    name: '',
    division_id: 'software',
    division: 'Software Engineering',
    year: 'II Year',
    department: 'Computer Science and Engineering',
    sec: 'A',
    role: 'Member',
    email: '',
    phone: '',
    bio: '',
    github_url: '',
    linkedin_url: '',
  });

  async function loadData() {
    setLoadingMembers(true);
    const res = await getMembers();
    setMembers(res.raw);
    setFromSupabase(res.fromSupabase);
    setLoadingMembers(false);

    if (res.error) {
      setAlert({ type: 'info', text: res.error });
    }
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

  async function handleApprove(app: CsrApplication) {
    setAlert(null);
    const res = await approveApplicationAndAddToRoster(app);
    if (res.error) {
      setAlert({ type: 'error', text: `Approval failed: ${res.error}` });
    } else {
      setAlert({ type: 'success', text: `Approved! ${app.full_name} has been added to the official member roster.` });
      setSelectedApplication(null);
      loadApplicationsData();
      loadData();
    }
  }

  async function handleReject(id: string) {
    setAlert(null);
    const res = await updateApplicationStatus(id, 'rejected');
    if (res.error) {
      setAlert({ type: 'error', text: `Failed to update status: ${res.error}` });
    } else {
      setAlert({ type: 'info', text: 'Application marked as rejected.' });
      setSelectedApplication(null);
      loadApplicationsData();
    }
  }

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesDivision = divisionFilter === 'all' || m.division_id === divisionFilter;
      const q = memberSearch.toLowerCase().trim();
      const matchesQuery =
        !q ||
        m.name?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.division?.toLowerCase().includes(q);

      return matchesDivision && matchesQuery;
    });
  }, [members, memberSearch, divisionFilter]);

  function handleDivisionChange(divId: string) {
    const div = memberDivisions.find(d => d.id === divId);
    setFormData(prev => ({
      ...prev,
      division_id: divId,
      division: div ? div.name : prev.division,
    }));
  }

  function openEditModal(m: CsrMember) {
    setEditingMember(m);
    setFormData({
      name: m.name,
      division_id: m.division_id,
      division: m.division,
      year: m.year || '',
      department: m.department || '',
      sec: m.sec || '',
      role: m.role || 'Member',
      email: m.email || '',
      phone: m.phone || '',
      bio: m.bio || '',
      github_url: m.github_url || '',
      linkedin_url: m.linkedin_url || '',
    });
  }

  async function handleSaveMember(e: FormEvent) {
    e.preventDefault();
    setAlert(null);

    if (editingMember) {
      const res = await updateMember(editingMember.id, formData);
      if (res.error) {
        setAlert({ type: 'error', text: `Failed to update: ${res.error}` });
      } else {
        setAlert({ type: 'success', text: `Member "${formData.name}" updated successfully.` });
        setEditingMember(null);
        loadData();
      }
    } else {
      const res = await createMember(formData);
      if (res.error) {
        setAlert({ type: 'error', text: `Failed to create: ${res.error}` });
      } else {
        setAlert({ type: 'success', text: `Member "${formData.name}" added to roster.` });
        setIsAddOpen(false);
        loadData();
      }
    }
  }

  async function handleDelete(id: string) {
    setAlert(null);
    const res = await deleteMember(id);
    if (res.error) {
      setAlert({ type: 'error', text: `Failed to delete: ${res.error}` });
    } else {
      setAlert({ type: 'success', text: 'Member deleted from database.' });
      setDeleteConfirmId(null);
      loadData();
    }
  }

  async function handleSyncSeed() {
    if (!confirm('This will restore all 115 official cohort members in your Supabase database from the backup roster. Continue?')) {
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

  async function handleRoleChange(userId: string, newRole: UserRole) {
    const res = await updateProfileRole(userId, newRole);
    if (res.error) {
      setAlert({ type: 'error', text: `Role update failed: ${res.error}` });
    } else {
      setAlert({ type: 'success', text: `Role updated to ${newRole}.` });
      loadProfilesData();
    }
  }

  return (
    <main id="main-content" className="admin-page">
      <div className="section-wrap" style={{ padding: 0 }}>
        {/* Header */}
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
              onClick={() => {
                setEditingMember(null);
                setFormData({
                  name: '',
                  division_id: 'software',
                  division: 'Software Engineering',
                  year: 'II Year',
                  department: 'Computer Science and Engineering',
                  sec: 'A',
                  role: 'Member',
                  email: '',
                  phone: '',
                  bio: '',
                  github_url: '',
                  linkedin_url: '',
                });
                setIsAddOpen(true);
              }}
            >
              + Add Member
            </button>
            <button
              type="button"
              className="btn-admin"
              onClick={handleSyncSeed}
              disabled={syncing}
              title="Restore all 115 official cohort members from backup"
            >
              {syncing ? 'Restoring Roster…' : 'Restore Default Roster'}
            </button>
            <button type="button" className="btn-admin" onClick={() => signOut()}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {alert && (
          <div className={`auth-alert ${alert.type}`} style={{ marginBottom: '24px' }}>
            <span>{alert.text}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="admin-stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Roster Members</span>
            <div className="stat-num">{members.length}</div>
            <div className="stat-sub">{fromSupabase ? '● Live from Supabase' : '○ Static Roster Mode'}</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Technical Divisions</span>
            <div className="stat-num">{memberDivisions.length}</div>
            <div className="stat-sub">Active engineering groups</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Division Leads</span>
            <div className="stat-num">
              {members.filter(m => m.role?.toLowerCase().includes('lead')).length || 7}
            </div>
            <div className="stat-sub">Departmental leadership</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Registered Auth Users</span>
            <div className="stat-num">{profiles.length}</div>
            <div className="stat-sub">Supabase auth accounts</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-nav-tabs" role="tablist">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'members' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Member Directory ({members.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'rbac' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('rbac')}
          >
            RBAC & User Access ({profiles.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'applications' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            Applications ({applications.filter(a => a.status === 'pending').length} pending)
          </button>
        </div>

        {/* TAB 1: MEMBERS DIRECTORY MANAGEMENT */}
        {activeTab === 'members' && (
          <div>
            <div className="admin-toolbar">
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search by name, email, department, role…"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
              <select
                className="admin-filter-select"
                value={divisionFilter}
                onChange={e => setDivisionFilter(e.target.value)}
              >
                <option value="all">All Divisions (7)</option>
                {memberDivisions.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Division</th>
                    <th>Role</th>
                    <th>Year / Dept</th>
                    <th>Email</th>
                    <th>Contact</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMembers ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>
                        Loading roster records…
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>
                        No members found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map(m => (
                      <tr key={m.id}>
                        <td className="mono" style={{ fontSize: '11px', color: 'var(--steel)' }}>
                          {m.id}
                        </td>
                        <td>
                          <strong>{m.name}</strong>
                        </td>
                        <td>{m.division}</td>
                        <td>
                          <span
                            className={`role-badge ${
                              m.role?.toLowerCase().includes('lead')
                                ? 'lead'
                                : m.role?.toLowerCase().includes('admin')
                                ? 'admin'
                                : 'member'
                            }`}
                          >
                            {m.role || 'Member'}
                          </span>
                        </td>
                        <td>
                          <div>{m.year || '—'}</div>
                          <small style={{ color: 'var(--steel)' }}>{m.department || '—'}</small>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px' }}>{m.email || '—'}</span>
                        </td>
                        <td className="mono" style={{ fontSize: '11px' }}>
                          {m.phone || '—'}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="btn-table-action"
                              onClick={() => openEditModal(m)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-table-action delete"
                              onClick={() => setDeleteConfirmId(m.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: RBAC USER MANAGEMENT */}
        {activeTab === 'rbac' && (
          <div>
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
                  {loadingProfiles ? (
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
                        <td className="mono" style={{ fontSize: '11px', color: 'var(--steel)' }}>
                          {p.id.slice(0, 8)}…
                        </td>
                        <td>{p.email}</td>
                        <td>{p.full_name || '—'}</td>
                        <td>
                          <span className={`role-badge ${p.role}`}>{p.role.toUpperCase()}</span>
                        </td>
                        <td className="mono" style={{ fontSize: '11px' }}>
                          {p.member_id || 'Not linked'}
                        </td>
                        <td>
                          <select
                            className="admin-filter-select"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            value={p.role}
                            onChange={e => handleRoleChange(p.id, e.target.value as UserRole)}
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
          </div>
        )}

        {/* TAB 3: APPLICATIONS MANAGEMENT */}
        {activeTab === 'applications' && (
          <div>
            <div className="admin-toolbar">
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                  <button
                    key={status}
                    type="button"
                    className={`btn-admin ${appStatusFilter === status ? 'primary' : ''}`}
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                    onClick={() => setAppStatusFilter(status)}
                  >
                    {status.toUpperCase()}{' '}
                    ({status === 'all' ? applications.length : applications.filter(a => a.status === status).length})
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Candidate</th>
                    <th>Dept / Year</th>
                    <th>Primary Division</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingApplications ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                        Loading submitted applications…
                      </td>
                    </tr>
                  ) : applications.filter(a => appStatusFilter === 'all' || a.status === appStatusFilter).length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                        No applications found in this category.
                      </td>
                    </tr>
                  ) : (
                    applications
                      .filter(a => appStatusFilter === 'all' || a.status === appStatusFilter)
                      .map(app => (
                        <tr key={app.id}>
                          <td className="mono" style={{ fontSize: '11px', color: 'var(--steel)' }}>
                            {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <strong>{app.full_name}</strong>
                            {app.reg_no && <div className="mono" style={{ fontSize: '10px', color: 'var(--steel)' }}>{app.reg_no}</div>}
                          </td>
                          <td>
                            <div>{app.year}</div>
                            <small style={{ color: 'var(--steel)' }}>{app.department}</small>
                          </td>
                          <td>
                            <strong>{app.primary_division}</strong>
                            {app.secondary_division && (
                              <div style={{ fontSize: '11px', color: 'var(--steel)' }}>Alt: {app.secondary_division}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '12px' }}>{app.email}</div>
                            <small className="mono" style={{ color: 'var(--steel)' }}>{app.phone}</small>
                          </td>
                          <td>
                            <span className={`role-badge ${app.status === 'approved' ? 'admin' : app.status === 'rejected' ? 'member' : 'lead'}`}>
                              {app.status.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn-table-action"
                                onClick={() => setSelectedApplication(app)}
                              >
                                Review
                              </button>
                              {app.status === 'pending' && (
                                <button
                                  type="button"
                                  className="btn-table-action"
                                  style={{ color: '#75e090', borderColor: 'rgba(40, 167, 69, 0.4)' }}
                                  onClick={() => handleApprove(app)}
                                >
                                  Approve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* APPLICATION REVIEW MODAL */}
      {selectedApplication && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedApplication(null)}>
          <div className="admin-modal" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <Label>CANDIDATE ADMISSION REVIEW</Label>
                <h3 style={{ marginTop: '6px' }}>{selectedApplication.full_name}</h3>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setSelectedApplication(null)}>
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px', marginBottom: '20px' }}>
              <div>
                <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>COLLEGE ROLL / REG NO</span>
                <strong>{selectedApplication.reg_no || 'Not provided'}</strong>
              </div>
              <div>
                <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>YEAR & DEPARTMENT</span>
                <strong>{selectedApplication.year} · {selectedApplication.department}</strong>
              </div>
              <div>
                <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>EMAIL ADDRESS</span>
                <span>{selectedApplication.email}</span>
              </div>
              <div>
                <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>PHONE / WHATSAPP</span>
                <span className="mono">{selectedApplication.phone}</span>
              </div>
              <div>
                <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>PRIMARY DIVISION</span>
                <strong style={{ color: 'var(--engineering-blue)' }}>{selectedApplication.primary_division}</strong>
              </div>
              <div>
                <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>SECONDARY DIVISION</span>
                <span>{selectedApplication.secondary_division || 'None'}</span>
              </div>
            </div>

            {selectedApplication.technical_skills && (
              <div style={{ marginBottom: '18px' }}>
                <span className="mono" style={{ color: 'var(--steel)', display: 'block', marginBottom: '4px' }}>TECHNICAL SKILLS & TOOLS</span>
                <div style={{ background: 'rgba(4, 16, 30, 0.7)', padding: '10px 14px', border: '1px solid var(--line)', fontSize: '13px' }}>
                  {selectedApplication.technical_skills}
                </div>
              </div>
            )}

            {selectedApplication.portfolio_link && (
              <div style={{ marginBottom: '18px' }}>
                <span className="mono" style={{ color: 'var(--steel)', display: 'block', marginBottom: '4px' }}>PORTFOLIO / GITHUB LINK</span>
                <a
                  href={selectedApplication.portfolio_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--engineering-blue)', fontSize: '13px', textDecoration: 'underline' }}
                >
                  {selectedApplication.portfolio_link} ↗
                </a>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <span className="mono" style={{ color: 'var(--steel)', display: 'block', marginBottom: '4px' }}>STATEMENT OF PURPOSE / WHY CSR</span>
              <div style={{ background: 'rgba(4, 16, 30, 0.7)', padding: '12px 14px', border: '1px solid var(--line)', fontSize: '14px', lineHeight: '1.7', color: 'var(--soft-white)', whiteSpace: 'pre-wrap' }}>
                {selectedApplication.statement_of_purpose}
              </div>
            </div>

            <div className="admin-modal-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                <span className="mono" style={{ color: 'var(--steel)', fontSize: '11px' }}>
                  Current Status: <strong style={{ color: 'var(--white)' }}>{selectedApplication.status.toUpperCase()}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedApplication.status !== 'rejected' && (
                  <button
                    type="button"
                    className="btn-admin danger"
                    onClick={() => handleReject(selectedApplication.id)}
                  >
                    Reject
                  </button>
                )}
                {selectedApplication.status !== 'approved' && (
                  <button
                    type="button"
                    className="btn-admin primary"
                    onClick={() => handleApprove(selectedApplication)}
                  >
                    Approve & Add to Roster
                  </button>
                )}
                <button
                  type="button"
                  className="btn-admin"
                  onClick={() => setSelectedApplication(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {(isAddOpen || editingMember) && (
        <div className="admin-modal-backdrop" onClick={() => { setIsAddOpen(false); setEditingMember(null); }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingMember ? 'Edit Member Profile' : 'Add New Member to Roster'}</h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => { setIsAddOpen(false); setEditingMember(null); }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveMember}>
              <div className="modal-form-grid">
                <div className="form-group modal-form-full">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Division</label>
                  <select
                    className="form-input"
                    value={formData.division_id}
                    onChange={e => handleDivisionChange(e.target.value)}
                  >
                    {memberDivisions.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. Division Lead, Member"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Academic Year</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. II Year, III Year"
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. Computer Science and Engineering"
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Section (Sec)</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. A, B, C"
                    value={formData.sec}
                    onChange={e => setFormData({ ...formData, sec: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="official or personal email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    className="form-input"
                    type="tel"
                    placeholder="10-digit mobile"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GitHub URL</label>
                  <input
                    className="form-input"
                    type="url"
                    placeholder="https://github.com/username"
                    value={formData.github_url}
                    onChange={e => setFormData({ ...formData, github_url: e.target.value })}
                  />
                </div>

                <div className="form-group modal-form-full">
                  <label className="form-label">Biography / Portfolio Notes</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Brief description of interests, projects, or leadership responsibilities"
                    value={formData.bio}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-admin"
                  onClick={() => { setIsAddOpen(false); setEditingMember(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-admin primary">
                  {editingMember ? 'Save Changes' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmId && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="admin-modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Confirm Deletion</h3>
              <button type="button" className="admin-modal-close" onClick={() => setDeleteConfirmId(null)}>
                ×
              </button>
            </div>
            <p className="body-copy">
              Are you sure you want to delete member <code>{deleteConfirmId}</code> from the database? This action cannot be undone.
            </p>
            <div className="admin-modal-footer">
              <button type="button" className="btn-admin" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-admin danger"
                onClick={() => handleDelete(deleteConfirmId)}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
