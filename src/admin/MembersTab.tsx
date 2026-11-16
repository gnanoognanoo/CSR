// Styles loaded by AdminDashboard.tsx via admin.css
import { useState, useMemo } from 'react';
import { memberDivisions } from '../members/data';
import type { CsrMember, CreateMemberInput } from '../types/database.types';
import MemberFormModal from './MemberFormModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface MembersTabProps {
  members: CsrMember[];
  loading: boolean;
  onSaveMember: (editingMember: CsrMember | null, formData: CreateMemberInput, onDone: () => void) => Promise<void>;
  onDeleteMember: (id: string, onDone: () => void) => Promise<void>;
  isAddOpen?: boolean;
  onOpenAdd?: () => void;
  onCloseAdd?: () => void;
}

export default function MembersTab({
  members,
  loading,
  onSaveMember,
  onDeleteMember,
  isAddOpen: isAddOpenProp,
  onOpenAdd,
  onCloseAdd,
}: MembersTabProps) {
  const [memberSearch, setMemberSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [editingMember, setEditingMember] = useState<CsrMember | null>(null);
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isAddOpen = isAddOpenProp !== undefined ? isAddOpenProp : internalAddOpen;

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

  function openEditModal(m: CsrMember) {
    setEditingMember(m);
  }

  function openAddModal() {
    setEditingMember(null);
    if (onOpenAdd) {
      onOpenAdd();
    } else {
      setInternalAddOpen(true);
    }
  }

  function closeFormModal() {
    if (onCloseAdd) {
      onCloseAdd();
    } else {
      setInternalAddOpen(false);
    }
    setEditingMember(null);
  }

  return (
    <>
      {/* Search & filter toolbar — Add Member button is in AdminHeader */}
      <div className="admin-toolbar">
        <input
          type="text"
          className="admin-search-input"
          placeholder="Search by name, email, department, role…"
          value={memberSearch}
          onChange={e => setMemberSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
          <button
            type="button"
            className="btn-admin primary"
            onClick={openAddModal}
          >
            + Add Member
          </button>
        </div>
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
            {loading ? (
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
                  <td className="mono" style={{ fontSize: '12px', color: 'var(--steel)' }}>
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
                    <span style={{ fontSize: '13px' }}>{m.email || '—'}</span>
                  </td>
                  <td className="mono" style={{ fontSize: '12px' }}>
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

      {(isAddOpen || editingMember) && (
        <MemberFormModal
          editingMember={editingMember}
          onSave={onSaveMember}
          onClose={closeFormModal}
        />
      )}

      {deleteConfirmId && (
        <DeleteConfirmModal
          memberId={deleteConfirmId}
          onConfirm={onDeleteMember}
          onClose={() => setDeleteConfirmId(null)}
        />
      )}
    </>
  );
}
