// Styles loaded by AdminDashboard.tsx via admin.css
import { useState, useEffect, type FormEvent } from 'react';
import { memberDivisions } from '../members/data';
import type { CsrMember, CreateMemberInput } from '../types/database.types';

interface MemberFormModalProps {
  editingMember: CsrMember | null;
  onSave: (editingMember: CsrMember | null, formData: CreateMemberInput, onDone: () => void) => Promise<void>;
  onClose: () => void;
}

const DEFAULT_FORM: CreateMemberInput = {
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
};

export default function MemberFormModal({ editingMember, onSave, onClose }: MemberFormModalProps) {
  const [formData, setFormData] = useState<CreateMemberInput>(DEFAULT_FORM);

  // Populate form when editing an existing member
  useEffect(() => {
    if (editingMember) {
      setFormData({
        name: editingMember.name,
        division_id: editingMember.division_id,
        division: editingMember.division,
        year: editingMember.year || '',
        department: editingMember.department || '',
        sec: editingMember.sec || '',
        role: editingMember.role || 'Member',
        email: editingMember.email || '',
        phone: editingMember.phone || '',
        bio: editingMember.bio || '',
        github_url: editingMember.github_url || '',
        linkedin_url: editingMember.linkedin_url || '',
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [editingMember]);

  function handleDivisionChange(divId: string) {
    const div = memberDivisions.find(d => d.id === divId);
    setFormData(prev => ({
      ...prev,
      division_id: divId,
      division: div ? div.name : prev.division,
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave(editingMember, formData, onClose);
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>{editingMember ? 'Edit Member Profile' : 'Add New Member to Roster'}</h3>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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

            <div className="form-group">
              <label className="form-label">LinkedIn URL</label>
              <input
                className="form-input"
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={formData.linkedin_url}
                onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
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
            <button type="button" className="btn-admin" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-admin primary">
              {editingMember ? 'Save Changes' : 'Create Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
