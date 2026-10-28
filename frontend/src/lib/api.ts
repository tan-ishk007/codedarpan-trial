import type {
  AnalysisFileResponse,
  AnalysisGraphResponse,
  AnalysisHealthResponse,
  AnalysisImpactResponse,
  AnalysisIssuesResponse,
  AnalysisOnboardingResponse,
  AnalysisRunResponse,
  AnalysisSearchResponse,
  ApiErrorKind,
  ApiPayload,
  AnalysisSubmissionResponse,
  GitHubAnalysisRequest,
  ImpactOptions,
  OnboardingOptions,
  PullRequestImpactRequest,
  PullRequestImpactResponse,
  SearchAnalysisOptions,
} from '../types';

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | JsonRequestBody | null;
}

export interface JsonRequestBody {
  readonly __json: true;
  readonly value: unknown;
}

export const jsonBody = (value: unknown): JsonRequestBody => ({ __json: true, value });

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly responseBody?: string;
  override readonly cause?: unknown;

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: { status?: number; responseBody?: string; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options.status;
    this.responseBody = options.responseBody;
    this.cause = options.cause;
  }
}

function isJsonContentType(contentType: string | null): boolean {
  return !!contentType && /(?:application\/json|\+json)(?:\s*;|$)/i.test(contentType);
}

function serverMessage(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return undefined;
  const record = payload as Record<string, unknown>;
  for (const key of ['message', 'error', 'detail']) {
    if (typeof record[key] === 'string' && record[key].trim()) return record[key].trim();
  }
  return undefined;
}

async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch (cause) {
    throw new ApiError('network', 'The API response could not be read.', { cause, status: response.status });
  }
}

/**
 * Send a same-origin request and require a non-empty JSON object or array response.
 * No fixture or other fallback is used when the API is unavailable.
 */
export async function apiRequest<T extends ApiPayload = ApiPayload>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers: suppliedHeaders, ...init } = options;
  const headers = new Headers(suppliedHeaders);
  if (typeof window !== 'undefined') {
    const token = window.sessionStorage.getItem('codedarpan.auth.token');
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  }
  let requestBody: BodyInit | null | undefined;

  if (body && typeof body === 'object' && '__json' in body && body.__json === true) {
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body.value);
  } else {
    requestBody = body as BodyInit | null | undefined;
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers, body: requestBody });
  } catch (cause) {
    throw new ApiError('network', 'Could not reach the analyzer API.', { cause });
  }

  const text = await readResponseText(response);
  let parsed: unknown;
  let parsedSuccessfully = false;
  if (text.trim() && isJsonContentType(response.headers.get('content-type'))) {
    try {
      parsed = JSON.parse(text) as unknown;
      parsedSuccessfully = true;
    } catch {
      // Classified below as a non-JSON response despite the advertised content type.
    }
  }

  if (!response.ok) {
    const kind: ApiErrorKind = response.status === 404
      ? 'not-found'
      : response.status === 429
        ? 'rate-limit'
        : 'http';
    const defaultMessage = response.status === 404
      ? 'The requested analyzer API route or resource was not found.'
      : response.status === 429
        ? 'The analyzer API rate limit was reached. Try again later.'
        : `The analyzer API returned HTTP ${response.status}.`;
    throw new ApiError(kind, (parsedSuccessfully && serverMessage(parsed)) || defaultMessage, {
      status: response.status,
      responseBody: text || undefined,
    });
  }

  if (!text.trim()) {
    throw new ApiError('empty-response', 'The analyzer API returned an empty response.', { status: response.status });
  }
  if (!isJsonContentType(response.headers.get('content-type')) || !parsedSuccessfully) {
    throw new ApiError('non-json', 'The analyzer API returned a non-JSON response.', {
      status: response.status,
      responseBody: text,
    });
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new ApiError('unsupported-response', 'The analyzer API returned an unsupported JSON payload.', {
      status: response.status,
      responseBody: text,
    });
  }
  if (!Array.isArray(parsed) && Object.keys(parsed).length === 0) {
    throw new ApiError('unsupported-response', 'The analyzer API returned an empty JSON object.', {
      status: response.status,
      responseBody: text,
    });
  }

  return parsed as T;
}

function unsupportedShape(message: string): never {
  throw new ApiError('unsupported-response', `The analyzer API returned an unsupported response shape: ${message}.`, { status: 200 });
}

function payloadRecord(payload: ApiPayload, endpoint: string): Record<string, unknown> {
  if (Array.isArray(payload)) return unsupportedShape(`${endpoint} must return a JSON object`);
  return payload as Record<string, unknown>;
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function requireArray(record: Record<string, unknown>, key: string, endpoint: string): unknown[] {
  if (!Array.isArray(record[key])) return unsupportedShape(`${endpoint}.${key} must be an array`);
  return record[key];
}

function requestWithSchema<T extends ApiPayload>(
  path: string,
  options: ApiRequestOptions,
  validate: (payload: ApiPayload) => void,
): Promise<T> {
  return apiRequest<ApiPayload>(path, options).then((payload) => {
    validate(payload);
    return payload as T;
  });
}

function validateSubmission(payload: ApiPayload): void {
  const value = payloadRecord(payload, 'POST /api/analyses');
  if (!hasNonEmptyString(value.runId)) unsupportedShape('POST /api/analyses.runId must be a non-empty string');
  if (value.status !== undefined && !hasNonEmptyString(value.status)) unsupportedShape('POST /api/analyses.status must be a non-empty string when present');
}

function validateAnalysis(payload: ApiPayload): void {
  const value = payloadRecord(payload, 'GET /api/analyses/:runId');
  if (!hasNonEmptyString(value.status)) unsupportedShape('GET /api/analyses/:runId.status must be a non-empty string');
  if (value.warnings !== undefined && !Array.isArray(value.warnings)) unsupportedShape('GET /api/analyses/:runId.warnings must be an array when present');
  if (value.summary !== undefined && (typeof value.summary !== 'object' || value.summary === null || Array.isArray(value.summary))) unsupportedShape('GET /api/analyses/:runId.summary must be an object when present');
  for (const key of ['fileCount', 'nodeCount', 'edgeCount', 'durationMs']) if (value[key] !== undefined && (typeof value[key] !== 'number' || !Number.isFinite(value[key]))) unsupportedShape(`GET /api/analyses/:runId.${key} must be a number when present`);
}

function validateGraph(payload: ApiPayload): void {
  const value = payloadRecord(payload, 'GET /api/analyses/:runId/graph');
  const nodes = requireArray(value, 'nodes', 'graph');
  const edges = requireArray(value, 'edges', 'graph');
  requireArray(value, 'groups', 'graph');
  nodes.forEach((node, index) => {
    if (typeof node !== 'object' || node === null || Array.isArray(node)) unsupportedShape(`graph.nodes[${index}] must be an object`);
    const item = node as Record<string, unknown>;
    if (!hasNonEmptyString(item.id) && !hasNonEmptyString(item.nodeId)) unsupportedShape(`graph.nodes[${index}] must contain id or nodeId`);
  });
  edges.forEach((edge, index) => {
    if (typeof edge !== 'object' || edge === null || Array.isArray(edge)) unsupportedShape(`graph.edges[${index}] must be an object`);
    const item = edge as Record<string, unknown>;
    const from = item.source ?? item.from ?? item.sourceId ?? item.sourceNodeId;
    const to = item.target ?? item.to ?? item.targetId ?? item.targetNodeId;
    if (!hasNonEmptyString(from) || !hasNonEmptyString(to)) unsupportedShape(`graph.edges[${index}] must identify both endpoints`);
  });
}

function validateFile(payload: ApiPayload): void {
  const value = payloadRecord(payload, 'GET /api/analyses/:runId/files/:fileId');
  const supported = ['path', 'fileId', 'nodeId', 'name', 'kind', 'language', 'source', 'sourceCode', 'content', 'imports', 'dependents', 'loc', 'linesOfCode', 'tokenCount', 'tokenCountingConvention', 'complexity', 'confidence', 'warnings', 'parserWarnings', 'startLine', 'startLineNumber', 'endLine', 'endLineNumber'];
  if (!supported.some((key) => value[key] !== undefined)) unsupportedShape('file response contains no recognized file, source or relationship fields');
  for (const key of ['path', 'fileId', 'nodeId', 'name', 'kind', 'language', 'source', 'sourceCode', 'content']) {
    if (value[key] !== undefined && typeof value[key] !== 'string') unsupportedShape(`file.${key} must be a string when present`);
  }
  for (const key of ['imports', 'dependents', 'warnings', 'parserWarnings']) {
    if (value[key] !== undefined && !Array.isArray(value[key])) unsupportedShape(`file.${key} must be an array when present`);
  }
  for (const key of ['loc', 'linesOfCode', 'startLine', 'startLineNumber', 'endLine', 'endLineNumber']) {
    if (value[key] !== undefined && (typeof value[key] !== 'number' || !Number.isFinite(value[key]))) unsupportedShape(`file.${key} must be a number when present`);
  }
}

function validateSearch(payload: ApiPayload): void {
  const value = payloadRecord(payload, 'GET /api/analyses/:runId/search');
  const results = requireArray(value, 'results', 'search');
  results.forEach((result, index) => {
    if (typeof result !== 'object' || result === null || Array.isArray(result)) unsupportedShape(`search.results[${index}] must be an object`);
    const item = result as Record<string, unknown>;
    for (const key of ['nodeId', 'name', 'path', 'kind']) if (!hasNonEmptyString(item[key])) unsupportedShape(`search.results[${index}].${key} must be a non-empty string`);
    if (typeof item.line !== 'number' || !Number.isFinite(item.line)) unsupportedShape(`search.results[${index}].line must be a number`);
    if (typeof item.score !== 'number' || !Number.isFinite(item.score)) unsupportedShape(`search.results[${index}].score must be a number`);
  });
}

function validateHealth(payload: ApiPayload): void {
  const value = payloadRecord(payload, 'GET /api/analyses/:runId/health');
  const known = ['score', 'confidence', 'factors', 'findings', 'historyAvailable', 'historyMessage', 'historyUnavailableReason', 'history', 'message', 'caveat', 'churn', 'complexity', 'churnComplexity', 'hotspots', 'cycles'];
  if (!known.some((key) => value[key] !== undefined)) unsupportedShape('health response contains no recognized health evidence');
  for (const key of ['score', 'confidence']) if (value[key] !== undefined && (typeof value[key] !== 'number' || !Number.isFinite(value[key]))) unsupportedShape(`health.${key} must be a number when present`);
  for (const key of ['factors', 'findings', 'hotspots', 'cycles']) if (value[key] !== undefined && !Array.isArray(value[key])) unsupportedShape(`health.${key} must be an array when present`);
  for (const key of ['historyMessage', 'historyUnavailableReason', 'message']) if (value[key] !== undefined && typeof value[key] !== 'string') unsupportedShape(`health.${key} must be a string when present`);
  if (value.historyAvailable !== undefined && typeof value.historyAvailable !== 'boolean') unsupportedShape('health.historyAvailable must be a boolean when present');
}

function validateServiceHealth(payload: ApiPayload): void {
  const value = payloadRecord(payload, 'GET /api/health');
  if (!hasNonEmptyString(value.status)) unsupportedShape('GET /api/health.status must be a non-empty string');
  if (value.service !== undefined && !hasNonEmptyString(value.service)) unsupportedShape('GET /api/health.service must be a non-empty string when present');
  if (value.activeAnalyses !== undefined && (typeof value.activeAnalyses !== 'number' || !Number.isFinite(value.activeAnalyses))) {
    unsupportedShape('GET /api/health.activeAnalyses must be a number when present');
  }
}

function validateOnboarding(payload: ApiPayload): void {
  const value = payloadRecord(payload, 'GET /api/analyses/:runId/onboarding');
  const routeKeys = ['steps', 'route', 'path', 'items'];
  for (const key of routeKeys) if (value[key] !== undefined && !Array.isArray(value[key])) unsupportedShape(`onboarding.${key} must be an array when present`);
  const routeKey = routeKeys.find((key) => Array.isArray(value[key]));
  if (!routeKey) unsupportedShape('onboarding response must contain an ordered steps, route, path or items array');
}

function validateIssues(payload: ApiPayload): void {
  const value = payloadRecord(payload, 'GET /api/analyses/:runId/issues');
  const issueKeys = ['issues', 'results', 'items'];
  for (const key of issueKeys) if (value[key] !== undefined && !Array.isArray(value[key])) unsupportedShape(`issues.${key} must be an array when present`);
  const issueKey = issueKeys.find((key) => Array.isArray(value[key]));
  if (!issueKey) unsupportedShape('issues response must contain an issues, results or items array');
}

function validateImpact(payload: ApiPayload): void {
  const value = payloadRecord(payload, 'GET /api/analyses/:runId/impact');
  const known = ['nodeId', 'depth', 'direct', 'transitive', 'directDependents', 'transitiveDependents', 'dependents', 'changedFiles', 'affectedFiles', 'affectedNodes', 'relatedTests', 'unresolved', 'caveat', 'estimate'];
  if (!known.some((key) => value[key] !== undefined)) unsupportedShape('impact response contains no recognized relationship or estimate fields');
  for (const key of ['directDependents', 'transitiveDependents', 'dependents', 'changedFiles', 'affectedFiles', 'affectedNodes', 'relatedTests', 'unresolved']) {
    if (value[key] !== undefined && !Array.isArray(value[key])) unsupportedShape(`impact.${key} must be an array when present`);
  }
}

function validatePrImpact(payload: ApiPayload): void {
  const value = payloadRecord(payload, 'POST /api/analyses/:runId/pr-impact');
  if (value.pr === undefined || value.pr === null) unsupportedShape('PR impact response must contain pr');
  for (const key of ['changedFiles', 'mappedNodes', 'direct', 'transitive', 'relatedTests', 'unresolved']) requireArray(value, key, 'PR impact');
  if (typeof value.caveat !== 'string') unsupportedShape('PR impact caveat must be a string');
}

const analysisPath = (runId: string): string => `/api/analyses/${encodeURIComponent(runId)}`;

export type ServiceHealthResponse = ApiPayload & {
  status: string;
  service?: string;
  activeAnalyses?: number;
};

export function getServiceHealth(options: ApiRequestOptions = {}): Promise<ServiceHealthResponse> {
  return requestWithSchema<ServiceHealthResponse>('/api/health', options, validateServiceHealth);
}

export function submitGitHubAnalysis(input: GitHubAnalysisRequest): Promise<AnalysisSubmissionResponse> {
  return requestWithSchema('/api/analyses', {
    method: 'POST',
    body: jsonBody({ repositoryUrl: input.repositoryUrl, ...(input.ref !== undefined ? { ref: input.ref } : {}) }),
  }, validateSubmission);
}

export function submitZipAnalysis(file: File): Promise<AnalysisSubmissionResponse> {
  const form = new FormData();
  form.append('file', file);
  return requestWithSchema('/api/analyses', { method: 'POST', body: form }, validateSubmission);
}

export function getAnalysis(runId: string): Promise<AnalysisRunResponse> {
  return requestWithSchema(analysisPath(runId), {}, validateAnalysis);
}

export function streamAnalysisEvents(runId: string): EventSource {
  return new EventSource(`${analysisPath(runId)}/events`);
}

export function getGraph(runId: string, depth = 1): Promise<AnalysisGraphResponse> {
  const query = new URLSearchParams({ view: 'file', depth: String(depth) });
  return requestWithSchema(`${analysisPath(runId)}/graph?${query.toString()}`, {}, validateGraph);
}

export function getFile(runId: string, fileId: string): Promise<AnalysisFileResponse> {
  return requestWithSchema(`${analysisPath(runId)}/files/${encodeURIComponent(fileId)}`, {}, validateFile);
}

export function searchAnalysis(runId: string, options: SearchAnalysisOptions): Promise<AnalysisSearchResponse> {
  const query = new URLSearchParams({ q: options.q });
  if (options.kind !== undefined) query.set('kind', options.kind);
  return requestWithSchema(`${analysisPath(runId)}/search?${query.toString()}`, {}, validateSearch);
}

export function getHealth(runId: string): Promise<AnalysisHealthResponse> {
  return requestWithSchema(`${analysisPath(runId)}/health`, {}, validateHealth);
}

export function getOnboarding(
  runId: string,
  options: OnboardingOptions,
): Promise<AnalysisOnboardingResponse> {
  const query = new URLSearchParams({ role: options.role });
  if (options.issueUrl !== undefined) query.set('issueUrl', options.issueUrl);
  return requestWithSchema(`${analysisPath(runId)}/onboarding?${query.toString()}`, {}, validateOnboarding);
}

export function getIssues(runId: string): Promise<AnalysisIssuesResponse> {
  const query = new URLSearchParams({ labels: 'good-first-issue,help-wanted' });
  return requestWithSchema(`${analysisPath(runId)}/issues?${query.toString()}`, {}, validateIssues);
}

export function getImpact(
  runId: string,
  options: ImpactOptions,
): Promise<AnalysisImpactResponse> {
  const query = new URLSearchParams({ nodeId: options.nodeId, depth: String(options.depth ?? 3) });
  return requestWithSchema(`${analysisPath(runId)}/impact?${query.toString()}`, {}, validateImpact);
}

export function submitPrImpact(
  runId: string,
  input: PullRequestImpactRequest,
): Promise<PullRequestImpactResponse> {
  return requestWithSchema(`${analysisPath(runId)}/pr-impact`, {
    method: 'POST',
    body: jsonBody({ prUrl: input.prUrl }),
  }, validatePrImpact);
}
