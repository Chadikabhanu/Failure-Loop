import React from 'react';

export const Privacy: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <article className="content-wrapper" style={{ maxWidth: '780px' }}>
      <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '24px' }}>
        ← Back to Incident Studio
      </button>

      <h1 style={{ marginBottom: '16px' }}>Privacy Policy — FailureLoop</h1>

      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        FailureLoop is an AI debugging agent built with persistent failure memory powered by Hindsight. This application is an engineering prototype designed for technical demonstration.
      </p>

      <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '8px' }}>What Information is Stored</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        When you submit an incident investigation, debugging attempt, or failure lesson, the system stores:
      </p>
      <ul style={{ marginLeft: '24px', marginBottom: '16px', lineHeight: '1.6' }}>
        <li>The technical problem description and observed symptoms.</li>
        <li>The strategy attempted and whether it succeeded or failed.</li>
        <li>The technical consequence or root cause reason for failure.</li>
        <li>Actionable lessons learned to inform future decisions.</li>
        <li>The author/engineer attribution name and timestamp of the record.</li>
      </ul>

      <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '8px' }}>Credentials & Sensitive Secrets</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        <strong>Never enter production passwords, API keys, private tokens, or customer personal identifiers.</strong> FailureLoop includes automated pattern matching to block known credential formats, but operators must ensure only sanitised engineering logs and synthetic scenario data are submitted.
      </p>

      <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '8px' }}>Long-Term Memory Retention</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        Failure experiences are retained in persistent memory banks using Hindsight. Stored experiences are used solely to recall past strategies and prevent agents from repeating known failure modes in subsequent investigations.
      </p>
    </article>
  );
};
