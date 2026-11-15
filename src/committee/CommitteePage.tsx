import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer, Label } from '../components';
import { getBillboardMembers } from '../services/billboard';
import type { CsrBillboardMember } from '../types/database.types';
import { getMemberInitials } from '../members/data';
import { getDivisionAccentById } from '../members/division-accent';
import './committee.css';

interface CommitteePerson {
  role: string;
  name: string;
  year: string;
  department: string;
  category: 'founding' | 'leadership' | 'administration';
  highlightRole?: string;
}

// Founders & Co-Founders (Top Section)
const FOUNDERS: CommitteePerson[] = [
  {
    role: 'Founder',
    highlightRole: 'Founder & Technical Lead',
    name: 'Varun S',
    year: 'III Year',
    department: 'Electronics and Communication Engineering',
    category: 'founding',
  },
  {
    role: 'Co-Founder',
    highlightRole: 'Co-Founder & Administrative Head',
    name: 'Lingeshram',
    year: 'III Year',
    department: 'VLSI',
    category: 'founding',
  },
  {
    role: 'Co-Founder',
    highlightRole: 'Co-Founder',
    name: 'Roger L Christopher',
    year: 'III Year',
    department: 'Computer Science and Business Systems',
    category: 'founding',
  },
];

// Core Committee (Administrative & Office Bearers)
// Founders/Co-Founders (Varun S, Lingeshram) are excluded here per instructions
const CORE_COMMITTEE: CommitteePerson[] = [
  {
    role: 'Deputy Technical Lead',
    name: 'Priyadharshini',
    year: 'II Year',
    department: 'Electronics and Communication Engineering',
    category: 'leadership',
  },
  {
    role: 'Secretary',
    name: 'Anto Merray',
    year: 'III Year',
    department: 'Computer Science and Business Systems',
    category: 'administration',
  },
  {
    role: 'Secretary',
    name: 'Pooja S',
    year: 'III Year',
    department: 'VLSI',
    category: 'administration',
  },
  {
    role: 'Joint Secretary',
    name: 'Paul Bryton Raj',
    year: 'II Year',
    department: 'Computer Science and Engineering',
    category: 'administration',
  },
  {
    role: 'Joint Secretary',
    name: 'Sadhana Sri',
    year: 'II Year',
    department: 'Artificial Intelligence and Data Science',
    category: 'administration',
  },
  {
    role: 'Treasurer',
    name: 'G S Kowshik kumar',
    year: 'III Year',
    department: 'VLSI',
    category: 'administration',
  },
  {
    role: 'Joint Treasurer',
    name: 'Mohamed Mufrih S',
    year: 'III Year',
    department: 'VLSI',
    category: 'administration',
  },
  {
    role: 'Public Relations Officer',
    name: 'Padmavathy s',
    year: 'III Year',
    department: 'VLSI',
    category: 'administration',
  },
];

export default function CommitteePage() {
  const [billboard, setBillboard] = useState<CsrBillboardMember[]>([]);
  const [loadingBillboard, setLoadingBillboard] = useState(true);

  useEffect(() => {
    let active = true;
    getBillboardMembers().then(res => {
      if (!active) return;
      setBillboard(res.items.slice(0, 6));
      setLoadingBillboard(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const activeBillboard = billboard.filter(item => Boolean(item.name && item.name.trim()));

  return (
    <div className="committee-shell">
      <main id="main-content" className="committee-page" aria-label="CSR-RIT Core Committee">
        <div className="committee-wrap">
          {/* Topline Header */}
          <header className="committee-intro">
            <Label number="CSR-RIT">LEADERSHIP & GOVERNANCE</Label>
            <h1>
              Core <span className="committee-accent">Committee</span>.
            </h1>
            <div className="committee-intro-bottom">
              <p className="committee-intro-copy">
                The founding architects, administrative officers, and representative council shaping student engineering at Rajalakshmi Institute of Technology.
              </p>
              <div className="committee-meta-stats">
                <span>FOUNDING & ADMINISTRATION</span>
                <strong>11 LEADERS · {activeBillboard.length} COUNCIL MINDS</strong>
              </div>
            </div>
          </header>

          {/* Section 1: Founders & Co-Founders (Top of Page) */}
          <section className="committee-section founders-section" aria-labelledby="founders-title">
            <div className="section-head">
              <div className="section-head-title">
                <span className="section-pill">FOUNDING LEADERSHIP</span>
                <h2 id="founders-title">Founders & Co-Founders</h2>
              </div>
              <p className="section-caption">Visionaries who established the CSR-RIT engineering ecosystem.</p>
            </div>

            <div className="founders-grid">
              {FOUNDERS.map((founder, idx) => {
                const initials = getMemberInitials(founder.name);
                const isPrimary = founder.role === 'Founder';
                return (
                  <div key={founder.name} className={`founder-card ${isPrimary ? 'is-primary-founder' : ''}`}>
                    <div className="founder-card-aura" aria-hidden="true" />
                    <div className="founder-card-inner">
                      <div className="founder-card-header">
                        <span className="founder-badge-role">{founder.role}</span>
                        <span className="founder-index mono">0{idx + 1}</span>
                      </div>

                      <div className="founder-avatar-wrap">
                        <div className="founder-avatar">
                          <span>{initials}</span>
                        </div>
                        <div className="founder-emblem-badge" title="CSR-RIT Leadership">
                          <img src="/brand/rit-emblem.png" alt="" aria-hidden="true" />
                        </div>
                      </div>

                      <div className="founder-info">
                        <h3 className="founder-name">{founder.name}</h3>
                        <p className="founder-full-role">{founder.highlightRole}</p>
                        <div className="founder-meta">
                          <span className="founder-year">{founder.year}</span>
                          <span className="founder-dept">{founder.department}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 2: Core Committee (Administrative & Office Bearers) */}
          <section className="committee-section core-section" aria-labelledby="core-title">
            <div className="section-head">
              <div className="section-head-title">
                <span className="section-pill section-pill--navy">ADMINISTRATIVE BOARD</span>
                <h2 id="core-title">Core Committee</h2>
              </div>
              <p className="section-caption">Office bearers driving community operations, technical direction, and student welfare.</p>
            </div>

            <div className="core-committee-grid">
              {CORE_COMMITTEE.map((officer, idx) => {
                const initials = getMemberInitials(officer.name);
                const roleType =
                  officer.role.toLowerCase().includes('lead') ? 'lead' :
                  officer.role.toLowerCase().includes('secretary') ? 'secretary' :
                  officer.role.toLowerCase().includes('treasurer') ? 'treasurer' : 'officer';

                return (
                  <div key={`${officer.name}-${idx}`} className={`committee-card committee-card--${roleType}`}>
                    <div className="committee-card-top">
                      <span className="committee-card-role">{officer.role}</span>
                      <span className="committee-card-idx mono">#{String(idx + 1).padStart(2, '0')}</span>
                    </div>

                    <div className="committee-card-main">
                      <div className="committee-avatar">
                        <span>{initials}</span>
                      </div>
                      <div className="committee-info">
                        <h4 className="committee-name">{officer.name}</h4>
                        <div className="committee-card-details">
                          <span className="committee-year">{officer.year}</span>
                          <span className="committee-dot" aria-hidden="true">·</span>
                          <span className="committee-dept">{officer.department}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 3: Executive Council Billboard (6 Members) */}
          <section className="committee-section billboard-section" aria-labelledby="billboard-title">
            <div className="section-head">
              <div className="section-head-title">
                <span className="section-pill section-pill--gold">COUNCIL BILLBOARD</span>
                <h2 id="billboard-title">
                  Executive Billboard{activeBillboard.length > 0 ? ` · ${activeBillboard.length} Representative Mind${activeBillboard.length > 1 ? 's' : ''}` : ''}
                </h2>
              </div>
              <p className="section-caption">Representative council minds showcased across research, engineering, and operations.</p>
            </div>

            <div className="billboard-showcase">
              {loadingBillboard ? (
                <div className="billboard-loading" role="status">
                  <span className="mono">Loading executive council billboard…</span>
                </div>
              ) : activeBillboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--steel)' }}>
                  <p>No council representatives currently assigned.</p>
                </div>
              ) : (
                <div className="billboard-cards-grid">
                  {activeBillboard.map((item, idx) => {
                    const initials = getMemberInitials(item.name);
                    const divId = item.division.toLowerCase().includes('ai') ? 'ai' :
                                  item.division.toLowerCase().includes('embed') ? 'embedded' :
                                  item.division.toLowerCase().includes('robot') ? 'robotics' :
                                  item.division.toLowerCase().includes('soft') ? 'software' :
                                  item.division.toLowerCase().includes('iot') ? 'iot' :
                                  item.division.toLowerCase().includes('operat') ? 'operations' : 'research';
                    const accent = getDivisionAccentById(divId);

                    return (
                      <div
                        key={item.position || idx}
                        className="billboard-showcase-card"
                        style={{ '--accent': accent } as React.CSSProperties}
                      >
                        <div className="billboard-card-rank mono">
                          <span>0{idx + 1}</span>
                          <span className="billboard-rank-dot" style={{ backgroundColor: accent }} />
                        </div>

                        <div className="billboard-showcase-avatar">
                          <span>{initials}</span>
                        </div>

                        <div className="billboard-showcase-content">
                          <h4 className="billboard-showcase-name">{item.name}</h4>
                          <p className="billboard-showcase-title">{item.title || 'Council Member'}</p>
                          <span className="billboard-showcase-division">{item.division}</span>
                          {(item.year || item.department) && (
                            <small className="billboard-showcase-meta">
                              {item.year && <span>{item.year}</span>}
                              {item.department && <span>{item.department}</span>}
                            </small>
                          )}
                        </div>

                        <Link
                          to={`/members`}
                          className="billboard-portfolio-link"
                          title={`Explore ${item.name} on Member Orbit`}
                        >
                          View in Orbit <span aria-hidden="true">↗</span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer tone="light" />
    </div>
  );
}

