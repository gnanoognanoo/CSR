import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getMemberByUserId, getMembers, updateMember, linkUserToMember, getClaimCandidateForEmail, type ClaimCandidate } from '../services/members';
import type { CsrMember } from '../types/database.types';
import { memberDivisions, getMemberStats } from '../members/data';
import { Label } from '../components';
import '../admin/admin.css';

export default function MemberPortalPage() {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const [member, setMember] = useState<CsrMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Link selector state (C3 FIX: Targeted candidate instead of bulk roster download)
  const [claimCandidate, setClaimCandidate] = useState<ClaimCandidate | null>(null);
  const [rosterCounts, setRosterCounts] = useState<Record<string, number>>({});
  const [rosterError, setRosterError] = useState('');
  const [rosterCountsLoading, setRosterCountsLoading] = useState(true);
  const [selectedRosterId, setSelectedRosterId] = useState('');
  const [linking, setLinking] = useState(false);

  // Editable fields
  const [bio, setBio] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const loadMemberData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const m = await getMemberByUserId(user.id);
    if (m) {
      setMember(m);
      setBio(m.bio || '');
      setGithubUrl(m.github_url || '');
      setLinkedinUrl(m.linkedin_url || '');
    } else if (user?.email) {
      // C3 FIX: Targeted candidate search by verified user email (no bulk roster download)
      const { candidate } = await getClaimCandidateForEmail(user.email);
      setClaimCandidate(candidate);
      if (candidate) {
        setSelectedRosterId(candidate.id);
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadMemberData();
    let active = true;
    getMembers().then(result => {
      if (!active) return;
      if (result.error) setRosterError(result.error);
      if (result.fromSupabase || !result.error) {
        setRosterCounts(getMemberStats(result.members).byDivision);
      } else {
        setRosterCounts({});
      }
      setRosterCountsLoading(false);
    }).catch(error => {
      if (active) {
        setRosterError(error instanceof Error ? error.message : 'Division totals could not be loaded.');
        setRosterCounts({});
        setRosterCountsLoading(false);
      }
    });
    return () => { active = false; };
  }, [user, loadMemberData]);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!member) return;

    setSaving(true);
    setStatusMsg(null);

    const res = await updateMember(member.id, {
      bio,
      github_url: githubUrl,
      linkedin_url: linkedinUrl,
    });

    setSaving(false);
    if (res.error) {
      setStatusMsg({ type: 'error', text: `Failed to save: ${res.error}` });
    } else {
      setStatusMsg({ type: 'success', text: 'Profile updated successfully!' });
      setMember(res.data);
    }
  }

  async function handleLinkAccount(e: FormEvent) {
    e.preventDefault();
    if (!user || !selectedRosterId) return;

    setLinking(true);
    setStatusMsg(null);

    const res = await linkUserToMember(user.id, selectedRosterId);
    setLinking(false);

    if (res.error) {
      setStatusMsg({ type: 'error', text: `Failed to link: ${res.error}` });
    } else {
      setStatusMsg({ type: 'success', text: 'Account linked to roster record!' });
      await refreshProfile();
      await loadMemberData();
    }
  }

  const divisionInfo = member ? memberDivisions.find(d => d.id === member.division_id) : null;

  return (
    <main id="main-content" className="admin-page">
      <div className="section-wrap" style={{ maxWidth: '1000px', margin: '0 auto', padding: 0 }}>
        {/* Header */}
        <div className="admin-header">
          <div>
            <Label>CSR-RIT / MEMBER PORTFOLIO HUB</Label>
            <h1>Welcome, {profile?.full_name || user?.email?.split('@')[0]}</h1>
            <p className="body-copy" style={{ margin: '8px 0 0', fontSize: '15px' }}>
              Account role: <span className={`role-badge ${profile?.role || 'member'}`}>{(profile?.role || 'member').toUpperCase()}</span>
              {isAdmin && (
                <span style={{ marginLeft: '12px' }}>
                  <Link to="/admin" className="outline-link" style={{ padding: '4px 10px', fontSize: '13px' }}>
                    Open Admin Console →
                  </Link>
                </span>
              )}
            </p>
          </div>
          <div className="admin-actions">
            <button type="button" className="btn-admin" onClick={() => signOut()}>
              Sign Out
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className={`auth-alert ${statusMsg.type}`} style={{ marginBottom: '24px' }}>
            <span>{statusMsg.text}</span>
          </div>
        )}

        {loading ? (
          <p className="body-copy">Loading member record…</p>
        ) : member ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }}>
            {/* Member Card */}
            <div>
              <div className="stat-card" style={{ marginBottom: '20px' }}>
                <span className="stat-label">CSR Official Badge</span>
                <h3 style={{ fontSize: '26px', margin: '10px 0 6px', color: 'var(--white)' }}>{member.name}</h3>
                <span className={`role-badge ${member.role?.toLowerCase().includes('lead') ? 'lead' : 'member'}`}>
                  {member.role || 'Member'}
                </span>

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>DIVISION</span>
                    <strong>{member.division}</strong>
                  </div>
                  <div>
                    <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>YEAR & DEPARTMENT</span>
                    <div>{member.year || '—'}</div>
                    <small style={{ color: 'var(--steel)' }}>{member.department}</small>
                  </div>
                  <div>
                    <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>OFFICIAL EMAIL</span>
                    <span>{member.email || user?.email}</span>
                  </div>
                  {member.phone && (
                    <div>
                      <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>PHONE</span>
                      <span className="mono">{member.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {divisionInfo && (
                <div className="stat-card">
                  <span className="stat-label">Division Leadership</span>
                  <p style={{ margin: '8px 0', fontSize: '15px' }}>
                    Lead: <strong>{divisionInfo.lead || 'Not assigned'}</strong>
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--steel)' }}>
                    Total Division Members: {rosterCountsLoading ? 'Loading' : rosterError ? 'Unavailable' : (rosterCounts[divisionInfo.id] ?? 0)}
                  </p>
                </div>
              )}
            </div>

            {/* Edit Self-Profile Form */}
            <div className="stat-card">
              <span className="stat-label">Edit Your Member Details</span>
              <h3 style={{ fontSize: '20px', margin: '8px 0 20px' }}>Public Profile & Links</h3>

              <form onSubmit={handleSaveProfile} className="auth-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="portal-bio">Personal Bio / Specializations</label>
                  <textarea
                    id="portal-bio"
                    className="form-input"
                    rows={4}
                    placeholder="Share your technical interests, project achievements, or tools you build with…"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="portal-github">GitHub Profile URL</label>
                  <input
                    id="portal-github"
                    className="form-input"
                    type="url"
                    placeholder="https://github.com/your-username"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="portal-linkedin">LinkedIn Profile URL</label>
                  <input
                    id="portal-linkedin"
                    className="form-input"
                    type="url"
                    placeholder="https://linkedin.com/in/your-profile"
                    value={linkedinUrl}
                    onChange={e => setLinkedinUrl(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-admin primary" disabled={saving}>
                  {saving ? 'Saving Changes…' : 'Update Profile'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* H2 FIX: Unlinked State with Verified Email Matching */
          <div className="stat-card" style={{ maxWidth: '640px' }}>
            <span className="stat-label">Member Verification</span>
            <h2 style={{ fontSize: '28px', margin: '12px 0' }}>Connect Your Member Profile</h2>
            
            {claimCandidate ? (
              <div>
                <p className="body-copy" style={{ fontSize: '14px', marginBottom: '18px' }}>
                  We found an official roster record matching your verified email (<strong>{user?.email}</strong>):
                </p>
                <form onSubmit={handleLinkAccount} className="auth-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="roster-select">Matched Roster Record</label>
                    <select
                      id="roster-select"
                      className="form-input"
                      value={selectedRosterId || claimCandidate.id}
                      onChange={e => setSelectedRosterId(e.target.value)}
                      required
                    >
                      <option value={claimCandidate.id}>
                        {claimCandidate.name} — {claimCandidate.division} ({claimCandidate.role || 'Member'}{claimCandidate.year ? `, ${claimCandidate.year}` : ''})
                      </option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn-admin primary"
                    disabled={linking}
                    onClick={() => { if (!selectedRosterId) setSelectedRosterId(claimCandidate.id); }}
                  >
                    {linking ? 'Verifying & Linking…' : 'Claim Verified Profile'}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <p className="body-copy" style={{ fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                  Your sign-in email (<code>{user?.email}</code>) is registered, but does not match any unclaimed record in the official CSR roster.
                </p>
                <div style={{ background: 'rgba(235, 87, 87, 0.08)', border: '1px solid rgba(235, 87, 87, 0.25)', padding: '14px 18px', borderRadius: '4px', marginBottom: '20px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--soft-white)' }}>
                    <strong>Strict Security Policy:</strong> To protect student identities and credentials, accounts cannot arbitrarily claim division roster profiles without email verification.
                  </p>
                </div>
                <p className="body-copy" style={{ fontSize: '13px', color: 'var(--steel)' }}>
                  If you are an active member and signed in with a different email, or if your college email was updated, please contact your Division Lead or an Administrator to link your profile.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
