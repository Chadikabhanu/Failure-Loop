import React from 'react';
import { IncidentSummary } from '../types';

interface IncidentsHomeProps {
  incidents: IncidentSummary[];
  onSelectIncident: (id: string) => void;
  viewMode: 'successor' | 'departing';
}

export const IncidentsHome: React.FC<IncidentsHomeProps> = ({
  incidents,
  onSelectIncident,
  viewMode
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
      {/* Hero Section (Section 4.1) */}
      <section style={{ maxWidth: '820px', paddingTop: '12px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '12px', lineHeight: '1.25' }}>
          Equip AI debugging agents with persistent failure memory.
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          FailureLoop retains failed attempts, identifies why approaches broke, and stops agents repeating costly mistakes across separate incidents.
        </p>
      </section>

      {/* How It Works: A single numbered list of 3 steps with different content per step (Not identical cards) */}
      <section style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-panel)', padding: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>How FailureLoop Works</h2>
        <ol style={{ marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '14px', lineHeight: '1.5' }}>
          <li style={{ paddingLeft: '8px' }}>
            <strong>Capture the failure mechanism:</strong> When an engineer or agent tests an approach that fails, FailureLoop records the technical root cause (e.g. database connection starvation, memory leaks) rather than discarding the experience.
          </li>
          <li style={{ paddingLeft: '8px' }}>
            <strong>Retain in Hindsight:</strong> Experiences are ingested into an isolated Hindsight memory bank, creating structured observations and automatically assigning corroboration tiers when multiple engineers observe the same failure.
          </li>
          <li style={{ paddingLeft: '8px' }}>
            <strong>Recall before deciding:</strong> When a new problem appears, the agent recalls past failures to eliminate naive strategies, presenting the verified root-cause solution alongside the naive baseline.
          </li>
        </ol>
      </section>

      {/* Incident List: Ruled rows (not large cards) with real counts (Section 4.1) */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '20px' }}>Active Incident Memory Banks</h2>
          <span className="text-muted" style={{ fontSize: '13px' }}>
            Clicking an incident opens {viewMode === 'successor' ? 'Investigation (Ask)' : 'Capture Studio (Departing SRE)'}
          </span>
        </div>

        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-panel)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: '#FAF9F6', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Service & Title</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Memories</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Open Conflicts</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr
                  key={inc.incidentId}
                  onClick={() => onSelectIncident(inc.incidentId)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-tint)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span className="tag tag-failure" style={{ fontSize: '10px' }}>{inc.severity}</span>
                      <strong style={{ fontSize: '15px', color: 'var(--text)' }}>{inc.title}</strong>
                      {inc.isSample && <span className="tag" style={{ fontSize: '10px' }}>Sample Incident</span>}
                    </div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>
                      Target Service: <code>{inc.service}</code> • Created: {inc.createdDate}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span className={`tag ${inc.status === 'resolved' ? 'tag-success' : 'tag-warning'}`}>
                      {inc.status === 'resolved' ? 'Ready for successor' : 'Investigating'}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                    {inc.itemCount} items
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {inc.openConflicts > 0 ? (
                      <span className="tag tag-warning">{inc.openConflicts} open conflict</span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '13px' }}>
                      Open {viewMode === 'successor' ? 'Ask →' : 'Capture →'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
