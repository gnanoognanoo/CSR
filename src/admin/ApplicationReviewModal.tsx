// Styles loaded by AdminDashboard.tsx via admin.css
import type { CsrApplication } from '../types/database.types';
import { Label } from '../components';
import { safeExternalUrl } from './adminUtils';

interface ApplicationReviewModalProps {
  application: CsrApplication;
  onApprove: (app: CsrApplication, onDone: () => void) => Promise<void>;
  onReject: (id: string, onDone: () => void) => Promise<void>;
  onClose: () => void;
}

export default function ApplicationReviewModal({
  application,
  onApprove,
  onReject,
  onClose,
}: ApplicationReviewModalProps) {
  const safePortfolio = application.portfolio_link ? safeExternalUrl(application.portfolio_link) : null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <Label>CANDIDATE ADMISSION REVIEW</Label>
            <h3 style={{ marginTop: '6px' }}>{application.full_name}</h3>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px', marginBottom: '20px' }}>
          <div>
            <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>COLLEGE ROLL / REG NO</span>
            <strong>{application.reg_no || 'Not provided'}</strong>
          </div>
          <div>
            <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>YEAR &amp; DEPARTMENT</span>
            <strong>{application.year} · {application.department}</strong>
          </div>
          <div>
            <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>EMAIL ADDRESS</span>
            <span>{application.email}</span>
          </div>
          <div>
            <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>PHONE / WHATSAPP</span>
            <span className="mono">{application.phone}</span>
          </div>
          <div>
            <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>PRIMARY DIVISION</span>
            <strong style={{ color: 'var(--engineering-blue)' }}>{application.primary_division}</strong>
          </div>
          <div>
            <span className="mono" style={{ color: 'var(--steel)', display: 'block' }}>SECONDARY DIVISION</span>
            <span>{application.secondary_division || 'None'}</span>
          </div>
        </div>

        {application.technical_skills && (
          <div style={{ marginBottom: '18px' }}>
            <span className="mono" style={{ color: 'var(--steel)', display: 'block', marginBottom: '4px' }}>TECHNICAL SKILLS &amp; TOOLS</span>
            <div style={{ background: 'rgba(4, 16, 30, 0.7)', padding: '10px 14px', border: '1px solid var(--line)', fontSize: '13px' }}>
              {application.technical_skills}
            </div>
          </div>
        )}

        {application.portfolio_link && (
          <div style={{ marginBottom: '18px' }}>
            <span className="mono" style={{ color: 'var(--steel)', display: 'block', marginBottom: '4px' }}>PORTFOLIO / GITHUB LINK</span>
            {safePortfolio ? (
              <a
                href={safePortfolio}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--engineering-blue)', fontSize: '13px', textDecoration: 'underline' }}
              >
                {application.portfolio_link} ↗
              </a>
            ) : (
              <span style={{ color: 'var(--steel)', fontSize: '13px' }}>
                {application.portfolio_link} <span style={{ color: '#eb5757' }}>(Blocked: Non-HTTP protocol)</span>
              </span>
            )}
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <span className="mono" style={{ color: 'var(--steel)', display: 'block', marginBottom: '4px' }}>STATEMENT OF PURPOSE / WHY CSR</span>
          <div style={{ background: 'rgba(4, 16, 30, 0.7)', padding: '12px 14px', border: '1px solid var(--line)', fontSize: '14px', lineHeight: '1.7', color: 'var(--soft-white)', whiteSpace: 'pre-wrap' }}>
            {application.statement_of_purpose}
          </div>
        </div>

        <div className="admin-modal-footer" style={{ justifyContent: 'space-between' }}>
          <div>
            <span className="mono" style={{ color: 'var(--steel)', fontSize: '12px' }}>
              Current Status: <strong style={{ color: 'var(--white)' }}>{application.status.toUpperCase()}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {application.status !== 'rejected' && (
              <button
                type="button"
                className="btn-admin danger"
                onClick={() => onReject(application.id, onClose)}
              >
                Reject
              </button>
            )}
            {application.status !== 'approved' && (
              <button
                type="button"
                className="btn-admin primary"
                onClick={() => onApprove(application, onClose)}
              >
                Approve &amp; Add to Roster
              </button>
            )}
            <button type="button" className="btn-admin" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
