import React from 'react';

export const Terms: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <article className="content-wrapper" style={{ maxWidth: '780px' }}>
      <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '24px' }}>
        ← Back to Incident Studio
      </button>

      <h1 style={{ marginBottom: '16px' }}>Terms of Use — FailureLoop</h1>

      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        Welcome to FailureLoop. By using this prototype interface, you acknowledge and agree to the following terms:
      </p>

      <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '8px' }}>Advisory Nature of Agent Recommendations</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        All outputs, strategy evaluations, and failure memory recalls provided by FailureLoop are strictly advisory. AI-generated debugging recommendations must always be reviewed by qualified human site reliability engineers before execution in production environments.
      </p>

      <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '8px' }}>Non-Destructive Memory Integrity</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        FailureLoop enforces an append-only, non-destructive memory paradigm. Updating knowledge when new evidence emerges marks past memories as superseded while retaining historical provenance. Stored memories are not deleted without audit logs.
      </p>

      <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '8px' }}>Appropriate Use</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        This prototype is designed for debugging distributed systems, microservices, databases, and API infrastructures. Users agree not to input malicious payloads, credential dumps, or unlawful data.
      </p>
    </article>
  );
};
