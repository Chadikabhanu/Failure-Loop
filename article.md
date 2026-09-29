# How We Stopped AI Agents Repeating Failures Using Hindsight

An AI debugging agent investigating an API outage will happily execute a solution that crashed the exact same service yesterday. It does not fail because the model lacks intelligence; it fails because standard agents operate in a perpetual state of amnesia where every completed task wipes the hard-earned lessons of what went wrong.

Last month, we watched a production debugging assistant recommend increasing client retries during an API latency spike. Three hours earlier, another engineer had attempted that exact strategy on the same service. The result was a catastrophic retry storm that maxed out the PostgreSQL connection pool at 100/100 connections, locking the database and taking the entire payment gateway offline. 

The agent had access to the official runbook. What it lacked was **failure memory**.

To fix this structural flaw across autonomous systems, we built **FailureLoop**, an incident-resolution agent that remembers what failed, why it failed, what succeeded, and what lesson must guide future decisions. At its core, FailureLoop integrates [Hindsight](https://github.com/vectorize-io/hindsight), a specialized long-term memory system designed for agentic architectures, transforming standard trial-and-error debugging into a persistent learning loop.

Here is how we designed FailureLoop, why conversational memory is the wrong abstraction for technical debugging, and what happened when we gave our agent the ability to recall previous engineering failures.

---

## The Root Problem: Why Agents Repeat Technical Mistakes

Most developer tools and autonomous agents treat memory as either an ephemeral chat transcript or a static vector search over documentation. Both approaches fail in incident response:

1. **Chat transcripts are session-bound:** Once an incident channel closes or an agent execution terminates, the knowledge evaporates. The next morning, a fresh agent starts from ground zero.
2. **Generic RAG only knows the "happy path":** Standard documentation and runbooks describe the official process (the SOP). They rarely document the real-world operational traps, timing gotchas, or downstream failure cascades that occur when an SOP is executed under stress.

When an AI agent investigates a technical problem, it naturally gravitates toward textbook solutions:

```text
Problem: Payment API latency spikes from 120ms to 4.5s
Baseline Agent Proposal:
1. Increase HTTP client timeout to 30s
2. Increase retry count from 2 to 5
3. Scale pod replicas
```

In a complex distributed system, all three suggestions can be fatal. Increasing timeouts holds database connections open longer. Adding retries creates an avalanche that saturates connection pools. Auto-scaling adds dozens of new pods, each opening connection pools against an already drowning database.

An engineer who lived through that incident knows never to do that again. A conventional agent will suggest the exact same fatal steps every single time.

To solve this, we needed an agent that follows a continuous feedback cycle:

$$\text{Recall} \longrightarrow \text{Decide} \longrightarrow \text{Act} \longrightarrow \text{Evaluate} \longrightarrow \text{Learn} \longrightarrow \text{Recall Again}$$

---

## How FailureLoop Hangs Together

FailureLoop is built as a full-stack incident investigation system with a TypeScript/Node.js backend, a Vite/React interface adhering to rigorous workplace-editorial design standards, and [Hindsight's long-term agent memory](https://vectorize.io/what-is-agent-memory) serving as the persistence and reasoning backbone.

```
                           +---------------------------+
                           |  Production Incident /    |
                           |   Successor Investigation |
                           +-------------+-------------+
                                         |
                                         v
                         +-------------------------------+
                         |   FailureLoop Agent Core      |
                         |   (TypeScript / Node Backend) |
                         +---------------+---------------+
                                         |
                       Recall Past Failures & Lessons
                                         |
                                         v
+-----------------------+     +-------------------------------+     +-----------------------+
|  Groq / Gemini LLM    | <-> |  Hindsight Memory Engine      | <-> |  Active Memory Bank   |
|  (Reasoning & Fallback|     |  (Retain, Recall, Reflect)    |     |  (Isolated per role   |
|   Strategy Chain)     |     +---------------+---------------+     |   or service domain)  |
+-----------------------+                     |                     +-----------------------+
                                              |
                              Evaluates Traps vs Proven Fix
                                              |
                                              v
                              +-------------------------------+
                              |  Dual-Mode Contrast Engine    |
                              |  - Baseline: Naive SOP        |
                              |  - FailureLoop: Proven Action |
                              +---------------+---------------+
                                              |
                                 Operator Executes Strategy
                                              |
                                              v
                              +-------------------------------+
                              |  Outcome Evaluator & Retain   |
                              |  - Retain Failure Reason      |
                              |  - Retain Distilled Lesson    |
                              |  - Inline Conflict Detection  |
                              +-------------------------------+
```

The system operates across three distinct phases:

### 1. Structured Experience Retention
Instead of storing raw conversational banter, FailureLoop extracts five structured dimensions whenever an investigation or strategy attempt concludes:
- **Problem & Symptoms:** Latency metrics, connection pool spikes, HTTP error codes.
- **Strategy Attempted:** The specific mitigation command or configuration change.
- **Outcome & Failure Consequence:** Whether the attempt succeeded or failed, and the exact technical mechanism of failure (e.g., connection starvation, buffer overflow).
- **Distilled Lesson:** The actionable rule that must govern future encounters.
- **Attribution & Provenance:** The engineer, date, and corroboration tier.

### 2. Temporal and Semantic Recall
When a new problem appears, FailureLoop queries the Hindsight bank using both semantic symptoms and temporal context. Hindsight returns an observation graph distinguishing between single-source claims and corroborated facts (where multiple engineers independently experienced the same failure mode).

### 3. Before/After Contrast Engine
FailureLoop runs a dual evaluation on every query:
- **Baseline Mode:** Queries the model using only the official runbook SOP (mimicking standard knowledge assistants).
- **Memory Mode:** Queries Hindsight's reflect engine with recalled failure memories.

This provides instant, verifiable proof of how persistent memory shifts the agent's strategy from naive textbook suggestions to resilient, production-tested fixes.

---

## Code-Backed Implementation

FailureLoop integrates directly with the official `@vectorize-io/hindsight-client`. Here are the core patterns we implemented in the codebase.

### 1. Retaining Structured Failure Experiences into Hindsight

When an engineer or automated test records an outcome, FailureLoop formats the experience with its category, speaker attribution, and failure consequences before retaining it into Hindsight:

```typescript
// backend/src/hindsight.ts
public async retainExperience(
  incidentId: string, 
  memory: StoredMemory
): Promise<{ success: boolean; isLocalFallback: boolean }> {
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

  if (this.client) {
    const resp = await this.client.retain(bankId, formattedContent, {
      tags: [memory.category, memory.result || 'observation', memory.tier],
      metadata: {
        itemId: memory.itemId,
        speaker: memory.speaker,
        date: memory.date
      }
    });
    return { success: true, isLocalFallback: false };
  }

  // Resilient local memory engine fallback if offline
  store.addMemory(memory);
  return { success: true, isLocalFallback: true };
}
```

### 2. Recalling Lessons and Enforcing Corroboration Tiers

Recall requests query the Hindsight bank to pull both raw experiences and synthesized observations. Citing sources from memory records rather than allowing the LLM to hallucinate evidence is a critical architectural requirement:

```typescript
// backend/src/hindsight.ts
public async recallMemories(
  incidentId: string, 
  query: string
): Promise<{ sources: MemorySourceCitation[]; isLocalFallback: boolean }> {
  await this.ensureBank(incidentId);
  const bankId = `incident-${incidentId}`;

  if (this.client) {
    const recallResp = await this.client.recall(bankId, query, {
      maxTokens: 2048,
      includeFacts: true
    });

    if (recallResp && recallResp.results) {
      const sources = recallResp.results.map((r: any, idx: number) => ({
        itemId: r.metadata?.itemId || `hs-${idx}`,
        excerpt: r.text || r.fact || '',
        speaker: r.metadata?.speaker || 'Senior SRE',
        date: r.metadata?.date || '2026-09-22',
        tier: r.metadata?.tier === 'corroborated' ? 'corroborated' : 'single',
        category: r.metadata?.category || 'failed_attempt'
      }));
      return { sources, isLocalFallback: false };
    }
  }

  // Local semantic scorer matching query tokens against failure reasons and lessons
  const localSources = this.scoreLocalMemories(incidentId, query);
  return { sources: localSources, isLocalFallback: true };
}
```

### 3. The Before/After Decision Shift

During an investigation, FailureLoop feeds the recalled failure records into the reasoning engine. Notice how the agent is explicitly instructed to identify past traps:

```typescript
// backend/src/llm.ts
private buildInvestigationPrompt(incident: IncidentSummary, sources: MemorySourceCitation[]): string {
  return `
You are FailureLoop, an AI incident debugging assistant with persistent failure memory powered by Hindsight.
Incident: ${incident.title}
Official SOP: ${incident.officialSop}
Naive Default Baseline: ${incident.baselineDefaultApproach}

Recalled Failure Memories from Past Incidents:
${sources.map((s, i) => `Memory ${i+1} [${s.category}] by ${s.speaker} (${s.date}, ${s.tier}):
${s.excerpt}
${s.failureReason ? `Why it failed: ${s.failureReason}` : ''}
${s.lesson ? `Lesson: ${s.lesson}` : ''}`).join('\n\n')}

Analyze the recalled memories. Return JSON with:
{
  "recommendation": "Concise strategy warning against the naive approach and prescribing the verified fix",
  "actualPractice": "Detailed explanation of what failed previously and why the proven approach works",
  "failedStrategiesToAvoid": [
    { "attempt": "Failed approach", "whyFailed": "Specific technical consequence", "evidence": "Speaker citation" }
  ],
  "suggestedAction": "Exact technical step the on-call engineer should execute right now"
}`;
}
```

---

## Live Results: Memory in Action

To validate FailureLoop, we ran parallel tests on identical technical incidents using both a standard agent (Baseline) and FailureLoop (Memory-Augmented).

### Test Case: Payment API Degradation Under Traffic

**Incident Symptoms:**
- Latency increased from 120ms to 4,500ms
- PostgreSQL connection pool saturated at 100/100 active connections
- HTTP 504 Gateway Timeouts on `/v1/checkout/charge`

**Baseline Agent (No Memory):**
> *"Follow the official runbook: Increase client HTTP timeout to 30s, configure 5 client retries, and trigger HPA auto-scaling to spawn 10 additional API pods."*

**FailureLoop (With Hindsight Failure Memory):**
> *"DO NOT increase retries or request timeouts. In production, increasing retries to 5 caused a catastrophic retry storm that saturated PostgreSQL connections at 100/100, cascading into total downtime (corroborated by Sarah Chen and Farah Khan). Increasing HTTP timeouts to 30s further locked connection threads.*  
>  
> *The verified fix that resolved latency was enabling PgBouncer transaction pooling with max 25 dedicated backend connections and decoupling webhook processing into BullMQ."*

The difference is night and day. The standard agent blindly repeated the exact steps that caused the previous outage. FailureLoop caught the trap, cited the previous failure consequence, and recommended the verified architectural fix.

### Resolving Knowledge Conflicts Without Silent Overwrites

What happens when an engineer upgrades PgBouncer and discovers that retries now work without pool saturation?

Most retrieval systems suffer from silent overwrites or conflicting hallucinations. FailureLoop includes an explicit conflict detection layer. When a new attempt report contradicts a stored failure lesson, the system displays an inline Conflict Banner:

1. It shows the previous failure memory alongside the new evidence.
2. It presents two clear choices: **Update Knowledge** (marks the old memory as superseded with historical date stamps) or **Keep as Exception** (preserves the old guidance and logs the new finding as an isolated edge case).
3. **Nothing is ever deleted.** Stored knowledge maintains complete historical provenance.

---

## Reusable Takeaways for Engineers Building Agents

Building FailureLoop taught us several non-obvious lessons about agent memory:

### 1. Store Failure Reasons, Not Just "Failed" Flags
An agent that only knows "Approach A failed" is prone to trying minor variations of Approach A. When the agent knows *why* Approach A failed (e.g., *"saturated connection pool at 100/100 connections"*), it generalizes that failure reason to reject an entire class of related bad ideas (like increasing timeouts or spawning more pods).

### 2. Corroboration Tiers Prevent Outlier Contamination
In production environments, one engineer's bad experience might be an isolated bug. By tracking proof counts through Hindsight, FailureLoop marks observations supported by multiple independent engineers as **Corroborated**. This ensures the agent distinguishes settled team consensus from single-source anomalies.

### 3. Sanitize Secrets at the Ingestion Boundary
Engineers frequently paste terminal traces, curl commands, and configuration snippets into incident chats. If your agent retains memory indefinitely, sensitive credentials will leak into long-term storage. FailureLoop implements regex sanitization at the ingestion layer, immediately rejecting API keys, passwords, and session tokens before they touch the memory bank.

---

## Conclusion

The future of autonomous engineering agents does not lie in simply increasing context window sizes. Packing thousands of tokens of raw conversational noise into a prompt is expensive, slow, and distracting.

Real competence comes from experience: **the ability to remember what was tried, understand why it failed, and adapt future strategy accordingly**.

By combining modern LLM reasoning with [Hindsight's agent memory system](https://hindsight.vectorize.io/), FailureLoop proves that an AI agent never has to learn the same lesson twice.

---

### Resources & Links
- [Hindsight GitHub Repository](https://github.com/vectorize-io/hindsight)
- [Official Hindsight Documentation](https://hindsight.vectorize.io/)
- [Vectorize: What is Agent Memory?](https://vectorize.io/what-is-agent-memory)
