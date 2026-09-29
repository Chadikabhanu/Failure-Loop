import fs from 'fs';
import path from 'path';
import { StoredMemory, IncidentSummary, ConflictRecord } from './types.js';

interface DatabaseSchema {
  incidents: IncidentSummary[];
  memories: StoredMemory[];
  conflicts: ConflictRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

export class Store {
  private data: DatabaseSchema = {
    incidents: [],
    memories: [],
    conflicts: []
  };

  constructor() {
    this.ensureDataDir();
    this.load();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        return;
      } catch (err) {
        console.error('Failed to parse store.json, using defaults', err);
      }
    }
    this.resetToDefaults();
  }

  public save() {
    this.ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  public resetToDefaults() {
    this.data = getInitialSeedData();
    this.save();
  }

  // --- Incidents ---
  public getIncidents(): IncidentSummary[] {
    // Dynamically update itemCount and openConflicts
    return this.data.incidents.map(inc => {
      const incidentMemories = this.data.memories.filter(m => m.incidentId === inc.incidentId);
      const openConflicts = this.data.conflicts.filter(c => c.incidentId === inc.incidentId && c.status === 'open');
      return {
        ...inc,
        itemCount: incidentMemories.length,
        openConflicts: openConflicts.length
      };
    });
  }

  public getIncidentById(id: string): IncidentSummary | undefined {
    const inc = this.data.incidents.find(i => i.incidentId === id);
    if (!inc) return undefined;
    const incidentMemories = this.data.memories.filter(m => m.incidentId === inc.incidentId);
    const openConflicts = this.data.conflicts.filter(c => c.incidentId === inc.incidentId && c.status === 'open');
    return {
      ...inc,
      itemCount: incidentMemories.length,
      openConflicts: openConflicts.length
    };
  }

  public updateIncidentSop(id: string, sop: string): boolean {
    const inc = this.data.incidents.find(i => i.incidentId === id);
    if (inc) {
      inc.officialSop = sop;
      this.save();
      return true;
    }
    return false;
  }

  public finalizeIncident(id: string): { success: boolean; message: string } {
    const inc = this.data.incidents.find(i => i.incidentId === id);
    if (!inc) return { success: false, message: 'Incident not found' };

    const memories = this.getMemories(id);
    const conflicts = this.getConflicts(id).filter(c => c.status === 'open');

    if (memories.length < 5) {
      return { 
        success: false, 
        message: `Cannot finalize: requires at least 5 retained memories (current: ${memories.length})` 
      };
    }

    if (conflicts.length > 0) {
      return { 
        success: false, 
        message: `Cannot finalize: ${conflicts.length} open conflict(s) must be resolved first` 
      };
    }

    inc.status = 'resolved';
    this.save();
    return { success: true, message: 'Incident handoff finalized successfully' };
  }

  // --- Memories ---
  public getMemories(incidentId?: string): StoredMemory[] {
    if (incidentId) {
      return this.data.memories.filter(m => m.incidentId === incidentId);
    }
    return this.data.memories;
  }

  public addMemory(memory: StoredMemory): StoredMemory {
    // Avoid exact duplicate additions (idempotent double-click protection)
    const existingIndex = this.data.memories.findIndex(m => 
      m.incidentId === memory.incidentId && 
      m.text.trim().toLowerCase() === memory.text.trim().toLowerCase()
    );

    if (existingIndex >= 0) {
      return this.data.memories[existingIndex];
    }

    // Check corroboration: if another memory has similar attempt or lesson
    const related = this.data.memories.filter(m => 
      m.incidentId === memory.incidentId &&
      m.category === memory.category &&
      m.speaker !== memory.speaker
    );

    if (related.length > 0) {
      memory.tier = 'corroborated';
      memory.proofCount = (related[0].proofCount || 1) + 1;
      // Also update related memory to corroborated
      related.forEach(r => {
        r.tier = 'corroborated';
        r.proofCount = memory.proofCount;
      });
    }

    this.data.memories.unshift(memory);
    this.save();
    return memory;
  }

  public updateMemoryStatus(itemId: string, status: 'current' | 'superseded', historyNote?: string): boolean {
    const mem = this.data.memories.find(m => m.itemId === itemId);
    if (mem) {
      mem.status = status;
      if (historyNote) {
        if (!mem.history) mem.history = [];
        mem.history.push({
          date: new Date().toISOString().split('T')[0],
          note: historyNote
        });
      }
      this.save();
      return true;
    }
    return false;
  }

  // --- Conflicts ---
  public getConflicts(incidentId?: string): ConflictRecord[] {
    if (incidentId) {
      return this.data.conflicts.filter(c => c.incidentId === incidentId);
    }
    return this.data.conflicts;
  }

  public addConflict(conflict: ConflictRecord): ConflictRecord {
    this.data.conflicts.unshift(conflict);
    this.save();
    return conflict;
  }

  public resolveConflict(
    conflictId: string, 
    resolution: 'update' | 'keep_exception', 
    note?: string,
    engineer: string = 'Staff SRE'
  ): { success: boolean; conflict?: ConflictRecord } {
    const conflict = this.data.conflicts.find(c => c.conflictId === conflictId);
    if (!conflict) return { success: false };

    conflict.status = resolution === 'update' ? 'updated' : 'kept_as_exception';
    conflict.resolutionNote = note || (resolution === 'update' ? 'Updated with new verified findings' : 'Kept as environment-specific exception');
    conflict.resolvedAt = new Date().toISOString().split('T')[0];

    const today = new Date().toISOString().split('T')[0];

    if (resolution === 'update') {
      // Mark old item superseded in history, retaining full provenance
      this.updateMemoryStatus(
        conflict.existing.itemId, 
        'superseded', 
        `Superseded on ${today} by ${conflict.newReport.speaker}: "${conflict.newReport.text}"`
      );

      // Add resolution memory
      this.addMemory({
        itemId: `k-${Date.now()}`,
        incidentId: conflict.incidentId,
        category: 'successful_approach',
        text: `[Resolution] ${engineer}, ${today}: ${conflict.newReport.text}`,
        attempt: conflict.newReport.text,
        result: 'success',
        lesson: `Updated resolution: ${conflict.resolutionNote}`,
        speaker: `${engineer} (Resolution)`,
        date: today,
        tier: 'single',
        status: 'current'
      });
    } else {
      // Keep as exception: old item remains current, new item retained as exception note
      this.addMemory({
        itemId: `k-${Date.now()}`,
        incidentId: conflict.incidentId,
        category: 'anti_pattern',
        text: `[Exception Note] ${engineer}, ${today}: Old guidance remains active. New report was isolated exception: ${conflict.newReport.text}`,
        lesson: `Exception: ${conflict.resolutionNote}`,
        speaker: `${engineer} (Exception Review)`,
        date: today,
        tier: 'single',
        status: 'current'
      });
    }

    this.save();
    return { success: true, conflict };
  }
}

function getInitialSeedData(): DatabaseSchema {
  return {
    incidents: [
      {
        incidentId: 'inc-payment-latency',
        title: 'Payment API Latency Spike Under High Traffic',
        service: 'payment-gateway-service',
        severity: 'P1',
        status: 'investigating',
        description: 'During flash sales and traffic peaks, payment processing API latency increases from 120ms to > 4,500ms, causing checkout timeouts and customer cart abandonment.',
        symptoms: [
          'Request latency increased 35x (120ms -> 4,500ms)',
          'Postgres connection pool saturated (100/100 active connections)',
          'Client HTTP 504 Gateway Timeouts on /v1/checkout/charge',
          'Downstream payment webhook queue accumulating backlog'
        ],
        officialSop: 'Official Runbook v3.2: If payment API response time exceeds 500ms, increase HTTP client timeout to 30 seconds and increase retry count from 2 to 5 with linear backoff. Scale out pod replicas if latency persists.',
        baselineDefaultApproach: 'Increase request timeout threshold to 30s, configure 5 client retries, and trigger HPA auto-scaling to spawn 10 additional API pods.',
        createdDate: '2026-09-22',
        isSample: true,
        itemCount: 6,
        openConflicts: 0
      },
      {
        incidentId: 'inc-worker-oom',
        title: 'Batch Worker Pods OOMKilled During Financial Exports',
        service: 'ledger-export-worker',
        severity: 'P2',
        status: 'investigating',
        description: 'Nightly batch export jobs running on Kubernetes worker pods get terminated by Linux OOM killer midway through processing large corporate account histories.',
        symptoms: [
          'Container terminated with exit code 137 (OOMKilled)',
          'Memory consumption spikes linearly up to 2Gi container cgroup limit',
          'Export job restarts 3 times before failing the airflow DAG'
        ],
        officialSop: 'Official Runbook v1.4: Double container resource limits in deployment YAML from 2Gi to 4Gi or 8Gi memory when jobs fail with exit code 137.',
        baselineDefaultApproach: 'Bump the memory limit from 2Gi to 8Gi in Kubernetes pod deployment specification.',
        createdDate: '2026-09-23',
        isSample: true,
        itemCount: 4,
        openConflicts: 0
      },
      {
        incidentId: 'inc-graphql-timeouts',
        title: 'Intermittent 504 Timeouts on GraphQL Aggregation Gateway',
        service: 'graphql-federation-gateway',
        severity: 'P2',
        status: 'investigating',
        description: 'Mobile clients experience intermittent 504 Gateway Timeouts when loading user home feed dashboard containing complex nested relationships.',
        symptoms: [
          'Occasional 504 Gateway Timeouts at ingress reverse proxy',
          'Node.js Apollo Gateway event loop lag spikes above 2,000ms',
          'Memory usage remains stable, CPU reaches 95% on single threads'
        ],
        officialSop: 'Official Runbook v2.1: Increase NGINX reverse-proxy proxy_read_timeout from 60s to 120s to allow deep queries sufficient execution time.',
        baselineDefaultApproach: 'Increase gateway proxy_read_timeout and proxy_connect_timeout to 120s.',
        createdDate: '2026-09-24',
        isSample: true,
        itemCount: 3,
        openConflicts: 0
      }
    ],
    memories: [
      {
        itemId: 'mem-101',
        incidentId: 'inc-payment-latency',
        category: 'failed_attempt',
        text: 'Attempted to increase retry count from 2 to 5 with 1s backoff during high traffic.',
        attempt: 'Increase retry count to 5',
        result: 'failure',
        failureReason: 'Additional retries created a severe retry storm. Postgres connection pool instantly saturated at 100/100 connections, lock wait queues overflowed, and API latency degraded further from 4.5s to complete downtime.',
        lesson: 'For high-traffic API latency, never increase retries without checking connection saturation. Retries on saturated backends cause self-inflicted DDoS.',
        symptoms: ['Request latency increased', 'Postgres connection pool saturated'],
        speaker: 'Sarah Chen (Staff SRE)',
        date: '2026-09-22',
        tier: 'corroborated',
        proofCount: 2,
        status: 'current'
      },
      {
        itemId: 'mem-102',
        incidentId: 'inc-payment-latency',
        category: 'failed_attempt',
        text: 'Farah tested aggressive retries on the checkout route during the June quarter-end traffic spike. Retries multiplied database lock contention on the transactions table and crashed the replica.',
        attempt: 'Retry checkout requests on timeout',
        result: 'failure',
        failureReason: 'Retrying un-shed requests multiplied DB lock contention on the transactions table, triggering replica replication lag and eventual crash.',
        lesson: 'Do not retry write transactions during database saturation. Implement circuit breakers and shed load immediately.',
        speaker: 'Farah Khan (Platform Engineer)',
        date: '2026-06-30',
        tier: 'corroborated',
        proofCount: 2,
        status: 'current'
      },
      {
        itemId: 'mem-103',
        incidentId: 'inc-payment-latency',
        category: 'failed_attempt',
        text: 'Attempted to increase HTTP client request timeout from 5s to 30s in the gateway.',
        attempt: 'Increase client timeout to 30s',
        result: 'failure',
        failureReason: 'Holding slow connections open for 30s caused connection thread pool exhaustion at the Node.js API layer. Ingress ran out of file descriptors, rejecting 100% of incoming healthy traffic.',
        lesson: 'Increasing timeouts when dependencies are stalled merely compounds connection holding time and exhausts reverse proxy worker threads.',
        speaker: 'Sarah Chen (Staff SRE)',
        date: '2026-09-22',
        tier: 'single',
        proofCount: 1,
        status: 'current'
      },
      {
        itemId: 'mem-104',
        incidentId: 'inc-payment-latency',
        category: 'successful_approach',
        text: 'Optimized database connection pooling via PgBouncer transaction pooling mode and offloaded payment capture notifications to an asynchronous BullMQ background queue.',
        attempt: 'PgBouncer connection pooling and async job queue',
        result: 'success',
        successfulApproach: 'Configured PgBouncer transaction pooling with max 25 dedicated backend connections, enabled circuit breaker (fails fast if latency > 800ms for 5 consecutive requests), and offloaded non-critical accounting webhooks to asynchronous queues.',
        lesson: 'Keep synchronous request transactions under 80ms by decoupling writes into background queues, and limit raw DB connections strictly via pooling proxies.',
        speaker: 'Alex Mercer (Lead Backend Engineer)',
        date: '2026-09-23',
        tier: 'single',
        proofCount: 1,
        status: 'current'
      },
      {
        itemId: 'mem-105',
        incidentId: 'inc-payment-latency',
        category: 'dependency',
        text: 'The billing settlement batch from banking partner finishes at 2:00 AM. If settlement sync runs during flash sale periods, lock contention on ledger balances spikes 10x.',
        speaker: 'Sarah Chen (Staff SRE)',
        date: '2026-09-23',
        tier: 'single',
        proofCount: 1,
        status: 'current'
      },
      {
        itemId: 'mem-106',
        incidentId: 'inc-payment-latency',
        category: 'failure_lesson',
        text: 'In July, auto-scaling API pods during a database bottleneck caused 30 new pods to each open 10 DB connections, immediately taking down the primary PostgreSQL instance.',
        speaker: 'Sarah Chen (Staff SRE)',
        date: '2026-09-23',
        tier: 'single',
        proofCount: 1,
        status: 'current'
      },
      // Worker OOM memories
      {
        itemId: 'mem-201',
        incidentId: 'inc-worker-oom',
        category: 'failed_attempt',
        text: 'Bumping container memory limits from 2Gi to 8Gi only delayed the crash by 8 minutes. The worker still ran out of memory on 1.2M row exports.',
        attempt: 'Increase Kubernetes pod memory limit to 8Gi',
        result: 'failure',
        failureReason: 'The export script was executing JSON.stringify() on the entire raw array in V8 heap memory. V8 heap exhausted regardless of container cgroup allocation.',
        lesson: 'Memory limit increases do not fix unbounded heap accumulation. Streaming parsers and cursors are mandatory for batch jobs.',
        speaker: 'David Kim (Data Platform)',
        date: '2026-09-18',
        tier: 'single',
        proofCount: 1,
        status: 'current'
      },
      {
        itemId: 'mem-202',
        incidentId: 'inc-worker-oom',
        category: 'successful_approach',
        text: 'Replaced bulk array buffering with PostgreSQL server-side cursor and Node.js stream pipeline directly to S3 gzip stream with bounded backpressure.',
        attempt: 'Stream database cursor to S3 pipeline',
        result: 'success',
        successfulApproach: 'Used pg-query-stream with 1,000 row batch chunks piped directly through zlib into AWS S3 multipart upload. Memory remained flat at 180MB regardless of row count.',
        lesson: 'Use server-side cursors and stream pipelines for all data export jobs exceeding 10,000 rows.',
        speaker: 'David Kim (Data Platform)',
        date: '2026-09-20',
        tier: 'single',
        proofCount: 1,
        status: 'current'
      },
      // GraphQL Gateway memories
      {
        itemId: 'mem-301',
        incidentId: 'inc-graphql-timeouts',
        category: 'failed_attempt',
        text: 'Increasing NGINX proxy_read_timeout from 60s to 120s caused upstream connection backpressure to freeze the gateway event loop.',
        attempt: 'Increase NGINX proxy read timeout to 120s',
        result: 'failure',
        failureReason: 'Long timeouts allowed malicious or nested circular queries to monopolize V8 event loop cycles, starving health check pings and causing Kubernetes readiness probe failures.',
        lesson: 'Never increase gateway timeouts to handle heavy queries. Enforce query depth and complexity limits at the GraphQL schema validation layer.',
        speaker: 'Elena Rostova (API Gateway Lead)',
        date: '2026-09-15',
        tier: 'single',
        proofCount: 1,
        status: 'current'
      },
      {
        itemId: 'mem-302',
        incidentId: 'inc-graphql-timeouts',
        category: 'successful_approach',
        text: 'Added graphql-depth-limit (max depth 6) and graphql-query-complexity (max score 250) with Redis caching for user feed queries.',
        attempt: 'GraphQL query complexity limiter and Redis caching',
        result: 'success',
        successfulApproach: 'Queries exceeding depth 6 or complexity 250 are rejected before execution. Common public feed fragments cached in Redis with 30s TTL.',
        lesson: 'Protect aggregation gateways with strict AST complexity scoring and short-lived caching.',
        speaker: 'Elena Rostova (API Gateway Lead)',
        date: '2026-09-17',
        tier: 'single',
        proofCount: 1,
        status: 'current'
      }
    ],
    conflicts: []
  };
}

export const store = new Store();
