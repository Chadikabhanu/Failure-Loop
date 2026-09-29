# FailureLoop — Persistent Failure Memory for AI Debugging Agents

> **An AI agent should never have to learn the same lesson twice.**

FailureLoop is a memory-native incident investigation and debugging agent designed to give autonomous systems **persistent failure memory**. Instead of discarding the painful trial-and-error experience gained during incident resolution, FailureLoop captures what was attempted, whether it succeeded or failed, the specific technical mechanism of failure, and the distilled rule for future investigations.

Powered by [Hindsight](https://github.com/vectorize-io/hindsight) as its long-term experience memory layer, FailureLoop recalls relevant past failures whenever a new problem is submitted, preventing agents from re-suggesting naive or dangerous strategies that triggered outages in the past.

---

## The Core Problem

Standard AI debugging agents suffer from total operational amnesia:
1. They investigate a technical incident.
2. They suggest naive textbook fixes (e.g., increase timeouts, add more retries).
3. Those approaches fail or worsen downstream load.
4. Eventually, a team member discovers the root-cause fix.
5. **The session ends, and the hard-won experience disappears.**

Tomorrow, another agent investigates a similar incident and suggests the exact same failed strategy.

```text
Normal Agent:
Problem ──► Try ──► Fail ──► Solve ──► Forget ──► New Problem ──► Repeat Mistake

FailureLoop:
Problem ──► Try ──► Fail ──► Learn ──► Remember (Hindsight) ──► New Problem ──► Recall ──► Avoid Trap ──► Resolve
```

---

## Architecture & Integration Flow

```
                     +---------------------------------------+
                     |  Incident Ingestion / Successor Query |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |        FailureLoop Agent Core         |
                     |   (TypeScript / Express Backend)      |
                     +-------------------+-------------------+
                                         |
              +--------------------------+--------------------------+
              |                                                     |
              v                                                     v
+-----------------------------+                       +-----------------------------+
|    Hindsight Memory Layer   |                       |    LLM Resilience Chain     |
| - Retain: structured failure|                       | - Primary: Groq             |
|   experiences & lessons     | <===================> | - Secondary: Groq 429 burst |
| - Recall: semantic & entity |                       | - Cross-Provider: Gemini    |
|   retrieval with proof tags |                       | - Deterministic Local Engine|
| - Reflect: reasoning against|                       +-----------------------------+
|   memory banks              |
+-----------------------------+
              |
              v
+-----------------------------------------------------------------------------------+
|                           Dual-Mode Comparison Engine                             |
|  [Baseline Agent: No Memory]             vs.       [FailureLoop: With Hindsight]  |
|  - Strictly applies official runbook SOP           - Recalls past failure reasons |
|  - Naively suggests retries & timeouts             - Warns against retry storm    |
|  - Blind to past outages                           - Prescribes PgBouncer fix     |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        Continuous Learning & Conflict Loop                        |
|  - Operator records outcome ("Worked" vs "Failed")                                |
|  - Retains consequence and lesson into Hindsight                                  |
|  - Inline Conflict Detection & Resolution (Update Knowledge vs Keep as Exception) |
|  - Security & Credential Sanitizer (Zero credential leakage into long-term memory)|
+-----------------------------------------------------------------------------------+
```

---

## Key Features

1. **Structured Experience Retention:** Captures problem symptoms, attempted strategy, result, failure reason, what worked, and distilled lesson.
2. **Before / After Comparison Toggle:** Instantly compares the naive baseline agent (official SOP only) against the memory-augmented FailureLoop agent.
3. **"Because" Panel (Recalled Experience):** Cites authentic memory records with speaker, timestamp, and Hindsight corroboration tiers (`Single Source` vs `Corroborated`). Never lets the LLM hallucinate citations.
4. **Interactive Outcome Feedback:** Live execution loop where engineers mark *"This Worked"* or *"This Failed"*, immediately retaining new knowledge into Hindsight.
5. **Non-Destructive Conflict Resolution:** Detects when a new report contradicts a stored failure (e.g. after a software upgrade). Users can choose *Update Knowledge* (marks old memory as superseded) or *Keep as Exception*. Nothing is ever deleted.
6. **Credential & Injection Shield:** Strict regex and AST filters prevent passwords, API keys, bearer tokens, OTPs, and prompt injections from contaminating memory.
7. **Demo-Day Drill Reset:** One-click reset command restores clean seed data in under 50 milliseconds for flawless live demonstrations.

---

## Edge-Case Verification Checklist (Tiers 1 – 5 Passed)

| Tier | Test Case | Expected Behavior | Status |
| :--- | :--- | :--- | :---: |
| **Tier 1** | **Before/after contrast** | Baseline returns naive SOP; FailureLoop catches retry storm and recommends PgBouncer; 100% repeatable. | **PASS** |
| **Tier 1** | **Uncaptured question** | Querying uncaptured topic returns `gap: true`, shows official SOP, offers gap flag. No hallucinated names. | **PASS** |
| **Tier 1** | **Conflict end-to-end** | Contradicting statement triggers inline warning banner; choice between Update & Exception; old item preserved as superseded. | **PASS** |
| **Tier 2** | **Cross-entity isolation** | Bluepeak report memory does not leak into Northwind or Payment API banks. | **PASS** |
| **Tier 2** | **Corroboration counting** | Sarah Chen + Farah Khan independent reports promote failure memory to `Corroborated`. | **PASS** |
| **Tier 3** | **Credential block** | Passwords, API keys (`sk-...`), and OTPs are blocked at backend and UI with clear messages. | **PASS** |
| **Tier 3** | **Prompt injection block** | Injection strings treated strictly as inert text data; directives are never revealed. | **PASS** |
| **Tier 3** | **Double-click idempotence** | Double clicking submit retains exactly one item; does not falsely inflate corroboration tier. | **PASS** |
| **Tier 4** | **Resilient offline fallback**| Seamless embedded fallback memory engine when running locally or during network outages. | **PASS** |
| **Tier 5** | **Design standards** | Calm editorial workplace aesthetic, Source Serif 4 + Source Sans 3, >= 4.5:1 contrast, 0 fake neon glow. | **PASS** |

---

## Project Structure

```text
e:\Failure-Loop\
├── backend/
│   ├── src/
│   │   ├── index.ts        # Express REST API endpoints & timing middleware
│   │   ├── hindsight.ts    # Official HindsightClient integration & fallback engine
│   │   ├── llm.ts          # Fallback chain (Groq Primary -> Groq Secondary -> Gemini -> Rule Engine)
│   │   ├── sanitizer.ts    # Credential blocking & prompt injection sanitization
│   │   ├── store.ts        # JSON persistence store with corroboration & conflict management
│   │   └── types.ts        # TypeScript data contracts
│   ├── data/
│   │   └── store.json      # Persistent local store
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Root app layout & state orchestration
│   │   ├── index.css       # Section 5 Design System (CSS tokens, fonts, spacing)
│   │   ├── components/
│   │   │   ├── TopBar.tsx           # Brand, incident switcher, role toggle & drill reset
│   │   │   ├── InvestigationView.tsx# Before/After comparison, recommendations, actions
│   │   │   ├── BecausePanel.tsx     # Recalled sources, corroboration badges, citations
│   │   │   ├── ConflictBanner.tsx   # Inline conflict resolution (Update vs Exception)
│   │   │   ├── AttemptModal.tsx     # Live outcome feedback recorder
│   │   │   ├── MemoryList.tsx       # Departing SRE capture studio & memory bank
│   │   │   └── SkeletonLoader.tsx   # Zero-layout-shift loading placeholders
│   │   └── pages/
│   │       ├── Privacy.tsx          # Privacy policy & credential warning
│   │       └── Terms.tsx            # Terms of use
│   ├── package.json
│   └── vite.config.ts
├── article.md             # 1,500-word technical writeup (HN / Dev.to / Medium ready)
├── linkedin_post.md       # Viral Andrej Karpathy-style LinkedIn post (< 800 chars)
├── video_script.md        # 3-minute screen-recorded demo script & 5 YouTube titles
└── thumbnail_prompt.md    # 16:9 prompt for Google Nano Banana / Gemini
```

---

## Quickstart Guide

### 1. Prerequisites
- Node.js >= 18 (Tested on Node v22.17)
- npm >= 9

### 2. One-Click Launch (Fastest)
From the repository root:
- **Windows (PowerShell):** `.\start.ps1`
- **Windows (Batch):** Double-click `start.bat`
- **Linux / macOS / Git Bash:** `chmod +x start.sh && ./start.sh`
- **Root NPM Commands:**
  - Build entire project: `npm run build`
  - Start backend: `npm run dev:backend`
  - Start frontend: `npm run dev:frontend`

### 3. Manual Launch
#### Start Backend Server
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:4000`.*

### 4. Start Frontend Application
In a separate terminal:
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
*Open `http://127.0.0.1:5173` in your browser.*

---

## Live Demo Script (90 Seconds)

1. **Open Incident Studio:** Navigate to `http://127.0.0.1:5173/`. The primary incident *"Payment API Latency Spike Under High Traffic"* is preloaded.
2. **Toggle Baseline Comparison:** Check *"Compare with an answer that ignores captured failure knowledge"*.
   - **Baseline Agent (Left):** Blindly suggests *"Increase client timeout to 30s and bump retries to 5"*.
   - **FailureLoop (Right):** Recommends *"DO NOT increase retries or timeouts"*, citing that retries caused a 100/100 connection pool lock in past incidents.
3. **Inspect the Because Panel:** Show that Sarah Chen and Farah Khan both documented this failure, giving it the **Corroborated** tag.
4. **Trigger Live Feedback:** Click *"This Failed / Outdated"* or *"This Worked"* to retain a new experience into Hindsight.
5. **Demonstrate Conflict Handling:** Record an outcome stating *"PgBouncer update fixed connection handling; retries now load fine"*. Notice the **Conflict Banner** appear instantly with options to **Update Knowledge** or **Keep as Exception**.
6. **Reset Drill:** Click **Reset Drill** in the top bar to restore the baseline state in 50ms.

---

## License
MIT License. Built for the Vectorize Hindsight Agent Memory ecosystem.
