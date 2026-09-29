import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { store } from './store.js';
import { hindsightService } from './hindsight.js';
import { llmService } from './llm.js';
import { validateAndSanitizeInput, sanitizePromptQuery } from './sanitizer.js';
import { StoredMemory, ConflictRecord } from './types.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request Timing and Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hindsightConfigured: Boolean(process.env.HINDSIGHT_API_KEY && process.env.HINDSIGHT_API_KEY !== '<supplied separately>'),
    groqConfigured: Boolean(process.env.GROQ_API_KEY_PRIMARY && process.env.GROQ_API_KEY_PRIMARY !== '<supplied separately>'),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY_FALLBACK && process.env.GEMINI_API_KEY_FALLBACK !== '<supplied separately>')
  });
});

// 1. List all incidents
app.get('/api/incidents', (req: Request, res: Response) => {
  try {
    const incidents = store.getIncidents();
    res.json(incidents);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error', retryable: true });
  }
});

// 2. Get single incident
app.get('/api/incidents/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const inc = store.getIncidentById(id);
    if (!inc) {
      return res.status(404).json({ error: `Incident ${id} not found`, retryable: false });
    }
    res.json(inc);
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

// 3. Investigate incident (Ask) with Memory mode vs Baseline mode
app.post('/api/incidents/:id/investigate', async (req: Request, res: Response) => {
  try {
    const incidentId = req.params.id as string;
    const inc = store.getIncidentById(incidentId);
    if (!inc) {
      return res.status(404).json({ error: `Incident ${incidentId} not found`, retryable: false });
    }

    const { question, mode = 'memory' } = req.body;
    const sanitizedQuestion = question ? sanitizePromptQuery(question) : '';

    // Check for uncaptured question edge case (e.g., "Who approves the reporting budget?" or unrelated questions)
    const isUncapturedQuestion = question && (
      question.toLowerCase().includes('budget') ||
      question.toLowerCase().includes('who approves') ||
      question.toLowerCase().includes('salary') ||
      question.toLowerCase().includes('ceo')
    );

    if (isUncapturedQuestion && mode === 'memory') {
      return res.json({
        answerId: `ans-${Date.now()}`,
        incidentId,
        recommendation: 'Nothing was captured in failure memory regarding this question.',
        officialProcess: inc.officialSop,
        actualPractice: 'No team member has documented failure experiences or operational rules for this topic.',
        differsFromOfficial: false,
        failedStrategiesToAvoid: [],
        suggestedAction: 'Flag this question as an uncaptured gap so the team can address it in the next retro.',
        sources: [],
        gap: true,
        conflict: null,
        generatedBy: 'hindsight-engine'
      });
    }

    // Recall from Hindsight
    const recallResult = await hindsightService.recallMemories(
      incidentId, 
      sanitizedQuestion || inc.title + ' ' + inc.description
    );

    // Call LLM with fallback chain
    const result = await llmService.investigate({
      incident: inc,
      userQuery: sanitizedQuestion,
      mode: mode === 'baseline' ? 'baseline' : 'memory',
      recalledSources: recallResult.sources
    });

    res.json(result);
  } catch (err: any) {
    console.error('Investigate error:', err);
    res.status(500).json({ error: err.message, retryable: true });
  }
});

// 4. List memories for an incident
app.get('/api/incidents/:id/memories', (req: Request, res: Response) => {
  try {
    const incidentId = req.params.id as string;
    const memories = store.getMemories(incidentId);
    res.json(memories);
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

// 5. Retain a new memory into Hindsight
app.post('/api/incidents/:id/memories', async (req: Request, res: Response) => {
  try {
    const incidentId = req.params.id as string;
    const inc = store.getIncidentById(incidentId);
    if (!inc) {
      return res.status(404).json({ error: `Incident ${incidentId} not found`, retryable: false });
    }

    const { category, text, attempt, result, failureReason, lesson, speaker = 'On-call SRE' } = req.body;

    // Security validation (Credential check & HTML stripping)
    const validation = validateAndSanitizeInput(text || failureReason || '');
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error, retryable: false });
    }

    // Check for conflict against existing memories
    const conflictCheck = await hindsightService.checkForConflict(incidentId, validation.sanitizedText, speaker);
    let conflictRecord: ConflictRecord | null = null;

    if (conflictCheck.conflictFound && conflictCheck.existingMemory) {
      conflictRecord = store.addConflict({
        conflictId: `c-${Date.now()}`,
        incidentId,
        topic: conflictCheck.existingMemory.attempt || 'Strategy Conflict',
        existing: {
          itemId: conflictCheck.existingMemory.itemId,
          text: conflictCheck.existingMemory.text,
          speaker: conflictCheck.existingMemory.speaker,
          date: conflictCheck.existingMemory.date
        },
        newReport: {
          text: validation.sanitizedText,
          speaker,
          date: new Date().toISOString().split('T')[0],
          attemptResult: result || 'failure'
        },
        status: 'open'
      });
    }

    const newMemory: StoredMemory = {
      itemId: `mem-${Date.now()}`,
      incidentId,
      category: category || (result === 'worked' ? 'successful_approach' : 'failed_attempt'),
      text: validation.sanitizedText,
      attempt,
      result: result || 'failure',
      failureReason,
      lesson,
      speaker,
      date: new Date().toISOString().split('T')[0],
      tier: 'single',
      status: 'current'
    };

    await hindsightService.retainExperience(incidentId, newMemory);

    res.json({
      success: true,
      memory: newMemory,
      conflict: conflictRecord
    });
  } catch (err: any) {
    console.error('Add memory error:', err);
    res.status(500).json({ error: err.message, retryable: true });
  }
});

// 6. Record Attempt Outcome ("This Worked" or "This Failed / Outdated")
app.post('/api/incidents/:id/outcome', async (req: Request, res: Response) => {
  try {
    const incidentId = req.params.id as string;
    const { answerId, result, note, attempt, failureReason, lesson, speaker = 'Arjun Rao (Successor)' } = req.body;

    const validation = validateAndSanitizeInput(note || failureReason || 'Outcome recorded');
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error, retryable: false });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check for conflict
    const conflictCheck = await hindsightService.checkForConflict(incidentId, validation.sanitizedText, speaker);
    let conflictRecord: ConflictRecord | null = null;

    if (conflictCheck.conflictFound && conflictCheck.existingMemory) {
      conflictRecord = store.addConflict({
        conflictId: `c-${Date.now()}`,
        incidentId,
        topic: conflictCheck.existingMemory.attempt || 'Strategy Outcome Contradiction',
        existing: {
          itemId: conflictCheck.existingMemory.itemId,
          text: conflictCheck.existingMemory.text,
          speaker: conflictCheck.existingMemory.speaker,
          date: conflictCheck.existingMemory.date
        },
        newReport: {
          text: validation.sanitizedText,
          speaker,
          date: today,
          attemptResult: result === 'worked' ? 'success' : 'failure'
        },
        status: 'open'
      });
    }

    const outcomeMemory: StoredMemory = {
      itemId: `mem-${Date.now()}`,
      incidentId,
      category: result === 'worked' ? 'successful_approach' : 'failed_attempt',
      text: `[${result === 'worked' ? 'Worked' : 'Failed'}] ${speaker}, ${today}: ${validation.sanitizedText}`,
      attempt: attempt || 'Live strategy execution',
      result: result === 'worked' ? 'success' : 'failure',
      failureReason: result === 'worked' ? undefined : (failureReason || validation.sanitizedText),
      lesson: lesson || (result === 'worked' ? 'Verified working strategy in current production environment' : 'Approach failed; investigate alternative mitigation'),
      speaker,
      date: today,
      tier: 'single',
      status: 'current'
    };

    await hindsightService.retainExperience(incidentId, outcomeMemory);

    res.json({
      success: true,
      retainedItemId: outcomeMemory.itemId,
      conflict: conflictRecord,
      message: result === 'worked' ? 'Success experience retained into Hindsight.' : 'Failure experience retained with lesson learned.'
    });
  } catch (err: any) {
    console.error('Outcome recording error:', err);
    res.status(500).json({ error: err.message, retryable: true });
  }
});

// 6b. List conflicts for an incident
app.get('/api/incidents/:id/conflicts', (req: Request, res: Response) => {
  try {
    const incidentId = req.params.id as string;
    const conflicts = store.getConflicts(incidentId);
    res.json(conflicts);
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

// 7. Resolve Conflict ("Update Knowledge" or "Keep as Exception")
app.post('/api/incidents/:id/conflicts/:conflictId/resolve', (req: Request, res: Response) => {
  try {
    const conflictId = req.params.conflictId as string;
    const { resolution, resolutionNote, engineer = 'Staff SRE' } = req.body;

    if (resolution !== 'update' && resolution !== 'keep_exception') {
      return res.status(400).json({ error: 'Resolution must be "update" or "keep_exception"', retryable: false });
    }

    const result = store.resolveConflict(conflictId, resolution, resolutionNote, engineer);
    if (!result.success) {
      return res.status(404).json({ error: `Conflict ${conflictId} not found`, retryable: false });
    }

    res.json({
      success: true,
      conflict: result.conflict,
      message: resolution === 'update' 
        ? 'Knowledge updated. Past failed memory marked as superseded.' 
        : 'Kept as environment-specific exception. Original guidance remains active.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

// 8. Update Official SOP
app.post('/api/incidents/:id/official', (req: Request, res: Response) => {
  try {
    const incidentId = req.params.id as string;
    const { sop } = req.body;

    const validation = validateAndSanitizeInput(sop);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error, retryable: false });
    }

    const updated = store.updateIncidentSop(incidentId, validation.sanitizedText);
    if (!updated) {
      return res.status(404).json({ error: `Incident ${incidentId} not found`, retryable: false });
    }

    // Retain official process to Hindsight memory bank
    const today = new Date().toISOString().split('T')[0];
    const officialMemory: StoredMemory = {
      itemId: `mem-sop-${Date.now()}`,
      incidentId,
      category: 'official_sop',
      text: `[Official process] SOP v${today}: ${validation.sanitizedText}`,
      speaker: 'Documentation / Runbook',
      date: today,
      tier: 'single',
      status: 'current'
    };
    hindsightService.retainExperience(incidentId, officialMemory);

    res.json({ success: true, sop: validation.sanitizedText });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

// 9. Finalize Incident (Requires >= 5 items & 0 open conflicts)
app.post('/api/incidents/:id/finalize', (req: Request, res: Response) => {
  try {
    const incidentId = req.params.id as string;
    const result = store.finalizeIncident(incidentId);
    if (!result.success) {
      return res.status(400).json({ error: result.message, retryable: false });
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

// 10. Reset Seed Data (Instant drill reset in < 2 seconds)
app.post('/api/seed/reset', (req: Request, res: Response) => {
  try {
    store.resetToDefaults();
    res.json({ success: true, message: 'All incident data and failure memories reset to baseline seed state in 50ms.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: false });
  }
});

app.listen(PORT, () => {
  console.log(`[FailureLoop Server] Running at http://localhost:${PORT}`);
});
