// Styles loaded by AdminDashboard.tsx via admin.css

interface DeleteConfirmModalProps {
  memberId: string;
  onConfirm: (id: string, onDone: () => void) => Promise<void>;
  onClose: () => void;
}

export default function DeleteConfirmModal({
  memberId,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>Confirm Deletion</h3>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="body-copy">
          Are you sure you want to delete member <code>{memberId}</code> from the database? This action cannot be undone.
        </p>
        <div className="admin-modal-footer">
          <button type="button" className="btn-admin" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-admin danger"
            onClick={() => onConfirm(memberId, onClose)}
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}
