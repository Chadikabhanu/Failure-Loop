import React, { useState, useEffect, useCallback } from 'react';
import { IncidentSummary, StoredMemory, ConflictRecord, InvestigateResponse } from './types';
import { TopBar } from './components/TopBar';
import { ConflictBanner } from './components/ConflictBanner';
import { InvestigationView } from './components/InvestigationView';
import { MemoryList } from './components/MemoryList';
import { AttemptModal } from './components/AttemptModal';
import { IncidentsHome } from './components/IncidentsHome';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';

const API_BASE = 'http://localhost:4000/api';

export const App: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('inc-payment-latency');
  const [viewMode, setViewMode] = useState<'successor' | 'departing'>('successor');
  const [currentScreen, setCurrentScreen] = useState<'home' | 'incident'>('incident');
  const [page, setPage] = useState<'app' | 'privacy' | 'terms'>('app');

  const [memories, setMemories] = useState<StoredMemory[]>([]);
  const [investigationAnswer, setInvestigationAnswer] = useState<InvestigateResponse | null>(null);
  const [baselineAnswer, setBaselineAnswer] = useState<InvestigateResponse | null>(null);
  const [openConflict, setOpenConflict] = useState<ConflictRecord | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [cachedNotice, setCachedNotice] = useState<string | null>(null);

  const [attemptModalState, setAttemptModalState] = useState<{
    isOpen: boolean;
    result: 'worked' | 'failed';
    defaultAttempt?: string;
  }>({
    isOpen: false,
    result: 'failed'
  });

  const selectedIncident = incidents.find(i => i.incidentId === selectedIncidentId) || incidents[0];

  // Fetch incidents list
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/incidents`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIncidents(data);
      setCachedNotice(null);
    } catch (err: any) {
      console.warn('Using cached incidents data:', err);
      setCachedNotice('Showing last synced data. Retrying connection...');
    }
  }, []);

  // Fetch memories for the active incident
  const fetchMemories = useCallback(async (incidentId: string) => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${incidentId}/memories`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMemories(data);
    } catch (err) {
      console.warn('Failed to fetch memories:', err);
    }
  }, []);

  // Fetch open conflicts for the active incident
  const fetchConflicts = useCallback(async (incidentId: string) => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${incidentId}/conflicts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ConflictRecord[] = await res.json();
      const open = data.find(c => c.status === 'open') || null;
      setOpenConflict(open);
    } catch (err) {
      console.warn('Failed to fetch conflicts:', err);
    }
  }, []);

  // Execute investigation in both memory and baseline modes for before/after comparison
  const handleAsk = useCallback(async (questionText: string, targetId?: string) => {
    const incId = targetId || selectedIncidentId;
    if (!incId) return;
    setIsLoading(true);

    try {
      // Fire memory and baseline queries in parallel for instant contrast
      const [memRes, baseRes] = await Promise.all([
        fetch(`${API_BASE}/incidents/${incId}/investigate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: questionText, mode: 'memory' })
        }),
        fetch(`${API_BASE}/incidents/${incId}/investigate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: questionText, mode: 'baseline' })
        })
      ]);

      if (memRes.ok) {
        const memData: InvestigateResponse = await memRes.json();
        setInvestigationAnswer(memData);
      }

      if (baseRes.ok) {
        const baseData: InvestigateResponse = await baseRes.json();
        setBaselineAnswer(baseData);
      }
    } catch (err: any) {
      console.error('Ask error:', err);
      setCachedNotice('Failed to reach backend. Showing last synced response.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedIncidentId]);

  // Initial load
  useEffect(() => {
    void fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    if (selectedIncidentId) {
      void fetchMemories(selectedIncidentId);
      void fetchConflicts(selectedIncidentId);
      // Run initial investigation query for the incident
      void handleAsk('How should we mitigate the latency degradation under high traffic?', selectedIncidentId);
    }
  }, [selectedIncidentId, fetchMemories, fetchConflicts, handleAsk]);

  // Record an attempt outcome (feedback loop)
  const handleRecordAttempt = async (data: {
    attempt: string;
    result: 'worked' | 'failed';
    failureReason?: string;
    lesson?: string;
    note?: string;
    speaker: string;
  }) => {
    if (!selectedIncidentId) return;

    const res = await fetch(`${API_BASE}/incidents/${selectedIncidentId}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId: selectedIncidentId,
        attempt: data.attempt,
        result: data.result,
        failureReason: data.failureReason,
        lesson: data.lesson,
        note: data.note,
        speaker: data.speaker
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to record outcome');
    }

    const respData = await res.json();
    if (respData.conflict) {
      setOpenConflict(respData.conflict);
    }

    await fetchMemories(selectedIncidentId);
    await fetchConflicts(selectedIncidentId);
    await fetchIncidents();
    // Re-investigate to reflect newly learned memory
    await handleAsk('How should we mitigate the latency degradation under high traffic?');
  };

  // Resolve a detected knowledge conflict
  const handleResolveConflict = async (conflictId: string, resolution: 'update' | 'keep_exception', note?: string) => {
    if (!selectedIncidentId) return;

    const res = await fetch(`${API_BASE}/incidents/${selectedIncidentId}/conflicts/${conflictId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolution,
        resolutionNote: note,
        engineer: 'Marcus Brody (Staff SRE)'
      })
    });

    if (res.ok) {
      setOpenConflict(null);
      await fetchMemories(selectedIncidentId);
      await fetchConflicts(selectedIncidentId);
      await fetchIncidents();
      await handleAsk('How should we mitigate the latency degradation under high traffic?');
    }
  };

  // Reset seed data for rehearsal drills
  const handleResetSeed = async () => {
    setIsResetting(true);
    try {
      const res = await fetch(`${API_BASE}/seed/reset`, { method: 'POST' });
      if (res.ok) {
        setOpenConflict(null);
        await fetchIncidents();
        if (selectedIncidentId) {
          await fetchMemories(selectedIncidentId);
          await fetchConflicts(selectedIncidentId);
          await handleAsk('How should we mitigate the latency degradation under high traffic?');
        }
      }
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Departing SRE adds new knowledge
  const handleAddMemory = async (data: {
    category: string;
    text: string;
    speaker: string;
    failureReason?: string;
    lesson?: string;
    attempt?: string;
  }) => {
    if (!selectedIncidentId) return;

    const res = await fetch(`${API_BASE}/incidents/${selectedIncidentId}/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save knowledge');
    }

    const result = await res.json();
    if (result.conflict) {
      setOpenConflict(result.conflict);
    }

    await fetchMemories(selectedIncidentId);
    await fetchConflicts(selectedIncidentId);
    await fetchIncidents();
  };

  // Update official SOP
  const handleUpdateSop = async (sopText: string) => {
    if (!selectedIncidentId) return;
    const res = await fetch(`${API_BASE}/incidents/${selectedIncidentId}/official`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sop: sopText })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update SOP');
    }
    await fetchIncidents();
  };

  // Finalize handoff
  const handleFinalize = async () => {
    if (!selectedIncidentId) return;
    setIsFinalizing(true);
    try {
      const res = await fetch(`${API_BASE}/incidents/${selectedIncidentId}/finalize`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        alert(`Cannot finalize: ${err.error}`);
        return;
      }
      await fetchIncidents();
      alert('Incident handoff finalized successfully. Ready for successor.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleFlagGap = (questionText: string) => {
    alert(`Flagged question as an uncaptured gap: "${questionText}". Added to retrospective backlog.`);
  };

  if (page === 'privacy') return <Privacy onBack={() => setPage('app')} />;
  if (page === 'terms') return <Terms onBack={() => setPage('app')} />;

  return (
    <div className="app-container">
      <TopBar
        incidents={incidents}
        selectedIncidentId={selectedIncidentId}
        onSelectIncident={(id) => {
          setSelectedIncidentId(id);
          setCurrentScreen('incident');
        }}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onResetSeed={handleResetSeed}
        isResetting={isResetting}
        currentScreen={currentScreen}
        onNavigateScreen={setCurrentScreen}
      />

      {cachedNotice && (
        <div style={{ backgroundColor: 'var(--warning-tint)', borderBottom: '1px solid var(--warning)', padding: '8px 24px', fontSize: '13px', color: 'var(--warning)', textAlign: 'center' }}>
          {cachedNotice}
        </div>
      )}

      <div className="content-wrapper">
        {/* Open Conflict Banner (Section 4.5) */}
        {openConflict && (
          <ConflictBanner
            conflict={openConflict}
            onResolve={handleResolveConflict}
          />
        )}

        {currentScreen === 'home' ? (
          <IncidentsHome
            incidents={incidents}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              setCurrentScreen('incident');
            }}
            viewMode={viewMode}
          />
        ) : selectedIncident ? (
          viewMode === 'successor' ? (
            <InvestigationView
              incident={selectedIncident}
              answer={investigationAnswer}
              baselineAnswer={baselineAnswer}
              isLoading={isLoading}
              onAsk={handleAsk}
              onOpenAttemptModal={(result, defaultAttempt) => setAttemptModalState({ isOpen: true, result, defaultAttempt })}
              onFlagGap={handleFlagGap}
            />
          ) : (
            <MemoryList
              incident={selectedIncident}
              memories={memories}
              onAddMemory={handleAddMemory}
              onUpdateSop={handleUpdateSop}
              onFinalize={handleFinalize}
              isFinalizing={isFinalizing}
            />
          )
        ) : (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <h2>No Incidents Loaded</h2>
            <button type="button" className="btn btn-primary" onClick={handleResetSeed} style={{ marginTop: '16px' }}>
              Load Seed Incidents
            </button>
          </div>
        )}
      </div>

      <AttemptModal
        isOpen={attemptModalState.isOpen}
        onClose={() => setAttemptModalState({ isOpen: false, result: 'failed' })}
        onSubmit={handleRecordAttempt}
        prefilledResult={attemptModalState.result}
        prefilledAttempt={attemptModalState.defaultAttempt}
      />

      <footer className="app-footer">
        <div>
          <strong>FailureLoop</strong> — Persistent Failure Memory for AI Debugging Agents (Powered by Hindsight)
        </div>
        <div className="footer-links">
          <button type="button" className="btn-text" onClick={() => setPage('privacy')}>
            Privacy Policy
          </button>
          <button type="button" className="btn-text" onClick={() => setPage('terms')}>
            Terms of Use
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
