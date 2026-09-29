import 'dotenv/config';
import { HindsightClient } from '@vectorize-io/hindsight-client';
import { store } from './store.js';
import { StoredMemory, MemorySourceCitation } from './types.js';

export class HindsightService {
  private client: HindsightClient | null = null;
  private initializedBanks: Set<string> = new Set();
  private cachedMemories: Map<string, StoredMemory[]> = new Map();

  constructor() {
    const apiKey = process.env.HINDSIGHT_API_KEY;
    const baseUrl = process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io';

    if (apiKey && apiKey !== '<supplied separately>') {
      try {
        this.client = new HindsightClient({
          apiKey,
          baseUrl
        });
        console.log('[HindsightService] Initialized official Hindsight client with cloud endpoint');
      } catch (err) {
        console.warn('[HindsightService] Could not init cloud Hindsight client, using resilient fallback engine:', err);
      }
    } else {
      console.log('[HindsightService] HINDSIGHT_API_KEY not configured or offline. Running resilient embedded memory engine.');
    }
  }

  public async ensureBank(incidentId: string): Promise<void> {
    const bankId = `incident-${incidentId}`;
    if (this.initializedBanks.has(bankId)) return;

    if (this.client) {
      try {
        await this.client.createBank(bankId, {
          reflectMission: 'I keep persistent failure memory of debugging attempts (failed approaches, why they failed, successful approaches, and lessons) to prevent agents from repeating past mistakes.',
          retainMission: 'Extract incident problem, attempt, failure reason, what worked, and actionable engineering lessons.',
          enableObservations: true
        });
        this.initializedBanks.add(bankId);
        console.log(`[HindsightService] Created/configured Hindsight bank: ${bankId}`);
      } catch (err: any) {
        console.warn(`[HindsightService] Note on bank init (${bankId}):`, err.message || err);
        this.initializedBanks.add(bankId);
      }
    } else {
      this.initializedBanks.add(bankId);
    }
  }

  /**
   * Retain a structured failure experience into Hindsight
   */
  public async retainExperience(
    incidentId: string, 
    memory: StoredMemory
  ): Promise<{ success: boolean; observationId?: string; isLocalFallback: boolean }> {
    await this.ensureBank(incidentId);
    const bankId = `incident-${incidentId}`;

    const formattedContent = [
      `[${memory.category.toUpperCase()}] ${memory.speaker}, ${memory.date}: ${memory.text}`,
      memory.attempt ? `Attempted: ${memory.attempt}` : null,
      memory.result ? `Result: ${memory.result}` : null,
      memory.failureReason ? `Failure Reason: ${memory.failureReason}` : null,
      memory.successfulApproach ? `Successful Approach: ${memory.successfulApproach}` : null,
      memory.lesson ? `Lesson: ${memory.lesson}` : null
    ].filter(Boolean).join('\n');

    // Always update local store for instant UI reflection & offline resilience
    store.addMemory(memory);
    this.cachedMemories.set(incidentId, store.getMemories(incidentId));

    if (this.client) {
      try {
        const resp = await this.client.retain(bankId, formattedContent, {
          tags: [memory.category, memory.result || 'observation', memory.tier],
          metadata: {
            itemId: memory.itemId,
            speaker: memory.speaker,
            date: memory.date
          }
        });
        console.log(`[HindsightService] Retained memory into Hindsight bank ${bankId}:`, resp);
        return { success: true, isLocalFallback: false };
      } catch (err: any) {
        console.warn(`[HindsightService] Live retain call failed, stored in resilient local cache:`, err.message || err);
        return { success: true, isLocalFallback: true };
      }
    }

    return { success: true, isLocalFallback: true };
  }

  /**
   * Recall relevant failure memories from Hindsight
   */
  public async recallMemories(
    incidentId: string, 
    query: string
  ): Promise<{ sources: MemorySourceCitation[]; isLocalFallback: boolean; rawCount: number }> {
    await this.ensureBank(incidentId);
    const bankId = `incident-${incidentId}`;

    if (this.client) {
      try {
        const recallResp = await this.client.recall(bankId, query, {
          maxTokens: 2048,
          includeSourceFacts: true
        });

        if (recallResp && recallResp.results && recallResp.results.length > 0) {
          const sources: MemorySourceCitation[] = recallResp.results.map((r: any, idx: number) => ({
            itemId: r.metadata?.itemId || `hs-${idx}`,
            excerpt: r.text || r.fact || '',
            speaker: r.metadata?.speaker || 'Senior SRE',
            date: r.metadata?.date || '2026-09-22',
            tier: r.metadata?.tier === 'corroborated' ? 'corroborated' : 'single',
            category: (r.metadata?.category as any) || 'failed_attempt'
          }));
          return { sources, isLocalFallback: false, rawCount: recallResp.results.length };
        }
      } catch (err: any) {
        console.warn(`[HindsightService] Live recall failed, falling back to local memory store:`, err.message || err);
      }
    }

    // Local semantic retrieval fallback
    const allMemories = store.getMemories(incidentId).filter(m => m.status === 'current');
    const queryTokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);

    // Score memories based on query token matches, category weights, and corroboration
    const scored = allMemories.map(m => {
      const fullText = `${m.text} ${m.attempt || ''} ${m.failureReason || ''} ${m.lesson || ''}`.toLowerCase();
      let score = 0;
      queryTokens.forEach(token => {
        if (fullText.includes(token)) score += 2;
      });
      if (m.tier === 'corroborated') score += 1;
      if (m.category === 'failed_attempt' || m.category === 'failure_lesson') score += 2;
      return { memory: m, score };
    });

    // Sort by relevance score descending
    scored.sort((a, b) => b.score - a.score);

    const sources: MemorySourceCitation[] = scored.slice(0, 5).map(s => ({
      itemId: s.memory.itemId,
      excerpt: s.memory.text,
      speaker: s.memory.speaker,
      date: s.memory.date,
      tier: s.memory.tier,
      category: s.memory.category,
      failureReason: s.memory.failureReason,
      lesson: s.memory.lesson
    }));

    return { sources, isLocalFallback: true, rawCount: scored.length };
  }

  /**
   * Check for potential conflict: when a new observation or resolution contradicts an existing memory
   */
  public async checkForConflict(
    incidentId: string, 
    newText: string, 
    speaker: string
  ): Promise<{ conflictFound: boolean; existingMemory?: StoredMemory; reason?: string }> {
    const existingMemories = store.getMemories(incidentId).filter(m => m.status === 'current');
    const lower = newText.toLowerCase();

    // Key phrases indicating contradiction of past failures
    const contradictionPhrases = [
      'fine now', 'works fine', 'no need', 'fixed', 'resolved', 'loads fine', 
      'works now', 'fine with', 'no longer fails', 'standard template v3 loads fine now'
    ];
    const hasContradictionPhrase = contradictionPhrases.some(p => lower.includes(p));

    if (!hasContradictionPhrase) {
      return { conflictFound: false };
    }

    // Check if new report claims a previously failed approach now works or vice versa
    for (const mem of existingMemories) {
      if (mem.category === 'failed_attempt' && mem.attempt) {
        // Normalize words (e.g. retries -> retry, timeouts -> timeout)
        const normalize = (s: string) => s.toLowerCase().replace(/ies\b/, 'y').replace(/s\b/, '');
        const attemptWords = mem.attempt.split(/\s+/).map(normalize).filter(w => w.length >= 3);
        const textWords = lower.split(/\s+/).map(normalize);

        const matchesAttempt = attemptWords.some(aw => textWords.includes(aw));

        if (matchesAttempt) {
          return {
            conflictFound: true,
            existingMemory: mem,
            reason: `New statement indicates "${mem.attempt}" is now viable, contradicting the recorded failure: "${mem.failureReason || mem.text}"`
          };
        }
      }
    }

    return { conflictFound: false };
  }
}

export const hindsightService = new HindsightService();
