/** Inputs and outputs for deterministic, evidence-backed repository onboarding routes. */
export interface OnboardingSymbol {
  name: string;
  line?: number;
  kind?: string;
}

export interface OnboardingFile {
  path: string;
  nodeId?: string;
  id?: string;
  name?: string;
  kind?: string;
  complexity?: number;
  symbols?: OnboardingSymbol[];
  imports?: string[];
  loc?: number;
}

export interface OnboardingEdge {
  source: string;
  target: string;
  type?: string;
  kind?: string;
}

export interface OnboardingInput {
  files: OnboardingFile[];
  /** Import edges, either as a flat edge list or a path-to-dependencies map. */
  resolvedImports?: OnboardingEdge[] | Record<string, string[]> | Map<string, string[]>;
  edges?: OnboardingEdge[];
  role?: string;
  issueText?: string;
  issue?: string;
  limit?: number;
}

export interface OnboardingRouteItem {
  path: string;
  nodeId: string;
  title: string;
  reason: string;
  evidence: string[];
}

const sourceExtensions = /\.(?:[cm]?[jt]sx?)$/i;
const testPath = /(?:^|\/)(?:__tests__\/|tests?\/)|\.(?:test|spec)\.[cm]?[jt]sx?$/i;
const entryPath = /(?:^|\/)(?:index|main|app|server|cli|bootstrap)\.[cm]?[jt]sx?$/i;
const readmePath = /(?:^|\/)readme(?:\.[^/]*)?$/i;

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/');
}

function graphEdges(input: OnboardingInput): OnboardingEdge[] {
  const result: OnboardingEdge[] = [...(input.edges || [])];
  const resolved = input.resolvedImports;
  if (resolved instanceof Map) {
    for (const [source, targets] of resolved) for (const target of targets) result.push({ source, target, type: 'import' });
  } else if (Array.isArray(resolved)) result.push(...resolved);
  else if (resolved) {
    for (const [source, targets] of Object.entries(resolved)) for (const target of targets) result.push({ source, target, type: 'import' });
  }
  const seen = new Set<string>();
  return result.filter(edge => {
    if (edge.type && edge.type !== 'import' && edge.kind !== 'import') return false;
    const key = `${normalizePath(edge.source)}\0${normalizePath(edge.target)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(edge => ({ ...edge, source: normalizePath(edge.source), target: normalizePath(edge.target) }));
}

function escapeRegExp(text: string): string { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * Build an ordered reading route. All explanations refer only to supplied file
 * metadata or literal path matches in the supplied issue text.
 */
export function buildOnboardingRoute(input: OnboardingInput): OnboardingRouteItem[] {
  const files = input.files.map(file => ({ ...file, path: normalizePath(file.path) }))
    .filter(file => file.path && (!file.kind || file.kind === 'file'))
    .sort((a, b) => a.path.localeCompare(b.path));
  const byPath = new Map(files.map(file => [file.path, file]));
  const edges = graphEdges(input).filter(edge => byPath.has(edge.source) && byPath.has(edge.target));
  const issueText = input.issueText ?? input.issue ?? '';
  const role = (input.role || '').trim();
  const issueMatches = new Map<string, string[]>();

  for (const file of files) {
    const variants = new Set([file.path, file.name || '', file.path.split('/').pop() || '']);
    const matched = [...variants].filter(value => value.length > 0 && new RegExp(`(^|[^\\w.-])${escapeRegExp(value)}($|[^\\w.-])`, 'i').test(issueText));
    if (matched.length) issueMatches.set(file.path, matched);
  }

  const rank = new Map<string, number>();
  const reasons = new Map<string, string[]>();
  const evidence = new Map<string, string[]>();
  const add = (path: string, priority: number, reason: string, proof: string) => {
    if (!byPath.has(path)) return;
    rank.set(path, Math.min(rank.get(path) ?? Infinity, priority));
    const rs = reasons.get(path) || [];
    if (!rs.includes(reason)) rs.push(reason);
    reasons.set(path, rs);
    const ev = evidence.get(path) || [];
    if (!ev.includes(proof)) ev.push(proof);
    evidence.set(path, ev);
  };

  for (const [path, names] of issueMatches) {
    add(path, 0, 'The supplied issue text explicitly mentions this file.', `Issue text contains: ${names.map(name => `“${name}”`).join(', ')}.`);
  }

  // Test relevance is structural: a test importing an issue-mentioned module,
  // or a test filename sharing a literal issue term, is explainably relevant.
  for (const file of files.filter(f => testPath.test(f.path))) {
    const deps = new Set(edges.filter(edge => edge.source === file.path).map(edge => edge.target));
    const related = [...issueMatches.keys()].filter(path => deps.has(path));
    const basename = file.path.split('/').pop() || '';
    const issueTokens = issueText.toLowerCase().match(/[a-z0-9_$-]+/g) || [];
    const named = issueTokens.filter(token => token.length >= 3 && basename.toLowerCase().includes(token));
    if (related.length) add(file.path, 1, 'This test has a resolved import edge to an issue-mentioned file.', `Resolved imports: ${related.join(', ')}.`);
    else if (named.length) add(file.path, 1, 'The test filename contains a term present in the issue text.', `Issue term(s) in test filename: ${[...new Set(named)].join(', ')}.`);
  }

  const roleWords = role.toLowerCase().match(/[a-z0-9_$-]+/g) || [];
  const roleContext = roleWords.length ? `Requested role: “${role}”.` : '';
  const isReadmeRelevant = /developer|engineer|maintain|contribut|onboard|architect|backend|frontend|full.?stack|test|qa|security|devops/i.test(role);
  const isEntrypointRelevant = /developer|engineer|maintain|contribut|onboard|architect|backend|frontend|full.?stack|test|qa|security|devops|operator/i.test(role);
  if (isReadmeRelevant) for (const file of files.filter(f => readmePath.test(f.path))) {
    add(file.path, 2, 'Project documentation is useful context for the requested engineering role.', `${roleContext} File path identifies this as a README.`);
  }
  if (isEntrypointRelevant) for (const file of files.filter(f => entryPath.test(f.path))) {
    add(file.path, 3, 'An application entrypoint provides role-relevant startup or control-flow context.', `${roleContext} Entrypoint filename: ${file.path.split('/').pop()}.`);
  }

  // Expand from the issue/test/context seeds by undirected import distance.
  // Inbound links are included because callers and dependencies both aid orientation.
  const adjacency = new Map<string, Set<string>>();
  for (const file of files) adjacency.set(file.path, new Set());
  for (const edge of edges) { adjacency.get(edge.source)!.add(edge.target); adjacency.get(edge.target)!.add(edge.source); }
  const initial = [...rank.keys()].sort((a, b) => a.localeCompare(b));
  let frontier = initial;
  const visited = new Set(initial);
  let distance = 1;
  while (frontier.length) {
    const next = new Set<string>();
    for (const path of frontier) for (const neighbor of adjacency.get(path) || []) if (!visited.has(neighbor)) next.add(neighbor);
    frontier = [...next].sort((a, b) => a.localeCompare(b));
    for (const path of frontier) {
      visited.add(path);
      const file = byPath.get(path)!;
      const complexity = Number.isFinite(file.complexity) ? file.complexity! : undefined;
      const symbols = file.symbols || [];
      const symbolEvidence = symbols.length ? `Declared symbols: ${symbols.slice(0, 5).map(symbol => `${symbol.name}${symbol.line ? ` (line ${symbol.line})` : ''}`).join(', ')}${symbols.length > 5 ? ` (+${symbols.length - 5} more)` : ''}.` : 'No symbol declarations were supplied.';
      const complexityEvidence = complexity === undefined ? 'Complexity metadata was not supplied.' : `Supplied complexity score: ${complexity}.`;
      add(path, 3 + distance, `Connected by ${distance} resolved import hop${distance === 1 ? '' : 's'}; simpler nearby modules are prioritized.`, `${symbolEvidence} ${complexityEvidence}`);
    }
    distance++;
  }

  // Disconnected files remain discoverable at the end in a stable, simple-first order.
  for (const file of files) if (!rank.has(file.path)) {
    const complexity = Number.isFinite(file.complexity) ? file.complexity! : undefined;
    const symbolEvidence = file.symbols?.length ? `Declared symbols: ${file.symbols.slice(0, 5).map(symbol => symbol.name).join(', ')}.` : 'No symbol declarations were supplied.';
    add(file.path, 10000 + (complexity ?? Number.MAX_SAFE_INTEGER) / 1000000, 'No resolved-import connection to the selected onboarding context was supplied; included after connected files.', `${symbolEvidence} ${complexity === undefined ? 'Complexity metadata was not supplied.' : `Supplied complexity score: ${complexity}.`}`);
  }

  const ordered = files.slice().sort((a, b) => {
    const ar = rank.get(a.path)!, br = rank.get(b.path)!;
    if (ar !== br) return ar - br;
    if (ar >= 10000) {
      const ac = Number.isFinite(a.complexity) ? a.complexity! : Infinity;
      const bc = Number.isFinite(b.complexity) ? b.complexity! : Infinity;
      if (ac !== bc) return ac - bc;
    } else if (ar >= 3) {
      const ac = Number.isFinite(a.complexity) ? a.complexity! : Infinity;
      const bc = Number.isFinite(b.complexity) ? b.complexity! : Infinity;
      if (ac !== bc) return ac - bc;
    }
    return a.path.localeCompare(b.path);
  });
  const limit = input.limit === undefined ? ordered.length : Math.max(0, Math.floor(input.limit));
  return ordered.slice(0, limit).map(file => ({
    path: file.path,
    nodeId: file.nodeId || file.id || file.path,
    title: file.name || file.path.split('/').pop() || file.path,
    reason: (reasons.get(file.path) || ['Included as repository context.']).join(' '),
    evidence: evidence.get(file.path) || ['Source metadata supplied no additional evidence.'],
  }));
}

/** Alias for callers that prefer a noun-oriented function name. */
export const createOnboardingRoute = buildOnboardingRoute;
