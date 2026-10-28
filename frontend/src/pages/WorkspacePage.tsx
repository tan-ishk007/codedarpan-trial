import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import hljs from 'highlight.js/lib/common';
import { ArrowLeft, ArrowUpRight, ChevronsUpDown, FileCode2, GitBranch, GitFork, LoaderCircle, Maximize2, RotateCcw, Search, ShieldAlert, Sparkles, Waypoints } from 'lucide-react';
import { ApiError, getAnalysis, getFile, getGraph, getHealth, getImpact, getIssues, getOnboarding, searchAnalysis, streamAnalysisEvents, submitPrImpact } from '../lib/api';
import { AtlasGraph, type GraphEdge, type GraphNode } from '../components/graph/AtlasGraph';
import { FileTree } from '../components/explorer/FileTree';
import { Brand } from '../components/Brand';
import { StatusNotice } from '../components/StatusNotice';
import { HealthEvidencePanel } from '../components/evidence/HealthEvidencePanel';
import { ImpactEvidencePanel } from '../components/evidence/ImpactEvidencePanel';
import { OnboardingEvidencePanel } from '../components/evidence/OnboardingEvidencePanel';
import { linkedGraphNodes } from '../components/evidence/EvidencePrimitives';
import { demoEdges, demoEvidence, demoNodes, demoSources } from '../data/demo';
import { isActiveAnalysisStatus } from '../lib/analysisStatus';

type RecordValue = Record<string, unknown>;
type SearchHit = { nodeId: string; name: string; path: string; kind: string; line?: number };
type WorkspaceMode = 'explore' | 'diagnose' | 'onboard' | 'impact';
type MobilePane = 'files' | 'atlas' | 'details';
type RelationKind = 'imports' | 'calls' | 'other';
type GraphFilters = { language: string; kind: string; directory: string; complexity: string };
const LARGE_GRAPH_NOTICE_THRESHOLD = 250;

function isWorkspaceMode(value: string | null | undefined): value is WorkspaceMode {
  return value === 'explore' || value === 'diagnose' || value === 'onboard' || value === 'impact';
}

function record(value: unknown): RecordValue | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as RecordValue : null;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeGraph(payload: unknown): { nodes: GraphNode[]; edges: GraphEdge[]; error?: string } {
  const graph = record(payload);
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return { nodes: [], edges: [], error: 'The graph response did not contain the documented nodes and edges collections.' };
  }
  const nodes: GraphNode[] = graph.nodes.flatMap((entry) => {
    const value = record(entry);
    if (!value) return [];
    const id = text(value.id) ?? text(value.nodeId);
    if (!id) return [];
    const path = text(value.path) ?? text(value.name) ?? id;
    const name = text(value.name) ?? path.split('/').pop() ?? id;
    return [{ id, path, name, kind: text(value.kind) ?? text(value.type) ?? 'node', language: text(value.language), complexity: num(value.complexity), loc: num(value.loc) }];
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: GraphEdge[] = graph.edges.flatMap((entry, index) => {
    const value = record(entry);
    if (!value) return [];
    const source = text(value.source) ?? text(value.from) ?? text(value.sourceId) ?? text(value.sourceNodeId);
    const target = text(value.target) ?? text(value.to) ?? text(value.targetId) ?? text(value.targetNodeId);
    if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) return [];
    const returnedKind = text(value.kind) ?? text(value.type);
    const normalizedKind = returnedKind?.toLowerCase();
    const kind = normalizedKind === 'import' || normalizedKind === 'imports'
      ? 'imports'
      : normalizedKind === 'call' || normalizedKind === 'calls'
        ? 'calls'
        : 'other';
    const id = text(value.id) ?? `${source}->${target}:${index}`;
    return [{ id, source, target, kind }];
  });
  if (graph.nodes.length > 0 && !nodes.length) return { nodes, edges, error: 'The graph response returned no usable file-node identifiers.' };
  return { nodes, edges };
}

function getReturnedString(value: RecordValue | null, keys: string[]): string | undefined {
  if (!value) return undefined;
  for (const key of keys) {
    const result = text(value[key]);
    if (result) return result;
  }
  return undefined;
}

function getRecordField(value: RecordValue | null, keys: string[]): unknown {
  if (!value) return undefined;
  for (const key of keys) if (value[key] !== undefined && value[key] !== null) return value[key];
  return undefined;
}

function returnedRelationshipItems(value: unknown): string[] | null {
  if (value === undefined || value === null) return null;
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) return [item.trim()];
    const entry = record(item);
    const label = getReturnedString(entry, ['path', 'name', 'nodeId', 'id']);
    return label ? [label] : [];
  });
}

function explainError(error: unknown): string {
  return error instanceof ApiError ? error.message : 'The analyzer response could not be read.';
}

function renderValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 2) ?? 'Unavailable';
}

function highlightedCode(code: string, language?: string): string {
  try {
    if (language) {
      const supported = hljs.getLanguage(language.toLowerCase());
      if (supported) return hljs.highlight(code, { language: language.toLowerCase(), ignoreIllegals: true }).value;
    }
    return hljs.highlightAuto(code).value;
  } catch {
    return hljs.highlightAuto(code).value;
  }
}

export default function WorkspacePage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const runId = params.get('runId');
  const demoMode = params.get('demo') === '1';
  const requestedMode = params.get('mode');
  const routeMode = location.pathname.split('/').filter(Boolean).pop();
  const initialMode: WorkspaceMode = isWorkspaceMode(requestedMode) ? requestedMode : isWorkspaceMode(routeMode) ? routeMode : 'explore';
  const [mode, setMode] = useState<WorkspaceMode>(demoMode ? initialMode : 'explore');
  const [mobilePane, setMobilePane] = useState<MobilePane>(demoMode && initialMode !== 'explore' ? 'details' : 'atlas');
  const [selectedId, setSelectedId] = useState(demoMode ? demoNodes[0]?.id ?? '' : '');
  const [depth, setDepth] = useState(1);
  const [fitKey, setFitKey] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [focusId, setFocusId] = useState('');
  const [focusKey, setFocusKey] = useState(0);
  const [fileFilter, setFileFilter] = useState('');
  const [relationFilters, setRelationFilters] = useState<Record<RelationKind, boolean>>({ imports: true, calls: true, other: true });
  const [graphFilters, setGraphFilters] = useState<GraphFilters>({ language: 'all', kind: 'all', directory: 'all', complexity: 'all' });
  const [snapshot, setSnapshot] = useState<RecordValue | null>(null);
  const snapshotRef = useRef<RecordValue | null>(null);
  const [eventRefreshTick, setEventRefreshTick] = useState(0);
  const [eventNotice, setEventNotice] = useState('');
  const [nodes, setNodes] = useState<GraphNode[]>(demoMode ? demoNodes : []);
  const [edges, setEdges] = useState<GraphEdge[]>(demoMode ? demoEdges : []);
  const [workspaceLoading, setWorkspaceLoading] = useState(!demoMode && !!runId);
  const [graphLoading, setGraphLoading] = useState(!demoMode && !!runId);
  const [workspaceError, setWorkspaceError] = useState('');
  const [graphError, setGraphError] = useState('');
  const [sourceRecord, setSourceRecord] = useState<RecordValue | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState('');
  const [panelEvidence, setPanelEvidence] = useState<unknown>(null);
  const [issues, setIssues] = useState<unknown>(null);
  const [prUrl, setPrUrl] = useState('');
  const [prLoading, setPrLoading] = useState(false);
  const [prError, setPrError] = useState('');
  const [prEvidence, setPrEvidence] = useState<unknown>(null);
  const [onboardingRole, setOnboardingRole] = useState('contributor');
  const [onboardingIssueUrl, setOnboardingIssueUrl] = useState('');
  const [onboardingRequest, setOnboardingRequest] = useState<{ role: string; issueUrl?: string }>({ role: 'contributor' });

  useEffect(() => {
    snapshotRef.current = null;
    setSnapshot(null);
    setEventNotice('');
    setSelectedId(demoMode ? demoNodes[0]?.id ?? '' : '');
    setFocusId('');
    setFileFilter('');
    setNodes(demoMode ? demoNodes : []);
    setEdges(demoMode ? demoEdges : []);
    setWorkspaceError('');
    setGraphError('');
    setSourceRecord(null);
    setSourceError('');
    setSearchQuery('');
    setSubmittedSearch('');
    setSearchHits([]);
    setSearchError('');
    setSearchLoading(false);
    setPanelEvidence(null);
    setIssues(null);
    setPanelError('');
    setPrUrl('');
    setPrError('');
    setPrEvidence(null);
    if (demoMode) {
      const demoSnapshot = { repository: 'sample/atlas-lab', revision: 'illustrative fixture', status: 'sample data' };
      snapshotRef.current = demoSnapshot;
      setSnapshot(demoSnapshot);
      setWorkspaceLoading(false);
      setGraphLoading(false);
      return;
    }
    if (!runId) {
      setWorkspaceLoading(false);
      setGraphLoading(false);
      setWorkspaceError('No analysis was selected. Start at the landing page or explicitly open the sample atlas.');
      return;
    }
    let active = true;
    setWorkspaceLoading(true);
    getAnalysis(runId).then((payload) => {
      if (!active) return;
      const nextSnapshot = record(payload);
      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
      if (nextSnapshot) setEventRefreshTick((current) => current + 1);
    }).catch((error: unknown) => {
      if (active) setWorkspaceError(explainError(error));
    }).finally(() => {
      if (active) setWorkspaceLoading(false);
    });
    return () => { active = false; };
  }, [runId, demoMode]);

  useEffect(() => {
    setMode(initialMode);
    setMobilePane(initialMode !== 'explore' ? 'details' : 'atlas');
  }, [initialMode, demoMode]);

  useEffect(() => {
    if (demoMode) {
      setNodes(demoNodes);
      setEdges(demoEdges);
      setGraphError('');
      setGraphLoading(false);
      return;
    }
    if (!runId) {
      setGraphLoading(false);
      return;
    }
    let active = true;
    setGraphLoading(true);
    setGraphError('');
    getGraph(runId, depth).then((payload) => {
      if (!active) return;
      const normalized = normalizeGraph(payload);
      setNodes(normalized.nodes);
      setEdges(normalized.edges);
      setGraphError(normalized.error ?? '');
      if (normalized.nodes.length) {
        setSelectedId((current) => normalized.nodes.some((node) => node.id === current) ? current : normalized.nodes[0].id);
      } else {
        setSelectedId('');
        setSourceRecord(null);
        setSourceError('');
      }
    }).catch((error: unknown) => {
      if (active) setGraphError(explainError(error));
    }).finally(() => {
      if (active) setGraphLoading(false);
    });
    return () => { active = false; };
  }, [runId, demoMode, depth]);

  useEffect(() => {
    if (demoMode || !runId || !selectedId || mode !== 'explore') return;
    let active = true;
    setSourceLoading(true);
    setSourceError('');
    getFile(runId, selectedId).then((payload) => {
      if (active) setSourceRecord(record(payload));
    }).catch((error: unknown) => {
      if (active) {
        setSourceRecord(null);
        setSourceError(explainError(error));
      }
    }).finally(() => { if (active) setSourceLoading(false); });
    return () => { active = false; };
  }, [runId, demoMode, selectedId, mode]);

  useEffect(() => {
    if (demoMode || !runId || mode === 'explore') {
      setPanelEvidence(null);
      setIssues(null);
      setPanelError('');
      setPanelLoading(false);
      return;
    }
    let active = true;
    setPanelLoading(true);
    setPanelError('');
    setPanelEvidence(null);
    setIssues(null);
    const load = async () => {
      try {
        if (mode === 'diagnose') {
          const payload = await getHealth(runId);
          if (active) setPanelEvidence(payload);
        } else if (mode === 'onboard') {
          const [routeResult, issueResult] = await Promise.allSettled([
            getOnboarding(runId, onboardingRequest),
            getIssues(runId),
          ]);
          if (!active) return;
          if (routeResult.status === 'fulfilled') setPanelEvidence(routeResult.value);
          else setPanelError(`Onboarding path unavailable: ${explainError(routeResult.reason)}`);
          if (issueResult.status === 'fulfilled') setIssues(issueResult.value);
          else setPanelError((old) => old ? `${old} Public issues unavailable: ${explainError(issueResult.reason)}` : `Public issues unavailable: ${explainError(issueResult.reason)}`);
        } else if (mode === 'impact' && selectedId) {
          const payload = await getImpact(runId, { nodeId: selectedId, depth: 3 });
          if (active) setPanelEvidence(payload);
        }
      } catch (error) {
        if (active) setPanelError(explainError(error));
      } finally {
        if (active) setPanelLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [runId, demoMode, mode, selectedId, onboardingRequest]);

  useEffect(() => {
    if (demoMode || !runId || eventRefreshTick === 0) return;
    const initialStatus = getReturnedString(snapshotRef.current, ['status']);
    if (!isActiveAnalysisStatus(initialStatus)) return;
    let active = true;
    let pollTimer: number | null = null;
    let stream: EventSource;
    const terminal = (status: string | undefined) => !!status && /ready|complete|completed|failed|cancelled|succeeded|success|error|done/i.test(status);
    const stopPolling = () => {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    };
    const refreshStatus = async () => {
      try {
        const latest = record(await getAnalysis(runId));
        if (!active || !latest) return;
        snapshotRef.current = latest;
        setSnapshot(latest);
        const latestStatus = getReturnedString(latest, ['status']);
        if (terminal(latestStatus)) {
          stopPolling();
          stream.close();
          setEventNotice('The final analysis status was refreshed from the analyzer.');
        }
      } catch (error) {
        if (active) setEventNotice(`The event stream disconnected; status polling is active. Latest refresh failed: ${explainError(error)}`);
      }
    };
    const beginPolling = () => {
      stream.close();
      if (pollTimer !== null) return;
      setEventNotice('Live event updates are unavailable or unsupported. Checking the documented analysis status endpoint every five seconds.');
      void refreshStatus();
      pollTimer = window.setInterval(() => { void refreshStatus(); }, 5000);
    };
    try {
      stream = streamAnalysisEvents(runId);
    } catch {
      stream = { close: () => undefined } as EventSource;
      beginPolling();
    }
    const handleMessage: EventListener = (rawEvent) => {
      try {
        const event = rawEvent as MessageEvent<string>;
        const updateRecord = record(JSON.parse(event.data) as unknown);
        if (!updateRecord || !['stage', 'progress', 'status', 'message'].some((key) => key in updateRecord)) {
          setEventNotice('An unrecognized analyzer event was ignored; no progress or evidence was inferred.');
          beginPolling();
          return;
        }
        for (const key of ['stage', 'status', 'message']) {
          if (updateRecord[key] !== undefined && typeof updateRecord[key] !== 'string') {
            setEventNotice('An analyzer event had an unsupported shape and was ignored.');
            beginPolling();
            return;
          }
        }
        const nextSnapshot = { ...(snapshotRef.current ?? {}), ...updateRecord };
        snapshotRef.current = nextSnapshot;
        setSnapshot(nextSnapshot);
        const eventStatus = getReturnedString(updateRecord, ['status']);
        if (terminal(eventStatus)) {
          stream.close();
          stopPolling();
        }
      } catch {
        setEventNotice('An unreadable analyzer event was ignored; the last returned status remains visible.');
        beginPolling();
      }
    };
    stream.onmessage = handleMessage;
    for (const eventName of ['stage', 'progress', 'status', 'update']) stream.addEventListener(eventName, handleMessage);
    stream.onerror = beginPolling;
    return () => {
      active = false;
      stream.close();
      stopPolling();
    };
  }, [runId, demoMode, eventRefreshTick]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSubmittedSearch('');
      setSearchHits([]);
      setSearchError('');
      setFocusId('');
      return;
    }
    setSubmittedSearch(query);
    setSearchLoading(true);
    setSearchError('');
    setSearchHits([]);
    if (demoMode) {
      const hits = demoNodes.filter((node) => `${node.name} ${node.path}`.toLowerCase().includes(query.toLowerCase())).map((node) => ({ nodeId: node.id, name: node.name, path: node.path, kind: node.kind }));
      setSearchHits(hits);
      if (hits[0]) {
        setSelectedId(hits[0].nodeId);
        setFocusId(hits[0].nodeId);
        setFocusKey((key) => key + 1);
      }
      setSearchLoading(false);
      return;
    }
    if (!runId) {
      setSearchError('Select an analysis before searching.');
      setSearchLoading(false);
      return;
    }
    try {
      const response = await searchAnalysis(runId, { q: query });
      const payload = record(response);
      if (!payload || !Array.isArray(payload.results)) throw new Error('The search response did not include a results list.');
      const hits: SearchHit[] = payload.results.flatMap((entry) => {
        const item = record(entry);
        if (!item) return [];
        const nodeId = text(item.nodeId);
        if (!nodeId) return [];
        const path = text(item.path) ?? text(item.name) ?? nodeId;
        return [{ nodeId, name: text(item.name) ?? path.split('/').pop() ?? nodeId, path, kind: text(item.kind) ?? 'result', line: num(item.line) }];
      });
      setSearchHits(hits);
      if (hits[0]) {
        setSelectedId(hits[0].nodeId);
        setFocusId(hits[0].nodeId);
        setFocusKey((key) => key + 1);
      }
    } catch (error) {
      setSearchHits([]);
      setSearchError(error instanceof Error ? error.message : explainError(error));
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePrImpact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanUrl = prUrl.trim();
    let valid = false;
    try {
      const url = new URL(cleanUrl);
      valid = url.hostname.toLowerCase() === 'github.com' && url.pathname.includes('/pull/');
    } catch { valid = false; }
    if (!valid || !runId) {
      setPrError(runId ? 'Enter a public GitHub pull-request URL.' : 'A live analysis is required for pull-request impact.');
      return;
    }
    setPrLoading(true);
    setPrError('');
    setPrEvidence(null);
    try {
      setPrEvidence(await submitPrImpact(runId, { prUrl: cleanUrl }));
    } catch (error) {
      setPrError(explainError(error));
    } finally {
      setPrLoading(false);
    }
  };

  const handleOnboardingSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const role = onboardingRole.trim() || 'contributor';
    const issueUrl = onboardingIssueUrl.trim();
    setOnboardingRequest(issueUrl ? { role, issueUrl } : { role });
  };

  const displayNodes = useMemo(() => {
    const query = fileFilter.trim().toLowerCase();
    return nodes.filter((node) => {
      if (query && !`${node.name} ${node.path}`.toLowerCase().includes(query)) return false;
      if (graphFilters.language !== 'all' && (node.language ?? 'unknown') !== graphFilters.language) return false;
      if (graphFilters.kind !== 'all' && node.kind !== graphFilters.kind) return false;
      if (graphFilters.directory !== 'all' && (node.path.split('/')[0] || 'root') !== graphFilters.directory) return false;
      if (graphFilters.complexity !== 'all') {
        const complexity = node.complexity ?? 0;
        if (graphFilters.complexity === 'low' && complexity > 5) return false;
        if (graphFilters.complexity === 'medium' && (complexity < 6 || complexity > 10)) return false;
        if (graphFilters.complexity === 'high' && complexity < 11) return false;
      }
      return true;
    });
  }, [nodes, fileFilter, graphFilters]);
  const graphFilterOptions = useMemo(() => ({
    languages: [...new Set(nodes.map((node) => node.language).filter((value): value is string => !!value))].sort(),
    kinds: [...new Set(nodes.map((node) => node.kind))].sort(),
    directories: [...new Set(nodes.map((node) => node.path.split('/')[0] || 'root'))].sort(),
  }), [nodes]);
  const visibleEdges = useMemo(() => edges.filter((edge) => relationFilters[edge.kind as RelationKind] ?? true), [edges, relationFilters]);
  const activeNode = displayNodes.find((node) => node.id === selectedId) ?? null;
  const demoSource = demoMode && selectedId ? demoSources[selectedId] : undefined;
  const source = demoSource ? null : sourceRecord;
  const sourceText = demoSource?.code ?? getReturnedString(source, ['source', 'sourceCode', 'code', 'content']);
  const sourceLanguage = demoSource ? 'typescript' : getReturnedString(source, ['language'])?.toLowerCase();
  const sourceStartLine = demoSource?.startLine ?? num(getRecordField(source, ['startLine', 'startLineNumber']));
  const sourceEndLine = num(getRecordField(source, ['endLine', 'endLineNumber']));
  const sourceMetrics: [string, unknown][] = [
    ['lines of code', getRecordField(source, ['loc', 'linesOfCode'])],
    ['token count', getRecordField(source, ['tokenCount'])],
    ['token counting convention', getRecordField(source, ['tokenCountingConvention'])],
    ['complexity', getRecordField(source, ['complexity', 'cyclomaticComplexity'])],
  ].filter((entry): entry is [string, unknown] => entry[1] !== undefined);
  const sourceWarnings = getRecordField(source, ['warnings', 'parserWarnings']);
  const sourceConfidence = getRecordField(source, ['confidence']);
  const sourceImports = returnedRelationshipItems(getRecordField(source, ['imports']));
  const sourceDependents = returnedRelationshipItems(getRecordField(source, ['dependents']));
  const highlighted = useMemo(() => sourceText ? highlightedCode(sourceText, sourceLanguage) : '', [sourceText, sourceLanguage]);
  const highlightIds = useMemo(() => searchHits.map((hit) => hit.nodeId), [searchHits]);
  const repository = demoMode ? 'sample/atlas-lab' : getReturnedString(snapshot, ['repository', 'repositoryUrl', 'name']);
  const revision = demoMode ? 'illustrative fixture' : getReturnedString(snapshot, ['revision', 'ref', 'commit']);
  const status = demoMode ? 'illustrative sample' : getReturnedString(snapshot, ['status']);
  const summary = record(getRecordField(snapshot, ['summary']));
  const fileCount = demoMode ? demoNodes.length : num(getRecordField(summary, ['files', 'fileCount'])) ?? num(getRecordField(snapshot, ['fileCount']));
  const nodeCount = demoMode ? undefined : num(getRecordField(summary, ['nodes', 'nodeCount'])) ?? num(getRecordField(snapshot, ['nodeCount']));
  const edgeCount = demoMode ? demoEdges.length : num(getRecordField(summary, ['edges', 'edgeCount'])) ?? num(getRecordField(snapshot, ['edgeCount'])) ?? (nodes.length ? edges.length : undefined);
  const duration = getRecordField(snapshot, ['duration', 'durationMs']) ?? getRecordField(summary, ['duration', 'durationMs']);
  const warningsValue = getRecordField(snapshot, ['warnings']) ?? getRecordField(summary, ['warnings']);
  const warnings = Array.isArray(warningsValue) ? warningsValue.map(renderValue) : warningsValue === undefined ? [] : [renderValue(warningsValue)];
  const progress = getRecordField(snapshot, ['progress']);
  const selectionLabel = activeNode?.path ?? 'No file selected';

  const goToMode = useCallback((nextMode: WorkspaceMode) => {
    const nextParams = new URLSearchParams(params);
    nextParams.delete('mode');
    const query = nextParams.toString();
    navigate({ pathname: `/workspace/${nextMode}`, search: query ? `?${query}` : '' });
    setMode(nextMode);
    setMobilePane('details');
  }, [navigate, params]);

  const selectNode = useCallback((id: string) => {
    setSelectedId(id);
    setMobilePane('details');
  }, []);

  const openNode = useCallback((id: string) => {
    goToMode('explore');
    selectNode(id);
    setFocusId(id);
    setFocusKey((key) => key + 1);
  }, [goToMode, selectNode]);

  const tabs: { id: WorkspaceMode; label: string }[] = [
    { id: 'explore', label: 'Explore' },
    { id: 'diagnose', label: 'Diagnose' },
    { id: 'onboard', label: 'Onboard' },
    { id: 'impact', label: 'Impact' },
  ];

  return (
    <div className="workspace-app">
      <header className="workspace-topbar">
        <Brand compact />
        <div className="workspace-repo-stamp">
          <GitBranch size={14} />
          <span>{repository ?? 'Repository unavailable'}</span>
          {revision && <code>{revision}</code>}
        </div>
        <div className={`workspace-status${demoMode ? ' is-demo' : ''}`}><span className="status-led" />{demoMode ? 'DEMO DATA' : status ?? (workspaceLoading ? 'CONNECTING' : 'STATUS UNAVAILABLE')}</div>
        <a className="workspace-home-link" href="/" aria-label="Return to CodeDarpan home"><ArrowLeft size={15} /> Home</a>
      </header>

      {demoMode && <div className="demo-ribbon"><Sparkles size={14} /><strong>DEMO DATA</strong><span>Illustrative fixture · not an analysis of a submitted repository</span></div>}
      {!demoMode && !runId && <StatusNotice kind="info" title="No analysis selected">Start with a GitHub URL or ZIP from the landing page, or explicitly open the sample atlas.</StatusNotice>}

      <main className="workspace-main">
        <div className="workspace-titlebar">
          <div><p className="eyebrow"><span className="eyebrow-rule" />REPOSITORY ATLAS</p><h1>{demoMode ? 'Atlas Lab' : repository ?? 'Workspace'}</h1></div>
          <div className="workspace-summary">
            {workspaceLoading ? <span className="summary-loading"><LoaderCircle size={14} /> Loading returned analysis…</span> : <>
              {fileCount !== undefined && <span><strong>{fileCount}</strong> files</span>}
              {nodeCount !== undefined && nodeCount !== fileCount && <span><strong>{nodeCount}</strong> nodes</span>}
              {edgeCount !== undefined && <span><strong>{edgeCount}</strong> relationships</span>}
              {duration !== undefined && <span>duration <strong>{renderValue(duration)}</strong></span>}
              {status && <span className="status-text">{status}</span>}
            </>}
          </div>
        </div>
        {(getReturnedString(snapshot, ['stage']) || getReturnedString(snapshot, ['message']) || progress !== undefined) && <p className="analysis-stage-line" role="status" aria-live="polite"><span>{getReturnedString(snapshot, ['stage']) ? `Returned stage: ${getReturnedString(snapshot, ['stage'])}` : 'Analyzer update'}</span>{progress !== undefined && <strong>Returned progress: {renderValue(progress)}</strong>}{getReturnedString(snapshot, ['message']) && <strong>{getReturnedString(snapshot, ['message'])}</strong>}</p>}
        {warnings.length > 0 && <details className="snapshot-warnings"><summary>{warnings.length} analyzer warning{warnings.length === 1 ? '' : 's'}</summary><ul>{warnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul></details>}

        <div className="workspace-controls">
          <div className="mode-tabs" role="tablist" aria-label="Repository analysis mode">
            {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={mode === tab.id} onClick={() => goToMode(tab.id)} className={mode === tab.id ? 'is-active' : ''}>{tab.label}</button>)}
          </div>
          <form className="workspace-search" onSubmit={handleSearch} role="search">
            <Search size={16} aria-hidden="true" /><label htmlFor="global-search" className="visually-hidden">Search files, functions or symbols</label><input id="global-search" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setSubmittedSearch(''); setSearchHits([]); setSearchError(''); }} placeholder="Search files, functions, symbols" /><button type="submit" disabled={searchLoading} aria-label="Run search">{searchLoading ? <LoaderCircle size={15} className="spin" /> : <ArrowUpRight size={15} />}</button>
          </form>
        </div>
        {(workspaceError || graphError || searchError) && <StatusNotice kind="error" title={workspaceError ? 'Analysis unavailable' : graphError ? 'Graph unavailable' : 'Search unavailable'}>{workspaceError || graphError || searchError}</StatusNotice>}
        {!demoMode && eventNotice && <StatusNotice kind="info" title="Live status updates">{eventNotice}</StatusNotice>}
        {searchHits.length > 0 && <div className="search-results" role="status"><span>{searchHits.length} returned result{searchHits.length === 1 ? '' : 's'}</span>{searchHits.slice(0, 5).map((hit) => <button key={hit.nodeId} type="button" onClick={() => { selectNode(hit.nodeId); setFocusId(hit.nodeId); setFocusKey((key) => key + 1); }}><span>{hit.name}</span><code>{hit.path}{hit.line ? `:${hit.line}` : ''}</code></button>)}</div>}
        {submittedSearch && searchQuery.trim() === submittedSearch && !searchLoading && !searchError && searchHits.length === 0 && <p className="no-search-results" role="status">No matches returned for “{submittedSearch}”.</p>}
        {displayNodes.length > LARGE_GRAPH_NOTICE_THRESHOLD && <p className="large-graph-notice" role="status">Showing all {displayNodes.length} returned nodes. Use file search or relationship filters to focus.</p>}

        <div className="mobile-pane-tabs" role="tablist" aria-label="Workspace panels">
          {(['files', 'atlas', 'details'] as MobilePane[]).map((pane) => <button key={pane} type="button" role="tab" aria-selected={mobilePane === pane} onClick={() => setMobilePane(pane)}>{pane === 'files' ? 'Files' : pane === 'atlas' ? 'Atlas' : 'Details'}</button>)}
        </div>

        <div className={`workspace-grid active-${mobilePane}`}>
          <aside className="workspace-files workspace-column">
            <div className="rail-search"><Search size={14} /><input aria-label="Filter returned files" placeholder="Filter file paths" value={fileFilter} onChange={(event) => setFileFilter(event.target.value)} /></div>
            <FileTree nodes={displayNodes} selectedId={selectedId} query={fileFilter} onSelect={selectNode} />
            <div className="file-rail-foot"><span><GitFork size={13} /> Dependency direction</span><p>Arrows follow the returned relationship.</p></div>
          </aside>

          <section className="workspace-atlas workspace-column" aria-label="Dependency atlas panel">
            <div className="atlas-toolbar"><div className="atlas-toolbar-label"><Waypoints size={15} /><span>FILE RELATIONSHIPS</span></div><div className="atlas-actions">
              {!demoMode && <label className="depth-control">Depth <select value={depth} onChange={(event) => setDepth(Number(event.target.value))} aria-label="Graph depth"><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></label>}
              <button type="button" className="icon-button" aria-label="Fit graph to view" title="Fit graph to view" onClick={() => setFitKey((key) => key + 1)}><Maximize2 size={15} /></button>
              <button type="button" className="icon-button" aria-label="Reset graph layout" title="Reset graph layout" onClick={() => setResetKey((key) => key + 1)}><RotateCcw size={15} /></button>
            </div></div>
            <div className="atlas-filter-row" aria-label="Graph filters">
              <label>Language <select value={graphFilters.language} onChange={(event) => setGraphFilters((current) => ({ ...current, language: event.target.value }))}><option value="all">All</option>{graphFilterOptions.languages.map((language) => <option key={language} value={language}>{language}</option>)}</select></label>
              <label>Kind <select value={graphFilters.kind} onChange={(event) => setGraphFilters((current) => ({ ...current, kind: event.target.value }))}><option value="all">All</option>{graphFilterOptions.kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></label>
              <label>Directory <select value={graphFilters.directory} onChange={(event) => setGraphFilters((current) => ({ ...current, directory: event.target.value }))}><option value="all">All</option>{graphFilterOptions.directories.map((directory) => <option key={directory} value={directory}>{directory}</option>)}</select></label>
              <label>Complexity <select value={graphFilters.complexity} onChange={(event) => setGraphFilters((current) => ({ ...current, complexity: event.target.value }))}><option value="all">All</option><option value="low">1–5</option><option value="medium">6–10</option><option value="high">11+</option></select></label>
              <button type="button" className="clear-graph-filters" onClick={() => setGraphFilters({ language: 'all', kind: 'all', directory: 'all', complexity: 'all' })}>Clear filters</button>
            </div>
            <div className="atlas-stage">
              {graphLoading && <div className="atlas-loading"><LoaderCircle size={20} className="spin" /><span>Waiting for returned graph data…</span></div>}
              {!graphLoading && displayNodes.length > 0 ? <AtlasGraph nodes={displayNodes} edges={visibleEdges} selectedId={selectedId} highlightedIds={highlightIds} onSelect={(id) => { setSelectedId(id); setMobilePane('details'); }} depth={depth} fitKey={fitKey} resetKey={resetKey} focusId={focusId} focusKey={focusKey} /> : !graphLoading && <div className="atlas-empty-state"><img src="/manus-storage/empty-atlas_9ba00091.webp" alt="An empty technical map awaiting returned repository relationships." /><h2>{demoMode ? 'Sample atlas is being prepared' : 'No returned graph to draw'}</h2><p>{demoMode ? 'This illustrative atlas appears after you choose Explore sample atlas.' : 'The graph appears only when a compatible analyzer returns usable nodes and edges.'}</p><a href="/">Return to repository intake <ArrowUpRight size={14} /></a></div>}
            </div>
            <div className="graph-legend" role="group" aria-label="Filter relationship types">
              <button type="button" className={relationFilters.imports ? 'graph-filter is-active' : 'graph-filter'} aria-pressed={relationFilters.imports} onClick={() => setRelationFilters((current) => ({ ...current, imports: !current.imports }))}><i className="legend-line legend-line--import" />Imports</button><button type="button" className={relationFilters.calls ? 'graph-filter is-active' : 'graph-filter'} aria-pressed={relationFilters.calls} onClick={() => setRelationFilters((current) => ({ ...current, calls: !current.calls }))}><i className="legend-line legend-line--call" />Calls</button><button type="button" className={relationFilters.other ? 'graph-filter is-active' : 'graph-filter'} aria-pressed={relationFilters.other} onClick={() => setRelationFilters((current) => ({ ...current, other: !current.other }))}><i className="legend-line legend-line--other" />Other</button><span className="legend-node-key"><i /> File</span>
            </div>
            {demoMode && <p className="graph-sample-caption"><Sparkles size={12} /> Sample relationships are illustrative.</p>}
          </section>

          <aside className="workspace-details workspace-column">
            <div className="details-panel-heading"><span>{mode === 'explore' ? 'SOURCE INSPECTOR' : `${mode.toUpperCase()} EVIDENCE`}</span><ChevronsUpDown size={14} /></div>
            {mode === 'explore' ? (
              <>
                <div className="selected-file-heading"><FileCode2 size={15} /><code>{selectionLabel}</code></div>
                {demoMode && <div className="inline-demo-label">DEMO DATA <span>Illustrative source</span></div>}
                {sourceLoading ? <div className="detail-empty"><LoaderCircle size={16} className="spin" /><span>Loading returned source…</span></div> : sourceError ? <StatusNotice kind="error" title="Source unavailable">{sourceError}</StatusNotice> : sourceText ? <>
                  <div className="source-meta"><span>{sourceLanguage ?? (demoMode ? 'typescript' : 'language unavailable')}</span><span>{activeNode?.kind ?? 'kind unavailable'}</span>{sourceStartLine !== undefined || sourceEndLine !== undefined ? <span>lines {sourceStartLine ?? '…'}–{sourceEndLine ?? '…'}</span> : <span>range unavailable</span>}{demoSource?.confidence !== undefined && <span>confidence {(demoSource.confidence * 100).toFixed(0)}% · demo</span>}{!demoMode && sourceConfidence !== undefined && <span>confidence {renderValue(sourceConfidence)}</span>}</div>
                  <div className="source-code-wrap" aria-label={`Source code for ${selectionLabel}`}><pre className="line-numbers" aria-hidden="true">{sourceText.split('\n').map((_, index) => <span key={index}>{sourceStartLine !== undefined ? sourceStartLine + index : '·'}</span>)}</pre><pre className="source-code"><code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} /></pre></div>
                  {sourceMetrics.length > 0 && <dl className="source-metrics">{sourceMetrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{renderValue(value)}</dd></div>)}</dl>}
                  {!demoMode && sourceWarnings !== undefined && <section className="source-warning-list"><h3>Returned parser warnings</h3><pre>{renderValue(sourceWarnings)}</pre></section>}
                  {demoSource && <p className="source-note">{demoSource.summary}</p>}
                  {demoSource && <RelationshipList label="Imports" items={demoSource.imports} nodes={nodes} onSelectNode={openNode} />}
                  {demoSource && <RelationshipList label="Dependents" items={demoSource.dependents} nodes={nodes} onSelectNode={openNode} />}
                  {!demoMode && sourceImports !== null && <RelationshipList label="Imports" items={sourceImports} nodes={nodes} onSelectNode={openNode} />}
                  {!demoMode && sourceDependents !== null && <RelationshipList label="Dependents" items={sourceDependents} nodes={nodes} onSelectNode={openNode} />}
                </> : <div className="detail-empty"><ShieldAlert size={18} /><p>{demoMode ? 'No illustrative source fixture is attached to this node.' : 'Source is unavailable until the analyzer returns source for the selected file.'}</p></div>}
              </>
            ) : (
              <EvidencePanel mode={mode} demoMode={demoMode} loading={panelLoading} error={panelError} evidence={panelEvidence} issues={issues} selectedPath={selectionLabel} nodes={nodes} onSelectNode={openNode} onPrSubmit={handlePrImpact} prUrl={prUrl} setPrUrl={setPrUrl} prLoading={prLoading} prError={prError} prEvidence={prEvidence} onboardingRole={onboardingRole} setOnboardingRole={setOnboardingRole} onboardingIssueUrl={onboardingIssueUrl} setOnboardingIssueUrl={setOnboardingIssueUrl} onOnboardingSubmit={handleOnboardingSubmit} />
            )}
            <div className="inspector-footer"><span>SELECTION</span><code>{activeNode?.id ?? 'none'}</code></div>
          </aside>
        </div>

        <footer className="workspace-footer"><span><ShieldAlert size={13} /> Structural estimates are not predictions of every runtime failure.</span><nav aria-label="Workspace footer"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>
      </main>
    </div>
  );
}

function RelationshipList({ label, items, nodes, onSelectNode }: { label: string; items: string[]; nodes: GraphNode[]; onSelectNode: (id: string) => void }) {
  return <div className="relationship-list"><h3>{label}<span>{items.length}</span></h3>{items.length ? items.map((item, index) => {
    const match = linkedGraphNodes(item, nodes)[0];
    return match
      ? <button type="button" key={`${item}-${index}`} onClick={() => onSelectNode(match.id)}><ArrowUpRight size={12} /><code>{item}</code></button>
      : <div key={`${item}-${index}`}><ArrowUpRight size={12} /><code>{item}</code></div>;
  }) : <p>No returned relationships.</p>}</div>;
}

function EvidencePanel({ mode, demoMode, loading, error, evidence, issues, selectedPath, nodes, onSelectNode, onPrSubmit, prUrl, setPrUrl, prLoading, prError, prEvidence, onboardingRole, setOnboardingRole, onboardingIssueUrl, setOnboardingIssueUrl, onOnboardingSubmit }: { mode: Exclude<WorkspaceMode, 'explore'>; demoMode: boolean; loading: boolean; error: string; evidence: unknown; issues: unknown; selectedPath: string; nodes: GraphNode[]; onSelectNode: (id: string) => void; onPrSubmit: (event: FormEvent<HTMLFormElement>) => void; prUrl: string; setPrUrl: (value: string) => void; prLoading: boolean; prError: string; prEvidence: unknown; onboardingRole: string; setOnboardingRole: (value: string) => void; onboardingIssueUrl: string; setOnboardingIssueUrl: (value: string) => void; onOnboardingSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const payload = record(demoMode ? demoEvidence[mode] : evidence);
  const issuePayload = record(demoMode ? demoEvidence.issues : issues);
  const title = mode === 'diagnose' ? 'Health evidence' : mode === 'onboard' ? 'Contributor route' : 'Impact workbench';
  return (
    <div className="evidence-panel">
      <div className="evidence-title"><span>{title}</span>{mode === 'impact' && <span className="evidence-node">{selectedPath}</span>}</div>
      {demoMode && <div className="inline-demo-label">DEMO DATA <span>Illustrative only · not live findings</span></div>}
      {mode === 'onboard' && !demoMode && <form className="onboarding-context" onSubmit={onOnboardingSubmit}><label htmlFor="onboarding-role">Contributor role</label><input id="onboarding-role" value={onboardingRole} onChange={(event) => setOnboardingRole(event.target.value)} placeholder="contributor" /><label htmlFor="onboarding-issue">Public issue URL <span>(optional)</span></label><input id="onboarding-issue" type="url" value={onboardingIssueUrl} onChange={(event) => setOnboardingIssueUrl(event.target.value)} placeholder="https://github.com/owner/repo/issues/123" /><button type="submit" disabled={loading}>Update route <ArrowUpRight size={13} /></button></form>}
      {mode === 'impact' && !demoMode && <form className="pr-impact-form" onSubmit={onPrSubmit}><label htmlFor="pr-url">Public pull-request URL</label><div><input id="pr-url" type="url" value={prUrl} onChange={(event) => setPrUrl(event.target.value)} placeholder="https://github.com/owner/repo/pull/123" /><button type="submit" disabled={prLoading} aria-label="Analyze pull request impact">{prLoading ? <LoaderCircle size={14} className="spin" /> : <ArrowUpRight size={14} />}</button></div>{prError && <p className="inline-error" role="alert">{prError}</p>}</form>}
      {loading && <div className="detail-empty" role="status"><LoaderCircle size={16} className="spin" /><span>Loading returned evidence…</span></div>}
      {error && <StatusNotice kind="error" title="Evidence unavailable">{error}</StatusNotice>}
      {!demoMode && !loading && !error && !payload && mode !== 'impact' && mode !== 'onboard' && <div className="detail-empty"><ShieldAlert size={18} /><p>The backend has not returned evidence for this view.</p></div>}
      {mode === 'diagnose' && payload && <HealthEvidencePanel value={payload} nodes={nodes} onSelectNode={onSelectNode} />}
      {mode === 'onboard' && (payload || issuePayload) && <OnboardingEvidencePanel route={payload} issues={issuePayload} nodes={nodes} onSelectNode={onSelectNode} />}
      {mode === 'onboard' && !demoMode && !loading && !error && !payload && !issuePayload && <div className="detail-empty"><ShieldAlert size={18} /><p>No onboarding route or issue evidence was returned.</p></div>}
      {mode === 'impact' && <ImpactEvidencePanel selectedPath={selectedPath} selectedImpact={payload} pullRequestImpact={prEvidence} nodes={nodes} onSelectNode={onSelectNode} />}
      {demoMode && <p className="illustrative-caveat">This fixture does not represent a live analysis or an actual repository finding.</p>}
    </div>
  );
}
