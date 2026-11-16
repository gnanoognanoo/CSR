// Styles loaded by AdminDashboard.tsx via admin.css
import { memberDivisions } from '../members/data';
import type { CsrMember, CsrBillboardMember } from '../types/database.types';

interface BillboardTabProps {
  billboardSlots: CsrBillboardMember[];
  members: CsrMember[];
  savingBillboard: boolean;
  onSaveBillboard: () => void;
  onUpdateSlot: (index: number, updates: Partial<CsrBillboardMember>) => void;
  onClearSlot: (index: number) => void;
}

export default function BillboardTab({
  billboardSlots,
  members,
  savingBillboard,
  onSaveBillboard,
  onUpdateSlot,
  onClearSlot,
}: BillboardTabProps) {
  return (
    <div>
      <div className="admin-toolbar" style={{ justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Executive Council Billboard Management</h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--steel)' }}>
            Configure the 6 featured representatives shown on the Member Portfolio billboard. Pick from existing members or enter custom names for external leaders.
          </p>
        </div>
        <button
          type="button"
          className="btn-admin primary"
          disabled={savingBillboard}
          onClick={onSaveBillboard}
          style={{ padding: '10px 20px', fontSize: '13px' }}
        >
          {savingBillboard ? 'Saving Billboard…' : 'Save Billboard Settings'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '16px' }}>
        {billboardSlots.slice(0, 6).map((slot, idx) => {
          const isAssigned = Boolean(slot.name && slot.name.trim());
          return (
            <div
              key={slot.position || idx}
              className="stat-card"
              style={{
                padding: '20px',
                borderTop: `3px solid ${isAssigned ? 'var(--technical-blue)' : 'var(--steel)'}`,
                background: isAssigned ? 'var(--white)' : '#f8f9fa',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="mono" style={{ fontSize: '12px', color: isAssigned ? 'var(--technical-blue)' : 'var(--steel)', fontWeight: 600 }}>
                    SLOT #{String(idx + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: '11px', color: isAssigned ? 'var(--steel)' : '#c53030', fontWeight: isAssigned ? 400 : 600 }}>
                    {isAssigned ? (slot.member_id ? '• Roster Linked' : '• Custom Member') : '• (Empty / Removed)'}
                  </span>
                </div>

                {isAssigned ? (
                  <button
                    type="button"
                    className="btn-admin"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: '#c53030',
                      borderColor: '#feb2b2',
                      background: '#fff5f5',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                    onClick={() => onClearSlot(idx)}
                    title="Remove member and clear this billboard slot"
                  >
                    ✕ Remove Member
                  </button>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--steel)', fontStyle: 'italic' }}>
                    Vacant
                  </span>
                )}
              </div>

              {/* Quick Select from Roster */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Quick Select Roster Member</label>
                <select
                  className="form-input"
                  style={{ fontSize: '12px', padding: '7px 10px' }}
                  value={slot.member_id || (slot.name ? '__custom__' : '')}
                  onChange={e => {
                    const val = e.target.value;
                    if (!val) {
                      onClearSlot(idx);
                    } else if (val === '__custom__') {
                      onUpdateSlot(idx, { member_id: null });
                    } else {
                      const chosen = members.find(m => m.id === val);
                      if (chosen) {
                        onUpdateSlot(idx, {
                          member_id: chosen.id,
                          name: chosen.name,
                          division: chosen.division,
                          year: chosen.year || '',
                          department: chosen.department || '',
                          title: chosen.role === 'Division Lead' ? `${chosen.division} Lead` : 'Executive Council Member',
                        });
                      }
                    }
                  }}
                >
                  <option value="">-- Remove Member / Clear Slot --</option>
                  <option value="__custom__">★ Custom / External Member (Not in DB)</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.division})
                    </option>
                  ))}
                </select>
              </div>

              {/* Representative Name */}
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  style={{ fontSize: '13px', padding: '7px 10px' }}
                  value={slot.name}
                  placeholder="e.g. Member Name (leave blank to clear slot)"
                  onChange={e => onUpdateSlot(idx, { name: e.target.value })}
                />
              </div>

              {/* Custom Title / Role */}
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Billboard Title / Role</label>
                <input
                  className="form-input"
                  type="text"
                  style={{ fontSize: '13px', padding: '7px 10px' }}
                  value={slot.title}
                  placeholder="e.g. Executive Committee / AI Lead"
                  onChange={e => onUpdateSlot(idx, { title: e.target.value })}
                />
              </div>

              {/* Division Selection */}
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Representing Division</label>
                <select
                  className="form-input"
                  style={{ fontSize: '12px', padding: '7px 10px' }}
                  value={slot.division}
                  onChange={e => onUpdateSlot(idx, { division: e.target.value })}
                >
                  {memberDivisions.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Year & Department */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11px' }}>Academic Year</label>
                  <input
                    className="form-input"
                    type="text"
                    style={{ fontSize: '12px', padding: '7px 10px' }}
                    value={slot.year || ''}
                    placeholder="e.g. III Year"
                    onChange={e => onUpdateSlot(idx, { year: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11px' }}>Department</label>
                  <input
                    className="form-input"
                    type="text"
                    style={{ fontSize: '12px', padding: '7px 10px' }}
                    value={slot.department || ''}
                    placeholder="e.g. AI & DS"
                    onChange={e => onUpdateSlot(idx, { department: e.target.value })}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn-admin primary"
          disabled={savingBillboard}
          onClick={onSaveBillboard}
          style={{ padding: '12px 28px', fontSize: '14px' }}
        >
          {savingBillboard ? 'Saving Billboard…' : 'Save Billboard Settings'}
        </button>
      </div>
    </div>
  );
}
