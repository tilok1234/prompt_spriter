export type CandidateLane = "intake" | "denied" | "archive";
export type PlaybackMode = "loop" | "once" | "hold-last";

export interface ContractReference {
  id: string;
  version: string;
}

export interface AssetRecord {
  kind: "asset";
  schemaVersion: string;
  id: string;
  name: string;
  category: ContractReference;
  style: ContractReference;
  createdAt: string;
  tags: string[];
}

export interface AnimationLayout {
  id: string;
  startColumn: number;
  frames: number;
  durationMs: number;
  playback: PlaybackMode;
  finalFrameHoldMs?: number;
}

export interface RevisionRecord {
  kind: "revision";
  schemaVersion: string;
  assetId: string;
  id: string;
  parentRevisionId: string | null;
  createdAt: string;
  request: string;
  category: ContractReference;
  style: ContractReference;
  producer: {
    application: string;
    model: string;
    sessionId?: string | null;
  };
  sheet: {
    cellWidth: number;
    cellHeight: number;
    columns: number;
    rows: number;
    width: number;
    height: number;
  };
  directions: string[];
  animations: AnimationLayout[];
  validationReportPath: string;
  batchId: string | null;
}

export interface ReviewNote {
  id: string;
  text: string;
  createdAt: string;
  resolvedAt: string | null;
  target: {
    direction?: string;
    animation?: string;
    frames?: number[];
  };
}

export interface ReviewRecord {
  kind: "review";
  schemaVersion: string;
  assetId: string;
  approvedRevisionId: string | null;
  candidate: {
    revisionId: string;
    lane: CandidateLane;
  } | null;
  notes: ReviewNote[];
  archiveHistory: Array<{
    revisionId: string;
    archivedAt: string;
    restoredAt: string | null;
  }>;
  updatedAt: string;
}

export interface ValidationRecord {
  kind: "validation-report";
  schemaVersion: string;
  jobId: string;
  status:
    | "passed"
    | "passed-with-warnings"
    | "failed"
    | "not-completed";
  checks: Array<{
    code: string;
    level: "info" | "warning" | "error";
    status: "passed" | "warning" | "failed" | "not-assessed";
    message: string;
  }>;
  createdAt: string;
}

export interface ViewerAsset {
  asset: AssetRecord;
  revision: RevisionRecord;
  review: ReviewRecord;
  validation: ValidationRecord;
  sheetUrl: string;
  thumbnailUrl: string;
  origin?: "fixture" | "local-library";
}
