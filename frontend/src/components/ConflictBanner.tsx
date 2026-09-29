import React, { useState } from 'react';
import { ConflictRecord } from '../types';

interface ConflictBannerProps {
  conflict: ConflictRecord;
  onResolve: (conflictId: string, resolution: 'update' | 'keep_exception', note?: string) => Promise<void>;
}

export const ConflictBanner: React.FC<ConflictBannerProps> = ({ conflict, onResolve }) => {
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async (resolution: 'update' | 'keep_exception') => {
    setIsSubmitting(true);
    try {
      await onResolve(conflict.conflictId, resolution, resolutionNote);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="conflict-banner" role="alert" aria-live="assertive">
      <div className="conflict-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>Knowledge Conflict Detected: Stored Experience Contradicted</span>
      </div>

      <p style={{ fontSize: '14px', marginBottom: '8px' }}>
        A new observation contradicts an established failure lesson regarding <strong>{conflict.topic}</strong>. The statements disagree and require an explicit decision. Nothing will be deleted.
      </p>

      <div className="conflict-comparison-grid">
        <div style={{ borderRight: '1px solid #FDE68A', paddingRight: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            PREVIOUS RECORDED EXPERIENCE ({conflict.existing.speaker}, {conflict.existing.date})
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text)' }}>
            "{conflict.existing.text}"
          </p>
        </div>

        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--warning)', marginBottom: '4px' }}>
            NEW INCOMING REPORT ({conflict.newReport.speaker}, {conflict.newReport.date})
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text)' }}>
            "{conflict.newReport.text}"
          </p>
        </div>
      </div>

      <div style={{ marginTop: '8px' }}>
        <input
          type="text"
          placeholder="Optional resolution note (e.g. Upgraded PgBouncer to v1.21; connection pool handling is now thread-safe)"
          value={resolutionNote}
          onChange={(e) => setResolutionNote(e.target.value)}
          style={{ fontSize: '13px', marginBottom: '8px' }}
          disabled={isSubmitting}
        />

        <div className="conflict-actions">
          <button
            type="button"
            className="btn btn-warning"
            onClick={() => handleAction('update')}
            disabled={isSubmitting}
            title="Mark old failure memory as superseded and adopt the new verified practice"
          >
            {isSubmitting ? 'Updating...' : 'Update Knowledge'}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleAction('keep_exception')}
            disabled={isSubmitting}
            title="Keep the original guidance active and store this new report as an isolated exception"
          >
            {isSubmitting ? 'Saving...' : 'Keep as Exception'}
          </button>
        </div>
      </div>
    </aside>
  );
};
