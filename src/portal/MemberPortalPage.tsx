import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMemberByUserId, getMembers, updateMember, linkUserToMember } from '../services/members';
import type { CsrMember } from '../types/database.types';
import { memberDivisions, getMemberStats, getMemberInitials } from '../members/data';
import { getDivisionAccent } from '../members/division-accent';
import { Label } from '../components';
import EngineeringEnvironment from '../background/EngineeringEnvironment';
import './portal.css';

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export default function MemberPortalPage() {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const [member, setMember] = useState<CsrMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const compact = useMedia('(max-width: 760px)');
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');

  // Link selector state
  const [allRoster, setAllRoster] = useState<CsrMember[]>([]);
  const [rosterCounts, setRosterCounts] = useState<Record<string, number>>({});
  const [rosterError, setRosterError] = useState('');
  const [rosterCountsLoading, setRosterCountsLoading] = useState(true);
  const [selectedRosterId, setSelectedRosterId] = useState('');
  const [linking, setLinking] = useState(false);

  // Editable fields
  const [bio, setBio] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  async function loadMemberData() {
    if (!user) return;
    setLoading(true);

    const m = await getMemberByUserId(user.id);
    if (m) {
      setMember(m);
      setBio(m.bio || '');
      setGithubUrl(m.github_url || '');
      setLinkedinUrl(m.linkedin_url || '');
    } else {
      // Load roster list so user can self-claim/link their record
      const res = await getMembers();
      setAllRoster(res.raw);
    }

    setLoading(false);
  }

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
  }, [user]);

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
      setStatusMsg({ type: 'success', text: 'Member profile updated successfully!' });
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
  const divisionAccent = member
    ? getDivisionAccent({ divisionId: member.division_id, division: member.division })
    : null;

  const role = profile?.role || 'member';

  return (
    <main id="main-content" className="portal-page">
      {/* 3D Live Mathematical Particle Environment */}
      <EngineeringEnvironment
        variant="members"
        motion={{ rotation: 0 }}
        compact={compact}
        reducedMotion={reducedMotion}
        paused={false}
      />

      <div className="portal-container">
        {/* Top Header Card */}
        <div className="portal-header-card">
          <div className="portal-header-main">
            <div className="portal-medallion" aria-hidden="true">
              <img src="/brand/rit-emblem.png" alt="" />
              <strong>CSR</strong>
            </div>

            <div className="portal-user-meta">
              <Label>CSR-RIT / MEMBER PORTFOLIO HUB</Label>
              <h1 className="portal-user-name">
                Welcome, {profile?.full_name || user?.email?.split('@')[0]}
              </h1>
              <div className="portal-user-badge-row">
                <span className={`portal-role-pill ${role.toLowerCase().includes('admin') ? 'admin' : role.toLowerCase().includes('lead') ? 'lead' : 'member'}`}>
                  {role.toUpperCase()}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--portal-subtle)', fontFamily: 'var(--font-mono)' }}>
                  ID: {user?.id.slice(0, 8)}…
                </span>
              </div>
            </div>
          </div>

          <div className="portal-header-actions">
            {isAdmin && (
              <Link to="/admin" className="portal-admin-link">
                Admin Console →
              </Link>
            )}
            <button
              type="button"
              className="portal-signout-btn"
              onClick={() => signOut()}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Global Alert Notification */}
        {statusMsg && (
          <div className={`portal-alert ${statusMsg.type}`}>
            {statusMsg.type === 'success' ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {loading ? (
          <div className="portal-loading">
            <span className="portal-loading-dot" />
            Loading Official Member Record…
          </div>
        ) : member ? (
          /* Two-Column Grid: 3D Badge + Dossier Form */
          <div className="portal-grid">
            {/* Column 1: Member Identity Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                className="portal-badge-card"
                style={{
                  '--member-accent': divisionAccent?.accent || 'var(--portal-blue)',
                } as any}
              >
                <div className="portal-badge-hero">
                  <div className="portal-division-avatar">
                    {getMemberInitials(member.name)}
                  </div>
                  <div className="portal-badge-name-wrap">
                    <h2 className="portal-badge-fullname">{member.name}</h2>
                    <span className="portal-badge-role">
                      {member.role || 'Active Member'}
                    </span>
                  </div>
                </div>

                <div className="portal-specs">
                  <div className="portal-spec-item">
                    <span className="portal-spec-key">Division Specialization</span>
                    <span className="portal-spec-value">{member.division}</span>
                  </div>

                  <div className="portal-spec-item">
                    <span className="portal-spec-key">Academic Discipline</span>
                    <span className="portal-spec-value">{member.year || 'Undergraduate'}</span>
                    <span className="portal-spec-subtext">{member.department}</span>
                  </div>

                  <div className="portal-spec-item">
                    <span className="portal-spec-key">Verified Contact</span>
                    <span className="portal-spec-value" style={{ wordBreak: 'break-all' }}>
                      {member.email || user?.email}
                    </span>
                    {member.phone && (
                      <span className="portal-spec-subtext">{member.phone}</span>
                    )}
                  </div>
                </div>
              </div>

              {divisionInfo && (
                <div
                  className="portal-division-card"
                  style={{
                    '--member-accent': divisionAccent?.accent || 'var(--portal-blue)',
                  } as any}
                >
                  <span className="portal-div-title">Division Administration</span>
                  <p className="portal-div-lead-text">
                    Division Lead: <strong>{divisionInfo.lead || 'Executive Lead'}</strong>
                  </p>
                  <p className="portal-div-count-text">
                    Active Cohort Members:{' '}
                    <strong>
                      {rosterCountsLoading
                        ? 'Counting…'
                        : rosterError
                        ? 'Unavailable'
                        : (rosterCounts[divisionInfo.id] ?? '—')}
                    </strong>
                  </p>
                </div>
              )}
            </div>

            {/* Column 2: Public Profile & Links Form */}
            <div className="portal-editor-card">
              <div className="portal-editor-head">
                <Label>MEMBER DOSSIER / LIVE LEDGER</Label>
                <h2 className="portal-editor-title">Public Profile & Portfolio</h2>
                <p className="portal-editor-desc">
                  Update your technical biography, repository links, and external portfolios visible on the public member directory.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="portal-bio">
                    Technical Biography / Specializations
                  </label>
                  <textarea
                    id="portal-bio"
                    className="portal-textarea"
                    rows={4}
                    placeholder="Share your technical interests, project achievements, laboratory tools, or domains you build in…"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="portal-github">
                    GitHub Profile URL
                  </label>
                  <input
                    id="portal-github"
                    className="portal-input"
                    type="url"
                    placeholder="https://github.com/your-username"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="portal-linkedin">
                    LinkedIn Profile URL
                  </label>
                  <input
                    id="portal-linkedin"
                    className="portal-input"
                    type="url"
                    placeholder="https://linkedin.com/in/your-profile"
                    value={linkedinUrl}
                    onChange={e => setLinkedinUrl(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="portal-submit-btn"
                  disabled={saving}
                >
                  {saving ? 'Transmitting Updates…' : 'Save Dossier Changes'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Unlinked State with Verified Email Matching */
          <div className="portal-claim-card">
            <Label>IDENTITY VERIFICATION / SECURITY SPRINT</Label>
            <h2 className="portal-claim-title">Connect Your Official Roster Profile</h2>

            {(() => {
              const matchingRoster = allRoster.filter(r =>
                r.email && user?.email && r.email.trim().toLowerCase() === user.email.trim().toLowerCase()
              );

              if (matchingRoster.length > 0) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: 'var(--portal-copy)' }}>
                      We found an official CSR division roster record matching your authenticated email (<strong>{user?.email}</strong>):
                    </p>

                    <form onSubmit={handleLinkAccount} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div className="portal-form-group">
                        <label className="portal-label" htmlFor="roster-select">
                          Matched Roster Record
                        </label>
                        <select
                          id="roster-select"
                          className="portal-select"
                          value={selectedRosterId || matchingRoster[0].id}
                          onChange={e => setSelectedRosterId(e.target.value)}
                          required
                        >
                          {matchingRoster.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name} — {r.division} ({r.role || 'Member'}, {r.year})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="portal-submit-btn"
                        disabled={linking}
                        onClick={() => {
                          if (!selectedRosterId && matchingRoster[0]) {
                            setSelectedRosterId(matchingRoster[0].id);
                          }
                        }}
                      >
                        {linking ? 'Claiming Record…' : 'Claim Verified Profile →'}
                      </button>
                    </form>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: 'var(--portal-copy)' }}>
                    Your authenticated account (<code>{user?.email}</code>) is active, but does not match any unclaimed record in the official CSR member ledger.
                  </p>

                  <div className="portal-notice-box">
                    <p>
                      <strong>Strict Security Policy:</strong> To protect student identities and credentials, accounts cannot arbitrarily claim division roster profiles without verified email matching.
                    </p>
                  </div>

                  <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'var(--portal-subtle)' }}>
                    If you are an active member and registered with a personal email, or if your college email was updated, please contact your Division Lead or an Administrator to link your record.
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </main>
  );
}
