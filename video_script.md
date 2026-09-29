# FailureLoop — 3-Minute Screen-Recorded Video Demo Script

## 5 High-Performing Clickable Video Titles
1. **Why Your AI Agent Keeps Making the Same Disastrous Mistake**
2. **I Gave an AI Debugging Agent Failure Memory Using Hindsight (Here's What Happened)**
3. **Never Let an AI Agent Crash Your Database Twice**
4. **How Long-Term Failure Memory Changes Agent Strategy: Before vs After**
5. **Stop Feeding Agents Raw Chat Logs: Real Experience Memory in Action**

---

## Video Specifications
- **Target Duration:** 3 minutes (180 seconds)
- **Resolution:** 1080p (1920x1080) minimum
- **Recording Mode:** Screen recording + optional webcam corner
- **Prerequisites:** 
  - Backend running: `http://localhost:4000`
  - Frontend open: `http://127.0.0.1:5173/`
  - Terminal tab open to `e:\Failure-Loop`

---

## Script & Screen Action Timeline

### Part 1: Quick Intro (0:00 - 0:30)

**[Screen Cue]:** Full screen on the FailureLoop incident dashboard (`http://127.0.0.1:5173/`). Mouse hovers over the header and the incident *"Payment API Latency Spike Under High Traffic"*.

**[Spoken Narration]:**
> "Hey everyone. If you’ve built AI agents for debugging or systems engineering, you’ve probably hit this wall: your agent investigates a problem, tries a few things, crashes a service, and then eventually fixes it. But tomorrow, on a fresh interaction, it tries that exact same broken approach all over again.
> 
> Most agents suffer from total operational amnesia.
> 
> I built **FailureLoop** to give debugging agents persistent failure memory. Using **Hindsight** as its long-term experience memory layer, FailureLoop retains what was tried, why it failed, what actually worked, and ensures an agent never has to learn the same lesson twice."

---

### Part 2: The Problem — Agent Without Memory (0:30 - 1:00)

**[Screen Cue]:** Click the comparison toggle: *"Compare with an answer that ignores captured failure knowledge"*. Point cursor at the **Baseline Agent (No Memory)** card on the left side of the grid.

**[Spoken Narration]:**
> "Let’s look at what goes wrong without memory. Here’s a live incident: our payment API latency jumped from 120 milliseconds to 4.5 seconds under flash sale traffic.
> 
> Look at the baseline agent on the left. It reads the official runbook SOP and immediately says: *'Increase client timeout to 30 seconds and bump retry count to 5.'*
> 
> That sounds reasonable on paper. But in production, retrying un-shed requests creates an immediate retry storm. It saturates PostgreSQL connections to 100 out of 100, locks the database, and takes the entire checkout system offline. 
> 
> A standard agent has no idea that happened yesterday. It repeats the disaster."

---

### Part 3: Live Demo — Retain, Recall & Behavior Change (1:00 - 2:30)

**[Screen Cue]:** Move cursor to the right card: **FailureLoop (With Hindsight Memory)**, highlighting the green accent borders. Then scroll down to point at the **"Because (Recalled Experience)"** panel on the right.

**[Spoken Narration]:**
> "Now look at FailureLoop on the right. When the question is submitted, FailureLoop calls `hindsightService.recallMemories()` against its memory bank.
> 
> Look at the Because panel over here. It surfaced real experiences: Sarah Chen tried retries on September 22nd and documented that it saturated connection pools. Farah Khan experienced the exact same failure during the June quarter-end run. 
> 
> Because two engineers independently hit that failure mode, Hindsight tags this as **Corroborated**.
> 
> Now watch how that changes the agent's strategy: FailureLoop explicitly tells us: *'DO NOT increase retries or timeouts.'* Instead, it prescribes PgBouncer transaction pooling with max 25 connections and offloading webhooks asynchronously into BullMQ."

**[Screen Cue]:** Click **"Viewing as: Departing SRE (Capture)"** in the top bar. Show the memory bank list with item statuses and tags. Then click **"Viewing as: Successor (Ask)"** to switch back.

**[Spoken Narration]:**
> "Every time an engineer tests an approach, they can record the outcome right here. When you click *'This Worked'* or *'This Failed'*, FailureLoop captures the technical consequence and immediately calls `hindsight.retain()`.
> 
> And if someone discovers that an old failure is now fixed — say, after a database upgrade — the system doesn't silently overwrite the past. It raises an inline Conflict Banner, letting the team update the knowledge graph with full historical provenance."

---

### Part 4: One Key Takeaway & Wrap-Up (2:30 - 3:00)

**[Screen Cue]:** Switch back to the clean comparison view, then briefly show the clean code in `backend/src/hindsight.ts` where `recall()` and `retain()` are invoked.

**[Spoken Narration]:**
> "The biggest surprise for me while building this was realizing that conversation logs are the wrong abstraction for agent memory. You don't want agents wading through thousands of noisy chat tokens. You want structured operational lessons: what failed, why, and what rule must guide the next attempt.
> 
> With Hindsight, failure isn't wasted computation anymore — it's the exact data that makes the agent smarter for the next engineer.
> 
> Check out the repo and the full technical writeup in the description below. Thanks for watching!"
