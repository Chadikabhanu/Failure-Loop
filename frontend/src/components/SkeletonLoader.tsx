import React from 'react';

export const SkeletonLoader: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-busy="true" aria-label="Loading investigation findings">
      <div className="skeleton" style={{ height: '36px', width: '70%' }} />
      <div className="skeleton" style={{ height: '80px', width: '100%' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="skeleton" style={{ height: '140px', width: '100%' }} />
        <div className="skeleton" style={{ height: '140px', width: '100%' }} />
      </div>
      <div className="skeleton" style={{ height: '60px', width: '100%' }} />
    </div>
  );
};
