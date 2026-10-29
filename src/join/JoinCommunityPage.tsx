import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { memberDivisions } from '../members/data';
import { submitApplication } from '../services/members';
import type { CreateApplicationInput } from '../types/database.types';
import { Label } from '../components';
import '../admin/admin.css';

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

    if (!formData.criteria_accepted) {
      setErrorMsg('Please confirm you accept the cohort criteria before submitting.');
      return;
    }

    setSubmitting(true);
    const res = await submitApplication(formData);
    setSubmitting(false);

    if (res.error) {
      setErrorMsg(`Submission failed: ${res.error}`);
    } else {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <main id="main-content" className="coming-soon">
        <div className="section-wrap" style={{ maxWidth: '680px' }}>
          <Label>CSR-RIT / RECRUITMENT SPRINT</Label>
          <h1>Application <br /><span className="accent">Submitted.</span></h1>
          <p className="body-copy">
            Thank you, <strong>{formData.full_name}</strong>. Your application for the <strong>{formData.primary_division}</strong> division has been transmitted to the CSR Division Leads and Executive Committee.
          </p>
          <div className="stat-card" style={{ marginTop: '24px', textAlign: 'left' }}>
            <span className="stat-label">Next Steps in Selection</span>
            <ul style={{ margin: '12px 0 0', paddingLeft: '20px', lineHeight: '1.8', color: 'var(--soft-white)', fontSize: '14px' }}>
              <li>Applications are screened on a rolling basis by division leads.</li>
              <li>Shortlisted candidates will be invited for a brief technical discussion or problem challenge.</li>
              <li>Look out for updates on your phone (<code>{formData.phone}</code>) and email (<code>{formData.email}</code>).</li>
            </ul>
          </div>
          <div style={{ marginTop: '30px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Link className="outline-link" to="/members">Explore Current Member Orbit</Link>
            <Link className="outline-link" to="/">Return to Home</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="admin-page" style={{ paddingTop: '120px' }}>
      <div className="section-wrap" style={{ maxWidth: '1000px', margin: '0 auto', padding: 0 }}>
        {/* Top Header */}
        <div className="admin-header">
          <div>
            <Label>CSR-RIT / 2026—2027 COHORT ADMISSIONS</Label>
            <h1>Join the Community</h1>
            <p className="body-copy" style={{ margin: '10px 0 0', fontSize: '16px', maxWidth: '620px' }}>
              CSR is a student engineering community at Rajalakshmi Institute of Technology dedicated to building autonomous systems, intelligence models, and embedded hardware.
            </p>
          </div>
          <div>
            <span className="mono" style={{ color: 'var(--engineering-blue)', fontSize: '10px' }}>
              SELECTION ROUND 01 / OPEN
            </span>
          </div>
        </div>

        {/* Criteria & Eligibility Card */}
        <div className="stat-card" style={{ marginBottom: '36px' }}>
          <span className="stat-label">Cohort Eligibility Criteria</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginTop: '16px' }}>
            <div style={{ borderLeft: '2px solid var(--technical-blue)', paddingLeft: '14px' }}>
              <strong style={{ display: 'block', fontSize: '15px', color: 'var(--white)', marginBottom: '4px' }}>
                01 / RIT Student
              </strong>
              <span style={{ fontSize: '13px', color: 'var(--steel)', lineHeight: '1.6' }}>
                Must be an actively enrolled undergraduate student of Rajalakshmi Institute of Technology across any department.
              </span>
            </div>
            <div style={{ borderLeft: '2px solid var(--technical-blue)', paddingLeft: '14px' }}>
              <strong style={{ display: 'block', fontSize: '15px', color: 'var(--white)', marginBottom: '4px' }}>
                02 / Active Commitment
              </strong>
              <span style={{ fontSize: '13px', color: 'var(--steel)', lineHeight: '1.6' }}>
                Able to commit 4–6 hours weekly for division laboratory builds, hackathons, and technical documentation.
              </span>
            </div>
            <div style={{ borderLeft: '2px solid var(--technical-blue)', paddingLeft: '14px' }}>
              <strong style={{ display: 'block', fontSize: '15px', color: 'var(--white)', marginBottom: '4px' }}>
                03 / Builder Mindset
              </strong>
              <span style={{ fontSize: '13px', color: 'var(--steel)', lineHeight: '1.6' }}>
                Passion for problem-solving, willingness to learn new technologies, and enthusiasm for cross-disciplinary collaboration.
              </span>
            </div>
          </div>
        </div>

        {/* Global Feedback */}
        {errorMsg && (
          <div className="auth-alert error" style={{ marginBottom: '24px' }}>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Application Form */}
        <div className="stat-card">
          <span className="stat-label">Application Form</span>
          <h2 style={{ fontSize: '26px', margin: '8px 0 24px' }}>Candidate Profile & Division Preferences</h2>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="modal-form-grid">
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="app-fullname">Full Name *</label>
                <input
                  id="app-fullname"
                  className="form-input"
                  type="text"
                  required
                  placeholder="e.g. Anto Jenishia A"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              {/* College Reg No */}
              <div className="form-group">
                <label className="form-label" htmlFor="app-regno">College Roll / Reg No.</label>
                <input
                  id="app-regno"
                  className="form-input"
                  type="text"
                  placeholder="e.g. 2117240101001"
                  value={formData.reg_no}
                  onChange={e => setFormData({ ...formData, reg_no: e.target.value })}
                />
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="app-email">Official / College Email *</label>
                <input
                  id="app-email"
                  className="form-input"
                  type="email"
                  required
                  placeholder="name.250000@dept.ritchennai.edu.in"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Phone Number */}
              <div className="form-group">
                <label className="form-label" htmlFor="app-phone">Phone / WhatsApp Number *</label>
                <input
                  id="app-phone"
                  className="form-input"
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {/* Academic Year */}
              <div className="form-group">
                <label className="form-label" htmlFor="app-year">Current Academic Year *</label>
                <select
                  id="app-year"
                  className="form-input"
                  value={formData.year}
                  onChange={e => setFormData({ ...formData, year: e.target.value })}
                >
                  <option value="I Year">I Year</option>
                  <option value="II Year">II Year</option>
                  <option value="III Year">III Year</option>
                  <option value="IV Year">IV Year</option>
                </select>
              </div>

              {/* Department */}
              <div className="form-group">
                <label className="form-label" htmlFor="app-department">Department *</label>
                <select
                  id="app-department"
                  className="form-input"
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div className="form-group">
                <label className="form-label" htmlFor="app-sec">Section</label>
                <input
                  id="app-sec"
                  className="form-input"
                  type="text"
                  placeholder="e.g. A, B, C"
                  value={formData.sec}
                  onChange={e => setFormData({ ...formData, sec: e.target.value })}
                />
              </div>

              {/* Primary Division Choice */}
              <div className="form-group">
                <label className="form-label" htmlFor="app-primary-div">Primary Division Choice *</label>
                <select
                  id="app-primary-div"
                  className="form-input"
                  value={formData.primary_division}
                  onChange={e => setFormData({ ...formData, primary_division: e.target.value })}
                >
                  {memberDivisions.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Secondary Division Choice */}
              <div className="form-group modal-form-full">
                <label className="form-label" htmlFor="app-secondary-div">Secondary Division Choice (Optional Backup)</label>
                <select
                  id="app-secondary-div"
                  className="form-input"
                  value={formData.secondary_division}
                  onChange={e => setFormData({ ...formData, secondary_division: e.target.value })}
                >
                  <option value="">-- Select Alternate Division --</option>
                  {memberDivisions.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Technical Skills */}
              <div className="form-group modal-form-full">
                <label className="form-label" htmlFor="app-skills">Technical Skills, Tools & Languages</label>
                <input
                  id="app-skills"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Python, ROS, Arduino, C++, React, Figma, PCB Design, OpenCV…"
                  value={formData.technical_skills}
                  onChange={e => setFormData({ ...formData, technical_skills: e.target.value })}
                />
              </div>

              {/* Portfolio / Project Link */}
              <div className="form-group modal-form-full">
                <label className="form-label" htmlFor="app-portfolio">GitHub, Portfolio, or Drive Link (Optional)</label>
                <input
                  id="app-portfolio"
                  className="form-input"
                  type="url"
                  placeholder="https://github.com/username or project drive link"
                  value={formData.portfolio_link}
                  onChange={e => setFormData({ ...formData, portfolio_link: e.target.value })}
                />
              </div>

              {/* Statement of Purpose */}
              <div className="form-group modal-form-full">
                <label className="form-label" htmlFor="app-sop">
                  Why do you want to join CSR? What would you like to build? *
                </label>
                <textarea
                  id="app-sop"
                  className="form-input"
                  rows={4}
                  required
                  placeholder="Describe your technical interests, past projects you've explored, or ideas you wish to develop with the CSR community…"
                  value={formData.statement_of_purpose}
                  onChange={e => setFormData({ ...formData, statement_of_purpose: e.target.value })}
                />
              </div>

              {/* Criteria Checkbox */}
              <div className="modal-form-full" style={{ marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', fontSize: '13px', color: 'var(--soft-white)', lineHeight: '1.6' }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: '4px', accentColor: 'var(--technical-blue)', width: '18px', height: '18px' }}
                    checked={formData.criteria_accepted}
                    onChange={e => setFormData({ ...formData, criteria_accepted: e.target.checked })}
                    required
                  />
                  <span>
                    I confirm that I am an actively enrolled RIT student, and I agree to meet the minimum weekly commitment and uphold community collaboration standards.
                  </span>
                </label>
              </div>
            </div>

            <div style={{ marginTop: '28px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button
                type="submit"
                className="btn-admin primary"
                disabled={submitting}
                style={{ padding: '14px 28px', fontSize: '12px' }}
              >
                {submitting ? 'Submitting Application…' : 'Submit Application'}
              </button>
              <Link to="/" style={{ color: 'var(--steel)', fontSize: '13px' }}>
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
