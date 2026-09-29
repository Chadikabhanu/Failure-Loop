import React from 'react';
import { IncidentSummary } from '../types';

interface TopBarProps {
  incidents: IncidentSummary[];
  selectedIncidentId: string;
  onSelectIncident: (id: string) => void;
  viewMode: 'successor' | 'departing';
  onChangeViewMode: (mode: 'departing' | 'successor') => void;
  onResetSeed: () => void;
  isResetting: boolean;
  currentScreen: 'home' | 'incident';
  onNavigateScreen: (screen: 'home' | 'incident') => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  viewMode,
  onChangeViewMode,
  onResetSeed,
  isResetting,
  currentScreen,
  onNavigateScreen
}) => {
  return (
    <header className="top-bar" role="banner">
      <div className="brand" style={{ cursor: 'pointer' }} onClick={() => onNavigateScreen('home')}>
        <span className="brand-title">FailureLoop</span>
        <span className="brand-tagline">Failure Memory Agent</span>
      </div>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }} aria-label="Main Navigation">
        <button
          type="button"
          className="btn-text"
          style={{
            fontWeight: currentScreen === 'home' ? 600 : 400,
            textDecoration: currentScreen === 'home' ? 'underline' : 'none',
            fontSize: '14px'
          }}
          onClick={() => onNavigateScreen('home')}
        >
          All Incidents
        </button>

        <button
          type="button"
          className="btn-text"
          style={{
            fontWeight: currentScreen === 'incident' ? 600 : 400,
            textDecoration: currentScreen === 'incident' ? 'underline' : 'none',
            fontSize: '14px'
          }}
          onClick={() => onNavigateScreen('incident')}
        >
          Active Investigation
        </button>
      </nav>

      <div className="top-bar-controls">
        {currentScreen === 'incident' && (
          <>
            <label htmlFor="incident-select" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Incident:
            </label>
            <select
              id="incident-select"
              value={selectedIncidentId}
              onChange={(e) => onSelectIncident(e.target.value)}
              style={{ width: 'auto', minWidth: '200px', padding: '4px 8px', fontSize: '13px' }}
            >
              {incidents.map((inc) => (
                <option key={inc.incidentId} value={inc.incidentId}>
                  {inc.title} ({inc.itemCount} items)
                </option>
              ))}
            </select>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <span>Viewing as:</span>
          <button
            type="button"
            className={`btn ${viewMode === 'successor' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '3px 8px', fontSize: '12px' }}
            onClick={() => onChangeViewMode('successor')}
          >
            Successor (Ask)
          </button>
          <button
            type="button"
            className={`btn ${viewMode === 'departing' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '3px 8px', fontSize: '12px' }}
            onClick={() => onChangeViewMode('departing')}
          >
            Departing SRE (Capture)
          </button>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '4px 10px', fontSize: '12px', borderColor: '#CBD5E1' }}
          onClick={onResetSeed}
          disabled={isResetting}
          title="Reset demo data to clean seed baseline"
        >
          {isResetting ? 'Resetting...' : 'Reset Drill'}
        </button>
      </div>
    </header>
  );
};
