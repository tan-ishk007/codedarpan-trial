/** JSON values accepted from or returned by the same-origin analyzer API. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

/** Successful API payloads are non-empty JSON objects or arrays; route validators narrow them. */
export type ApiPayload = JsonObject | JsonValue[];

export interface GitHubAnalysisRequest {
  repositoryUrl: string;
  ref?: string;
}

export interface SearchAnalysisOptions {
  q: string;
  kind?: string;
}

export interface OnboardingOptions {
  role: string;
  issueUrl?: string;
}

export interface ImpactOptions {
  nodeId: string;
  depth?: number;
}

export interface PullRequestImpactRequest {
  prUrl: string;
}

/** POST /api/analyses returns a run identifier and initial service state. */
export interface AnalysisSubmissionResponse extends JsonObject {
  runId: string;
  status?: string;
}

/** GET /api/analyses/:runId snapshot; optional summary fields remain evidence-only. */
export interface AnalysisRunResponse extends JsonObject {
  status: string;
  runId?: string;
  repository?: string;
  repositoryUrl?: string;
  name?: string;
  revision?: string;
  ref?: string;
  commit?: string;
  fileCount?: number;
  nodeCount?: number;
  edgeCount?: number;
  duration?: JsonPrimitive;
  durationMs?: number;
  warnings?: JsonValue[];
  summary?: JsonObject;
  stage?: string;
  progress?: JsonValue;
  message?: string;
}

export interface AnalysisEventsResponse extends JsonObject {
  stage?: string;
  progress?: JsonValue;
  status?: string;
  message?: string;
}

export interface AnalysisGraphResponse extends JsonObject {
  nodes: JsonValue[];
  edges: JsonValue[];
  groups: JsonValue[];
}

export interface AnalysisFileResponse extends JsonObject {
  fileId?: string;
  nodeId?: string;
  path?: string;
  name?: string;
  kind?: string;
  language?: string;
  source?: string;
  sourceCode?: string;
  content?: string;
  startLine?: number;
  startLineNumber?: number;
  endLine?: number;
  endLineNumber?: number;
  tokenCount?: JsonValue;
  tokenCountingConvention?: JsonValue;
  loc?: number;
  linesOfCode?: number;
  complexity?: JsonValue;
  confidence?: JsonValue;
  warnings?: JsonValue[];
  parserWarnings?: JsonValue[];
  imports?: JsonValue[];
  dependents?: JsonValue[];
}

export interface AnalysisSearchResult extends JsonObject {
  nodeId: string;
  name: string;
  path: string;
  kind: string;
  line: number;
  score: number;
}

export interface AnalysisSearchResponse extends JsonObject {
  results: AnalysisSearchResult[];
}

export interface AnalysisHealthResponse extends JsonObject {
  score?: number;
  confidence?: number;
  factors?: JsonValue[];
  findings?: JsonValue[];
  historyAvailable?: boolean;
  historyMessage?: string;
  historyUnavailableReason?: string;
  history?: JsonValue;
  message?: string;
  caveat?: JsonValue;
  churn?: JsonValue;
  complexity?: JsonValue;
  churnComplexity?: JsonValue;
  hotspots?: JsonValue[];
  cycles?: JsonValue[];
}

/** The detailed contributor-step item schema is backend-defined; the top-level route must be ordered. */
export interface AnalysisOnboardingResponse extends JsonObject {
  steps?: JsonValue[];
  route?: JsonValue[];
  path?: JsonValue[];
  items?: JsonValue[];
  issues?: JsonValue[];
}

export interface AnalysisIssuesResponse extends JsonObject {
  issues?: JsonValue[];
  results?: JsonValue[];
  items?: JsonValue[];
}

/** The precise selected-file impact details are backend-defined; only named returned fields render. */
export interface AnalysisImpactResponse extends JsonObject {
  nodeId?: string;
  depth?: number;
  direct?: JsonValue;
  transitive?: JsonValue;
  directDependents?: JsonValue[];
  transitiveDependents?: JsonValue[];
  dependents?: JsonValue[];
  changedFiles?: JsonValue[];
  affectedFiles?: JsonValue[];
  affectedNodes?: JsonValue[];
  relatedTests?: JsonValue[];
  unresolved?: JsonValue[];
  caveat?: JsonValue;
  estimate?: JsonValue;
}

/** Documented POST /api/analyses/:runId/pr-impact response. */
export interface PullRequestImpactResponse extends JsonObject {
  pr: JsonValue;
  changedFiles: JsonValue[];
  mappedNodes: JsonValue[];
  direct: JsonValue[];
  transitive: JsonValue[];
  relatedTests: JsonValue[];
  unresolved: JsonValue[];
  caveat: string;
}

export type ApiErrorKind =
  | 'network'
  | 'not-found'
  | 'rate-limit'
  | 'http'
  | 'non-json'
  | 'empty-response'
  | 'unsupported-response';
