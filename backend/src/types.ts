export type MemoryTier = 'single' | 'corroborated';
export type MemoryStatus = 'current' | 'superseded';
export type MemoryCategory = 
  | 'failure_lesson' 
  | 'failed_attempt' 
  | 'successful_approach' 
  | 'dependency' 
  | 'anti_pattern' 
  | 'official_sop';

export interface MemoryHistoryItem {
  date: string;
  note: string;
  supersededBy?: string;
}

export interface StoredMemory {
  itemId: string;
  incidentId: string;
  category: MemoryCategory;
  text: string;
  attempt?: string;
  result?: 'failure' | 'success';
  failureReason?: string;
  successfulApproach?: string;
  lesson?: string;
  symptoms?: string[];
  speaker: string;
  date: string;
  tier: MemoryTier;
  status: MemoryStatus;
  history?: MemoryHistoryItem[];
  proofCount?: number;
}

export interface IncidentSummary {
  incidentId: string;
  title: string;
  service: string;
  severity: 'P1' | 'P2' | 'P3';
  status: 'active' | 'resolved' | 'investigating';
  description: string;
  symptoms: string[];
  officialSop: string;
  baselineDefaultApproach: string;
  createdDate: string;
  isSample: boolean;
  itemCount: number;
  openConflicts: number;
}

export interface ConflictRecord {
  conflictId: string;
  incidentId: string;
  topic: string;
  existing: {
    itemId: string;
    text: string;
    speaker: string;
    date: string;
  };
  newReport: {
    text: string;
    speaker: string;
    date: string;
    attemptResult?: 'failure' | 'success';
  };
  status: 'open' | 'updated' | 'kept_as_exception';
  resolutionNote?: string;
  resolvedAt?: string;
}

export interface MemorySourceCitation {
  itemId: string;
  excerpt: string;
  speaker: string;
  date: string;
  tier: MemoryTier;
  category: MemoryCategory;
  failureReason?: string;
  lesson?: string;
}

export interface InvestigateResponse {
  answerId: string;
  incidentId: string;
  recommendation: string;
  officialProcess: string;
  actualPractice: string;
  differsFromOfficial: boolean;
  failedStrategiesToAvoid: Array<{
    attempt: string;
    whyFailed: string;
    evidence: string;
  }>;
  suggestedAction: string;
  sources: MemorySourceCitation[];
  gap: boolean;
  conflict: ConflictRecord | null;
  generatedBy: 'hindsight-reflect' | 'groq-primary' | 'groq-secondary' | 'gemini-fallback' | 'baseline' | 'hindsight-engine';
}

export interface AttemptSubmission {
  incidentId: string;
  attempt: string;
  result: 'worked' | 'failed';
  failureReason?: string;
  lesson?: string;
  engineer: string;
  date: string;
}

export interface OutcomeResponse {
  success: boolean;
  retainedItemId?: string;
  conflict?: ConflictRecord | null;
  message: string;
}

export interface ConflictResolutionRequest {
  resolution: 'update' | 'keep_exception';
  resolutionNote?: string;
  engineer?: string;
}
