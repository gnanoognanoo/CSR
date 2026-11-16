import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { memberDivisions } from '../members/data';
import { getDivisionAccent } from '../members/division-accent';
import { submitApplication } from '../services/members';
import type { CreateApplicationInput } from '../types/database.types';
import EngineeringEnvironment from '../background/EngineeringEnvironment';
import './join.css';

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

export default function JoinCommunityPage() {
  const [formData, setFormData] = useState<CreateApplicationInput>({
    full_name: '',
    email: '',
    phone: '',
    reg_no: '',
    year: 'I Year',
    department: 'Artificial Intelligence and Data Science',
    sec: 'A',
    primary_division: 'AI & Intelligent Systems',
    secondary_division: 'Software Engineering',
    technical_skills: '',
    statement_of_purpose: '',
    portfolio_link: '',
    criteria_accepted: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const compact = useMedia('(max-width: 760px)');
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');

  const departments = [
    'Artificial Intelligence and Data Science',
    'Artificial Intelligence and Machine Learning',
    'Computer Science and Engineering',
    'Computer Science and Business Systems',
    'Computer and Communication Engineering',
    'Electronics and Communication Engineering',
    'VLSI Design and Technology',
    'Mechanical Engineering',
    'Biotechnology',
  ];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    // Anti-spam rate limiting check (H3)
    const lastSubmitTime = localStorage.getItem('csr_last_app_submit');
    if (lastSubmitTime && Date.now() - parseInt(lastSubmitTime, 10) < 60000) {
      const waitSec = Math.ceil((60000 - (Date.now() - parseInt(lastSubmitTime, 10))) / 1000);
      setErrorMsg(`Please wait ${waitSec} seconds before submitting another application.`);
      return;
    }

    if (!formData.criteria_accepted) {
      setErrorMsg('Please confirm you accept the cohort criteria before submitting.');
      return;
    }

    // URL validation (M3 / H3)
    if (formData.portfolio_link && formData.portfolio_link.trim() !== '') {
      const trimmedUrl = formData.portfolio_link.trim();
      if (!/^https?:\/\//i.test(trimmedUrl)) {
        setErrorMsg('Portfolio or project link must start with https:// or http://');
        return;
      }
    }

    setSubmitting(true);
    const res = await submitApplication(formData);
    setSubmitting(false);

    if (res.error) {
      setErrorMsg(`Submission failed: ${res.error}`);
    } else {
      localStorage.setItem('csr_last_app_submit', Date.now().toString());
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (submitted) {
    return (
      <main id="main-content" className="join-page">
        <EngineeringEnvironment
          variant="members"
          motion={{ rotation: 0 }}
          compact={compact}
          reducedMotion={reducedMotion}
          paused={false}
        />

        <div className="join-success-card">
          <div className="join-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <div>
            <span className="join-badge-pill" style={{ marginBottom: '12px' }}>
              <span className="join-badge-dot" />
              TRANSMITTED TO CSR EXECUTIVE COMMITTEE
            </span>
            <h1 className="join-success-title">
              Application <span className="accent">Submitted.</span>
            </h1>
          </div>

          <p className="join-success-desc">
            Thank you, <strong>{formData.full_name}</strong>. Your candidate dossier for the <strong>{formData.primary_division}</strong> division has been securely registered in the CSR selection ledger.
          </p>

          <div className="join-next-steps">
            <span className="join-next-title">Next Steps in Selection</span>
            <ul>
              <li>Applications are reviewed on a rolling basis by technical division leads.</li>
              <li>Shortlisted candidates will be invited for a brief technical discussion or problem challenge.</li>
              <li>Watch for updates on your phone (<code>{formData.phone}</code>) and email (<code>{formData.email}</code>).</li>
            </ul>
          </div>

          <div className="join-success-actions">
            <Link className="join-btn-orbit" to="/members">
              Explore Member Orbit →
            </Link>
            <Link className="join-btn-home" to="/">
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="join-page">
      {/* 3D Dynamic Particle Environment */}
      <EngineeringEnvironment
        variant="members"
        motion={{ rotation: 0 }}
        compact={compact}
        reducedMotion={reducedMotion}
        paused={false}
      />

      <div className="join-container">
        {/* Top 3D Header */}
        <div className="join-hero-wrap">
          <div className="join-medallion" aria-hidden="true">
            <img src="/brand/rit-emblem.png" alt="" />
            <strong>RIT</strong>
          </div>

          <div className="join-badge-pill">
            <span className="join-badge-dot" />
            ROUND 01 ADMISSIONS · 7 DIVISIONS OPEN
          </div>

          <h1 className="join-title">
            Join the <span className="accent">Community.</span>
          </h1>

          <p className="join-subtitle">
            CSR is an autonomous student engineering collective at Rajalakshmi Institute of Technology dedicated to advancing robotics, intelligent systems, hardware architecture, and software engineering.
          </p>
        </div>

        {/* Eligibility Criteria Cards */}
        <div className="join-criteria-panel">
          <div className="join-panel-head">
            <span className="join-panel-label">Cohort Admissions Criteria</span>
            <span className="join-panel-meta">ACADEMIC YEAR 2026—2027</span>
          </div>
          <div className="join-criteria-grid">
            <div className="join-criteria-card">
              <span className="join-criteria-num">01 / ENROLLED UNDERGRADUATE</span>
              <div className="join-criteria-title">RIT Student</div>
              <p className="join-criteria-desc">
                Must be an actively enrolled undergraduate student at Rajalakshmi Institute of Technology across any department or year.
              </p>
            </div>
            <div className="join-criteria-card">
              <span className="join-criteria-num">02 / ACTIVE COMMITMENT</span>
              <div className="join-criteria-title">4–6 Hours Weekly</div>
              <p className="join-criteria-desc">
                Able to commit 4–6 hours weekly for laboratory sprint builds, research publications, hackathons, and community reviews.
              </p>
            </div>
            <div className="join-criteria-card">
              <span className="join-criteria-num">03 / BUILDER MINDSET</span>
              <div className="join-criteria-title">Relentless Curiosity</div>
              <p className="join-criteria-desc">
                Obsession with building tangible engineering prototypes, eagerness to learn first-principles, and drive to collaborate cross-divisionally.
              </p>
            </div>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {errorMsg && (
          <div className="join-alert error">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Application Form Card */}
        <div className="join-form-card">
          <form onSubmit={handleSubmit} noValidate>
            {/* Section 1: Candidate Identity */}
            <div className="join-form-section">
              <h2 className="join-section-title">
                <span className="join-section-num">1</span>
                Candidate Identification
              </h2>
              <p className="join-section-desc">
                Your contact details for correspondence regarding interview schedules and cohort results.
              </p>

              <div className="join-grid-2">
                <div className="join-field">
                  <label className="join-field-label" htmlFor="app-fullname">
                    Full Name <span className="req">*</span>
                  </label>
                  <input
                    id="app-fullname"
                    className="join-input"
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Anto Jenishia A"
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div className="join-field">
                  <label className="join-field-label" htmlFor="app-regno">
                    College Register / Roll Number
                  </label>
                  <input
                    id="app-regno"
                    className="join-input"
                    type="text"
                    maxLength={30}
                    placeholder="e.g. 2117240101001"
                    value={formData.reg_no}
                    onChange={e => setFormData({ ...formData, reg_no: e.target.value })}
                  />
                </div>

                <div className="join-field">
                  <label className="join-field-label" htmlFor="app-email">
                    Institutional Email Address <span className="req">*</span>
                  </label>
                  <input
                    id="app-email"
                    className="join-input"
                    type="email"
                    required
                    maxLength={150}
                    placeholder="name.dept@ritchennai.edu.in"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="join-field">
                  <label className="join-field-label" htmlFor="app-phone">
                    Phone / WhatsApp Number <span className="req">*</span>
                  </label>
                  <input
                    id="app-phone"
                    className="join-input"
                    type="tel"
                    required
                    maxLength={30}
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Academic Program */}
            <div className="join-form-section">
              <h2 className="join-section-title">
                <span className="join-section-num">2</span>
                Academic Enrollment
              </h2>
              <p className="join-section-desc">
                Current academic year and engineering discipline at Rajalakshmi Institute of Technology.
              </p>

              <div className="join-grid-3">
                <div className="join-field">
                  <label className="join-field-label" htmlFor="app-year">
                    Academic Year <span className="req">*</span>
                  </label>
                  <select
                    id="app-year"
                    className="join-select"
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: e.target.value })}
                  >
                    <option value="I Year">I Year</option>
                    <option value="II Year">II Year</option>
                    <option value="III Year">III Year</option>
                    <option value="IV Year">IV Year</option>
                  </select>
                </div>

                <div className="join-field" style={{ gridColumn: 'span 1' }}>
                  <label className="join-field-label" htmlFor="app-department">
                    Department <span className="req">*</span>
                  </label>
                  <select
                    id="app-department"
                    className="join-select"
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="join-field">
                  <label className="join-field-label" htmlFor="app-sec">
                    Section
                  </label>
                  <input
                    id="app-sec"
                    className="join-input"
                    type="text"
                    maxLength={10}
                    placeholder="e.g. A, B, C"
                    value={formData.sec}
                    onChange={e => setFormData({ ...formData, sec: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Technical Division Focus */}
            <div className="join-form-section">
              <h2 className="join-section-title">
                <span className="join-section-num">3</span>
                Technical Division Choice
              </h2>
              <p className="join-section-desc">
                Select your primary technical division. You can also specify an optional secondary track.
              </p>

              {/* 3D Interactive Division Selector */}
              <div className="join-field col-span-full">
                <label className="join-field-label">
                  Primary Division Specialization <span className="req">*</span>
                </label>
                <div className="join-division-selector">
                  {memberDivisions.map(div => {
                    const accent = getDivisionAccent({ divisionId: div.id, division: div.name });
                    const isSelected = formData.primary_division === div.name;

                    return (
                      <div
                        key={div.id}
                        className={`join-division-chip ${isSelected ? 'is-active' : ''}`}
                        style={{
                          '--div-bg': accent.accent,
                          '--active-accent': accent.accent,
                        } as any}
                        onClick={() => setFormData({ ...formData, primary_division: div.name })}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onKeyDown={e => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setFormData({ ...formData, primary_division: div.name });
                          }
                        }}
                      >
                        <div className="join-div-badge">
                          {div.shortName}
                        </div>
                        <div className="join-div-info">
                          <span className="join-div-name">{div.name}</span>
                          <span className="join-div-lead">Lead: {div.lead || 'Executive'}</span>
                        </div>
                        <div className="join-div-check">
                          <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Alternate Division */}
              <div className="join-field col-span-full" style={{ marginTop: '14px' }}>
                <label className="join-field-label" htmlFor="app-secondary-div">
                  Secondary Division Preference (Optional Backup Track)
                </label>
                <select
                  id="app-secondary-div"
                  className="join-select"
                  value={formData.secondary_division}
                  onChange={e => setFormData({ ...formData, secondary_division: e.target.value })}
                >
                  <option value="">-- No secondary choice --</option>
                  {memberDivisions.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section 4: Skills & Statement of Purpose */}
            <div className="join-form-section">
              <h2 className="join-section-title">
                <span className="join-section-num">4</span>
                Engineering Profile & Motivation
              </h2>
              <p className="join-section-desc">
                Detail your practical experience, languages, frameworks, hardware stacks, and what drives you.
              </p>

              <div className="join-field col-span-full">
                <label className="join-field-label" htmlFor="app-skills">
                  Technical Skills, Languages & Frameworks
                </label>
                <input
                  id="app-skills"
                  className="join-input"
                  type="text"
                  maxLength={1000}
                  placeholder="e.g. Python, ROS2, PyTorch, C++, SolidWorks, STM32, React, Verilog, OpenCV, Docker…"
                  value={formData.technical_skills}
                  onChange={e => setFormData({ ...formData, technical_skills: e.target.value })}
                />
              </div>

              <div className="join-field col-span-full">
                <label className="join-field-label" htmlFor="app-portfolio">
                  Portfolio, GitHub, or Drive Link (Optional)
                </label>
                <input
                  id="app-portfolio"
                  className="join-input"
                  type="url"
                  maxLength={500}
                  placeholder="https://github.com/username or link to project portfolio"
                  value={formData.portfolio_link}
                  onChange={e => setFormData({ ...formData, portfolio_link: e.target.value })}
                />
              </div>

              <div className="join-field col-span-full">
                <label className="join-field-label" htmlFor="app-sop">
                  Why do you want to join CSR? What would you like to build? <span className="req">*</span>
                </label>
                <textarea
                  id="app-sop"
                  className="join-textarea"
                  rows={4}
                  required
                  maxLength={5000}
                  placeholder="Describe your technical interests, past experiments or problems you've tackled, and the engineering challenges you want to build alongside the CSR collective…"
                  value={formData.statement_of_purpose}
                  onChange={e => setFormData({ ...formData, statement_of_purpose: e.target.value })}
                />
              </div>
            </div>

            {/* Section 5: Cohort Terms & Submission */}
            <div className="join-form-section" style={{ marginBottom: 0 }}>
              <label className="join-agreement-box">
                <input
                  type="checkbox"
                  checked={formData.criteria_accepted}
                  onChange={e => setFormData({ ...formData, criteria_accepted: e.target.checked })}
                  required
                />
                <span className="join-agreement-text">
                  <strong>I confirm that I am an actively enrolled RIT student</strong>, and I commit to upholding CSR's minimum weekly laboratory hours, open collaboration culture, and technical integrity standards.
                </span>
              </label>

              <div className="join-actions">
                <button
                  type="submit"
                  className="join-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="join-badge-dot" />
                      Submitting Dossier…
                    </>
                  ) : (
                    <>
                      Transmit Application →
                    </>
                  )}
                </button>

                <Link to="/" className="join-cancel-link">
                  Return to Home
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
