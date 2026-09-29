import React, { useState } from 'react';

interface AttemptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    attempt: string;
    result: 'worked' | 'failed';
    failureReason?: string;
    lesson?: string;
    note?: string;
    speaker: string;
  }) => Promise<void>;
  prefilledResult?: 'worked' | 'failed';
  prefilledAttempt?: string;
}

export const AttemptModal: React.FC<AttemptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  prefilledResult = 'failed',
  prefilledAttempt = ''
}) => {
  const [result, setResult] = useState<'worked' | 'failed'>(prefilledResult);
  const [attempt, setAttempt] = useState(prefilledAttempt);
  const [failureReason, setFailureReason] = useState('');
  const [lesson, setLesson] = useState('');
  const [speaker, setSpeaker] = useState('Arjun Rao (Successor)');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Credential detection patterns
  const credentialCheck = (str: string): boolean => {
    return /(?:password|passwd|pwd)\s*(?:is|=|:)|sk-(?:test|live|proj|ant)-|ghp_|bearer\s+|OTP\s*(?:is|=|:)?\s*\d+|Winter\d{4}!|hunter2/i.test(str);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const fullContent = `${attempt} ${failureReason} ${lesson}`;
    
    // Check 1: Credentials
    if (credentialCheck(fullContent)) {
      setValidationError('Do not store credentials here. Passwords, API keys, and OTPs are blocked.');
      return;
    }

    // Check 2: Word count
    const words = fullContent.trim().split(/\s+/).filter(Boolean);
    if (words.length < 5) {
      setValidationError('Can you say what specifically happens? Please provide at least 5-6 words with technical details.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        attempt,
        result,
        failureReason: result === 'failed' ? failureReason : undefined,
        lesson,
        note: result === 'worked' ? (lesson || 'Worked as expected') : failureReason,
        speaker
      });
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to submit experience');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(31, 35, 40, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-panel)',
          maxWidth: '560px',
          width: '100%',
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 id="modal-title" style={{ fontSize: '20px' }}>
            {result === 'worked' ? 'Record Successful Resolution' : 'Record Failed Attempt in Memory'}
          </h2>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ padding: '2px 8px' }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {validationError && (
          <div style={{ backgroundColor: 'var(--warning-tint)', border: '1px solid var(--warning)', padding: '10px 12px', borderRadius: '4px', fontSize: '13px', color: 'var(--warning)', marginBottom: '16px' }}>
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Outcome Type:
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="result" 
                  value="failed" 
                  checked={result === 'failed'} 
                  onChange={() => setResult('failed')} 
                  style={{ width: 'auto' }}
                />
                Failed Attempt (Feed Failure Memory)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="result" 
                  value="worked" 
                  checked={result === 'worked'} 
                  onChange={() => setResult('worked')} 
                  style={{ width: 'auto' }}
                />
                Worked (Proven Fix)
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="attempt-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Strategy Attempted:
            </label>
            <input
              id="attempt-input"
              type="text"
              placeholder="e.g. Increase retry count from 2 to 5 with linear backoff"
              value={attempt}
              onChange={(e) => setAttempt(e.target.value)}
              required
            />
          </div>

          {result === 'failed' && (
            <div>
              <label htmlFor="failure-reason-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Why Did It Fail? (Technical Consequence):
              </label>
              <textarea
                id="failure-reason-input"
                rows={3}
                placeholder="e.g. Additional retries triggered a retry storm that exhausted PostgreSQL connections (100/100 pool max), crashing the replica."
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="lesson-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Lesson for Future AI Agents & SREs:
            </label>
            <textarea
              id="lesson-input"
              rows={2}
              placeholder="e.g. Check database connection pool saturation before increasing retry counts; apply circuit breakers instead."
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="speaker-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Engineer Name:
            </label>
            <input
              id="speaker-input"
              type="text"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Retaining...' : 'Retain into Hindsight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
