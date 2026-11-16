// Styles loaded by AdminDashboard.tsx via admin.css
import { useState } from 'react';
import type { CsrApplication } from '../types/database.types';
import ApplicationReviewModal from './ApplicationReviewModal';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface ApplicationsTabProps {
  applications: CsrApplication[];
  loading: boolean;
  onApprove: (app: CsrApplication, onDone: () => void) => Promise<void>;
  onReject: (id: string, onDone: () => void) => Promise<void>;
}

export default function ApplicationsTab({
  applications,
  loading,
  onApprove,
  onReject,
}: ApplicationsTabProps) {
  const [appStatusFilter, setAppStatusFilter] = useState<StatusFilter>('all');
  const [selectedApplication, setSelectedApplication] = useState<CsrApplication | null>(null);

  const filtered = applications.filter(
    a => appStatusFilter === 'all' || a.status === appStatusFilter
  );

  return (
    <>
      <div className="admin-toolbar">
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
            <button
              key={status}
              type="button"
              className={`btn-admin ${appStatusFilter === status ? 'primary' : ''}`}
              style={{ padding: '6px 12px', fontSize: '13px' }}
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
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                  Loading submitted applications…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                  No applications found in this category.
                </td>
              </tr>
            ) : (
              filtered.map(app => (
                <tr key={app.id}>
                  <td className="mono" style={{ fontSize: '12px', color: 'var(--steel)' }}>
                    {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <strong>{app.full_name}</strong>
                    {app.reg_no && <div className="mono" style={{ fontSize: '12px', color: 'var(--steel)' }}>{app.reg_no}</div>}
                  </td>
                  <td>
                    <div>{app.year}</div>
                    <small style={{ color: 'var(--steel)' }}>{app.department}</small>
                  </td>
                  <td>
                    <strong>{app.primary_division}</strong>
                    {app.secondary_division && (
                      <div style={{ fontSize: '13px', color: 'var(--steel)' }}>Alt: {app.secondary_division}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '13px' }}>{app.email}</div>
                    <small className="mono" style={{ color: 'var(--steel)' }}>{app.phone}</small>
                  </td>
                  <td>
                    <span
                      className={`role-badge ${
                        app.status === 'approved' ? 'admin' : app.status === 'rejected' ? 'member' : 'lead'
                      }`}
                    >
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
                          onClick={() => onApprove(app, () => {})}
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

      {selectedApplication && (
        <ApplicationReviewModal
          application={selectedApplication}
          onApprove={onApprove}
          onReject={onReject}
          onClose={() => setSelectedApplication(null)}
        />
      )}
    </>
  );
}
