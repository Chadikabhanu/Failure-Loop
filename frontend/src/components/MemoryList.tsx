import React, { useState } from 'react';
import { StoredMemory, IncidentSummary } from '../types';

interface MemoryListProps {
  incident: IncidentSummary;
  memories: StoredMemory[];
  onAddMemory: (data: { category: string; text: string; speaker: string; failureReason?: string; lesson?: string; attempt?: string }) => Promise<void>;
  onUpdateSop: (sopText: string) => Promise<void>;
  onFinalize: () => Promise<void>;
  isFinalizing: boolean;
}

export const MemoryList: React.FC<MemoryListProps> = ({
  incident,
  memories,
  onAddMemory,
  onUpdateSop,
  onFinalize,
  isFinalizing
}) => {
  const [newText, setNewText] = useState('');
  const [category, setCategory] = useState<string>('failed_attempt');
  const [attempt, setAttempt] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [lesson, setLesson] = useState('');
  const [speaker, setSpeaker] = useState('Meera Iyer (Departing SRE)');
  const [sopText, setSopText] = useState(incident.officialSop);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sopMessage, setSopMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const credentialCheck = (str: string): boolean => {
    return /(?:password|passwd|pwd)\s*(?:is|=|:)|sk-(?:test|live|proj|ant)-|ghp_|bearer\s+|OTP\s*(?:is|=|:)?\s*\d+|Winter\d{4}!|hunter2/i.test(str);
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const fullStr = `${newText} ${failureReason} ${lesson}`;
    if (credentialCheck(fullStr)) {
      setValidationError('Do not store credentials here. Passwords, API keys, and OTPs are blocked.');
      return;
    }

    const words = fullStr.trim().split(/\s+/).filter(Boolean);
    if (words.length < 5) {
      setValidationError('Can you say what specifically happens? Please provide at least 5-6 words with technical details.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddMemory({
        category,
        text: newText,
        attempt: attempt || newText.slice(0, 50),
        failureReason,
        lesson,
        speaker
      });
      setNewText('');
      setAttempt('');
      setFailureReason('');
      setLesson('');
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save knowledge item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSop = async (e: React.FormEvent) => {
    e.preventDefault();
    setSopMessage(null);
    try {
      await onUpdateSop(sopText);
      setSopMessage('Official process SOP updated and retained into Hindsight.');
    } catch (err: any) {
      setSopMessage(`Error: ${err.message}`);
    }
  };

  const canFinalize = incident.itemCount >= 5 && incident.openConflicts === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Finalize Bar */}
      <section style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-panel)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="tag tag-accent">{incident.service}</span>
            <span className={`tag ${incident.status === 'resolved' ? 'tag-success' : 'tag-warning'}`}>
              {incident.status === 'resolved' ? 'Ready for successor' : 'Capturing'}
            </span>
          </div>
          <h2 style={{ fontSize: '20px' }}>Departing Engineer Capture & Knowledge Base</h2>
          <div className="text-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
            {incident.itemCount} memories captured • {incident.openConflicts} open conflict(s)
          </div>
        </div>

        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onFinalize}
            disabled={!canFinalize || isFinalizing}
            title={!canFinalize ? 'Requires at least 5 items captured and 0 open conflicts' : 'Finalize handoff for successor'}
          >
            {isFinalizing ? 'Finalizing...' : 'Finalize Handoff'}
          </button>
          {!canFinalize && (
            <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '4px', textAlign: 'right' }}>
              Requires ≥ 5 items and 0 conflicts
            </div>
          )}
        </div>
      </section>

      {/* Main Grid: Capture Forms + Memory Bank Viewer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: '24px' }}>
        {/* Left: Input Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Capture Form */}
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-panel)', padding: '20px' }}>
            <h3 style={{ fontSize: '17px', marginBottom: '12px' }}>Capture Knowledge & Failure Experience</h3>

            {validationError && (
              <div style={{ backgroundColor: 'var(--warning-tint)', border: '1px solid var(--warning)', padding: '8px 12px', borderRadius: '4px', fontSize: '13px', color: 'var(--warning)', marginBottom: '14px' }}>
                {validationError}
              </div>
            )}

            <form onSubmit={handleSaveMemory} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Knowledge Category:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ fontSize: '14px' }}
                >
                  <option value="failed_attempt">Failed Attempt (What failed & why)</option>
                  <option value="successful_approach">Successful Approach (Verified fix)</option>
                  <option value="failure_lesson">Failure Lesson (Gotcha or warning)</option>
                  <option value="dependency">Dependency / Timing Constraint</option>
                  <option value="anti_pattern">Anti-Pattern to Avoid</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  What Happened? (Observation Text):
                </label>
                <textarea
                  rows={3}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="e.g. During peak traffic, increasing retries saturated the Postgres connection pool at 100/100, triggering a total outage."
                  required
                />
              </div>

              {category === 'failed_attempt' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      Strategy Attempted:
                    </label>
                    <input
                      type="text"
                      value={attempt}
                      onChange={(e) => setAttempt(e.target.value)}
                      placeholder="e.g. Increase retry count from 2 to 5 with linear backoff"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      Why Did It Fail? (Technical Consequence):
                    </label>
                    <textarea
                      rows={2}
                      value={failureReason}
                      onChange={(e) => setFailureReason(e.target.value)}
                      placeholder="e.g. Generated an avalanche retry storm, compounding DB lock contention."
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Distilled Lesson for Successor:
                </label>
                <input
                  type="text"
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                  placeholder="e.g. Verify database connection saturation before increasing retry counts."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Speaker / Author:
                </label>
                <input
                  type="text"
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Retaining...' : 'Save Knowledge Item'}
                </button>
              </div>
            </form>
          </div>

          {/* Official Process (SOP) Form */}
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-panel)', padding: '20px' }}>
            <h3 style={{ fontSize: '17px', marginBottom: '8px' }}>Official Process (Documented SOP)</h3>
            <p className="text-muted" style={{ fontSize: '13px', marginBottom: '12px' }}>
              The documented runbook that a generic knowledge-base assistant would read. FailureLoop contrasts this with what actually happens in production.
            </p>

            {sopMessage && (
              <div style={{ backgroundColor: 'var(--accent-tint)', border: '1px solid #BEE3DB', padding: '8px 12px', borderRadius: '4px', fontSize: '13px', color: 'var(--accent)', marginBottom: '12px' }}>
                {sopMessage}
              </div>
            )}

            <form onSubmit={handleSaveSop} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea
                rows={3}
                value={sopText}
                onChange={(e) => setSopText(e.target.value)}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-secondary">
                  Save as Official Process
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Retained Memory Graph */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-panel)', padding: '20px', display: 'flex', flexDirection: 'column', maxHeight: '820px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '17px' }}>Retained Memory Bank</h3>
            <span className="text-muted" style={{ fontSize: '13px' }}>
              {memories.length} total items
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {memories.map((mem) => (
              <div
                key={mem.itemId}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-panel)',
                  padding: '12px',
                  backgroundColor: mem.status === 'superseded' ? '#F9FAFB' : '#FFFFFF',
                  opacity: mem.status === 'superseded' ? 0.75 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className={`tag ${mem.tier === 'corroborated' ? 'tag-accent' : ''}`}>
                      {mem.tier === 'corroborated' ? 'Corroborated' : 'Single source'}
                    </span>
                    <span className="tag" style={{ textTransform: 'capitalize' }}>
                      {mem.category.replace('_', ' ')}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {mem.date}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '6px', textDecoration: mem.status === 'superseded' ? 'line-through' : 'none' }}>
                  {mem.text}
                </p>

                {mem.failureReason && (
                  <div style={{ fontSize: '12px', color: '#B91C1C', marginBottom: '4px' }}>
                    <strong>Why it failed:</strong> {mem.failureReason}
                  </div>
                )}

                {mem.lesson && (
                  <div style={{ fontSize: '12px', color: 'var(--accent)', marginBottom: '4px' }}>
                    <strong>Lesson:</strong> {mem.lesson}
                  </div>
                )}

                {mem.history && mem.history.length > 0 && (
                  <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {mem.history.map((h, hi) => (
                      <div key={hi}>
                        <em>{h.date}: {h.note}</em>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-muted" style={{ fontSize: '11px', marginTop: '4px', textAlign: 'right' }}>
                  By: {mem.speaker} • ID: {mem.itemId}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
