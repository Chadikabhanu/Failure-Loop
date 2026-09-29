import React from 'react';
import { MemorySourceCitation } from '../types';

interface BecausePanelProps {
  sources: MemorySourceCitation[];
  gap: boolean;
}

export const BecausePanel: React.FC<BecausePanelProps> = ({ sources, gap }) => {
  const corroboratedCount = sources.filter(s => s.tier === 'corroborated').length;

  return (
    <aside className="because-panel" aria-label="Recalled memory sources">
      <div className="because-header">
        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 7 4 8 7 8z"/>
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 7 4 8 7 8z"/>
          </svg>
          Because (Recalled Experience)
        </h3>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {corroboratedCount > 0 && (
            <span className="tag tag-accent" style={{ fontSize: '11px' }}>
              {corroboratedCount} Corroborated
            </span>
          )}
          <span className="tag" style={{ fontSize: '11px', fontWeight: 600 }}>
            {sources.length} {sources.length === 1 ? 'record' : 'records'}
          </span>
        </div>
      </div>

      <p className="because-subtitle">
        Cites authentic, captured incident experiences from Hindsight memory bank. Eliminates amnesia and prevents re-suggesting naive strategies.
      </p>

      {gap && (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-panel)', fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          <strong>No historical memory found:</strong> No past failure memory has been retained yet for this specific investigation query. The agent does not invent citations.
        </div>
      )}

      {sources.length === 0 && !gap && (
        <p className="text-muted" style={{ fontSize: '14px', padding: '12px 0' }}>
          No memories active. Submit an investigation query to recall relevant past experiences.
        </p>
      )}

      <div className="because-scroll-container">
        {sources.map((src, idx) => (
          <div key={src.itemId || idx} className="recalled-card">
            <div className="recalled-card-header">
              <div className="recalled-speaker">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{src.speaker}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span className={`tag ${src.tier === 'corroborated' ? 'tag-accent' : ''}`}>
                  {src.tier === 'corroborated' ? '✓ Corroborated' : 'Single source'}
                </span>
                {src.category && (
                  <span className="tag" style={{ textTransform: 'capitalize' }}>
                    {src.category.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            <div className="recalled-quote">
              "{src.excerpt}"
            </div>

            {src.failureReason && (
              <div className="recalled-box-failure">
                <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠️ Consequence / Why it failed:</span>
                </div>
                <div style={{ lineHeight: '1.5' }}>
                  {src.failureReason}
                </div>
              </div>
            )}

            {src.lesson && (
              <div className="recalled-box-lesson">
                <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💡 Distilled Rule for Successor:</span>
                </div>
                <div style={{ lineHeight: '1.5' }}>
                  {src.lesson}
                </div>
              </div>
            )}

            <div className="recalled-card-footer">
              <span>Recorded: <strong>{src.date}</strong></span>
              <span>Memory ID: <code>{src.itemId}</code></span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
