import React, { useState } from 'react';
import { IncidentSummary, InvestigateResponse } from '../types';
import { BecausePanel } from './BecausePanel';
import { SkeletonLoader } from './SkeletonLoader';

interface InvestigationViewProps {
  incident: IncidentSummary;
  answer: InvestigateResponse | null;
  baselineAnswer: InvestigateResponse | null;
  isLoading: boolean;
  onAsk: (question: string) => Promise<void>;
  onOpenAttemptModal: (result: 'worked' | 'failed', defaultAttempt?: string) => void;
  onFlagGap: (question: string) => void;
}

export const InvestigationView: React.FC<InvestigationViewProps> = ({
  incident,
  answer,
  baselineAnswer,
  isLoading,
  onAsk,
  onOpenAttemptModal,
  onFlagGap
}) => {
  const [question, setQuestion] = useState('How should we mitigate the latency degradation under high traffic?');
  const [compareMode, setCompareMode] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onAsk(question.trim());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Incident Header Info */}
      <section style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-panel)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="tag tag-failure">{incident.severity}</span>
              <span className="tag tag-accent">{incident.service}</span>
              {incident.isSample && <span className="tag">Sample Incident</span>}
            </div>
            <h1 style={{ fontSize: '24px' }}>{incident.title}</h1>
          </div>
          <div className="text-muted" style={{ fontSize: '13px', textAlign: 'right' }}>
            Reported: {incident.createdDate} • Status: <strong style={{ textTransform: 'capitalize' }}>{incident.status}</strong>
          </div>
        </div>

        <p style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '12px' }}>
          {incident.description}
        </p>

        {/* Symptoms Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Observed Symptoms:
          </span>
          {incident.symptoms.map((sym, i) => (
            <span key={i} className="tag tag-warning" style={{ textTransform: 'none' }}>
              {sym}
            </span>
          ))}
        </div>
      </section>

      {/* Question Form & Comparison Switch */}
      <section style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-panel)', padding: '20px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label htmlFor="question-input" style={{ fontSize: '14px', fontWeight: 600 }}>
            Successor Investigation Query:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              id="question-input"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask how to solve this incident or investigate specific strategies..."
              disabled={isLoading}
            />
            <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ minWidth: '100px' }}>
              {isLoading ? 'Recalling...' : 'Ask'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <input
              type="checkbox"
              id="compare-toggle"
              checked={compareMode}
              onChange={(e) => setCompareMode(e.target.checked)}
              style={{ width: 'auto', cursor: 'pointer' }}
            />
            <label htmlFor="compare-toggle" style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 600, color: 'var(--accent)' }}>
              Compare with an answer that ignores captured failure knowledge (Before / After Contrast)
            </label>
          </div>
        </form>
      </section>

      {/* Main Results Layout */}
      {isLoading ? (
        <SkeletonLoader />
      ) : answer ? (
        <div className="investigation-grid">
          {/* Left Column: Investigation Answer Area */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Uncaptured Gap State */}
            {answer.gap && (
              <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 'var(--radius-panel)', padding: '16px' }}>
                <h3 style={{ fontSize: '16px', color: '#92400E', marginBottom: '6px' }}>
                  No Failure Memory Captured
                </h3>
                <p style={{ fontSize: '14px', color: '#78350F', marginBottom: '12px' }}>
                  {answer.actualPractice}
                </p>
                <div style={{ fontSize: '14px', marginBottom: '12px' }}>
                  <strong>Official Process Reference:</strong> {answer.officialProcess}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onFlagGap(question)}
                  style={{ borderColor: '#D97706' }}
                >
                  Flag as an uncaptured gap for next retro
                </button>
              </div>
            )}

            {!answer.gap && (
              <>
                {/* 1. Recommended Action */}
                <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-panel)', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Recommended Action (Failure Memory Agent)
                    </span>
                    <span className="text-muted" style={{ fontSize: '12px' }}>
                      Engine: {answer.generatedBy}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '19px', color: 'var(--text)', marginBottom: '8px' }}>
                    {answer.recommendation}
                  </h2>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    <strong>Action Step:</strong> {answer.suggestedAction}
                  </div>
                </div>

                {/* 2. Before / After Comparison Grid */}
                {compareMode && baselineAnswer ? (
                  <div className="comparison-grid">
                    {/* Baseline Column (Ignores Failure Memory) */}
                    <div className="comparison-card baseline">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span className="tag" style={{ backgroundColor: '#F3F4F6' }}>Baseline Agent (No Memory)</span>
                      </div>
                      <h4 style={{ fontSize: '16px', marginBottom: '6px', color: '#6B7280' }}>
                        Naive Official Runbook Approach
                      </h4>
                      <p style={{ fontSize: '14px', color: '#374151', marginBottom: '12px' }}>
                        {baselineAnswer.recommendation}
                      </p>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', borderTop: '1px dashed #E5E7EB', paddingTop: '8px' }}>
                        <strong>Limitation:</strong> Unaware of previous attempts. Re-suggests strategies that previously triggered outages.
                      </div>
                    </div>

                    {/* Memory Column (With Hindsight Failure Memory) */}
                    <div className="comparison-card memory-active">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span className="tag tag-accent">FailureLoop (With Hindsight Memory)</span>
                      </div>
                      <h4 style={{ fontSize: '16px', marginBottom: '6px', color: 'var(--accent)' }}>
                        What Actually Happens in Production
                      </h4>
                      <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '12px' }}>
                        {answer.actualPractice}
                      </p>
                      <div style={{ fontSize: '12px', color: 'var(--accent)', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                        <strong>Benefit:</strong> Recalls past failure reasons, prevents repeat downtime, cites real engineer experiences.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-panel)', padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>What Actually Happens in Production</h3>
                    <p style={{ fontSize: '15px', color: 'var(--text)', lineHeight: '1.5' }}>
                      {answer.actualPractice}
                    </p>
                  </div>
                )}

                {/* 3. Failed Strategies To Avoid (Explicit Technical Evidence) */}
                {answer.failedStrategiesToAvoid && answer.failedStrategiesToAvoid.length > 0 && (
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-panel)', padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', color: '#B91C1C', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      Proven Ineffective Strategies (Avoid Repeating These)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {answer.failedStrategiesToAvoid.map((item, idx) => (
                        <div key={idx} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '4px', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '14px', color: '#991B1B' }}>❌ {item.attempt}</strong>
                            <span style={{ fontSize: '11px', color: '#7F1D1D' }}>{item.evidence}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#B91C1C' }}>
                            <strong>Why it failed:</strong> {item.whyFailed}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Live Outcome Feedback Loop */}
                <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-panel)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Did you execute this strategy in production?</span>
                    <p className="text-muted" style={{ fontSize: '12px' }}>
                      Reporting outcomes updates Hindsight memory so the loop learns continuously.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => onOpenAttemptModal('worked', answer.suggestedAction)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      This Worked
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning"
                      onClick={() => onOpenAttemptModal('failed', 'Tested approach')}
                    >
                      This Failed / Outdated
                    </button>
                  </div>
                </div>
              </>
            )}
          </main>

          {/* Right Column: "Because" Panel (Recalled sources) */}
          <BecausePanel sources={answer.sources} gap={answer.gap} />
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-panel)', padding: '32px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Ask FailureLoop About This Incident</h3>
          <p className="text-muted" style={{ fontSize: '14px', maxWidth: '480px', margin: '0 auto 16px' }}>
            FailureLoop will search Hindsight memory for previous attempts, identify what failed and why, and compare the proven recommendation against the naive baseline runbook.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => onAsk(question)}>
            Run Initial Investigation
          </button>
        </div>
      )}
    </div>
  );
};
