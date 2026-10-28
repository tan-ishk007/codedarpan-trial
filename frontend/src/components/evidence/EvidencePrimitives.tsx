import { useId } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { GraphNode } from '../graph/AtlasGraph';

export type EvidenceRecord = Record<string, unknown>;

export function evidenceRecord(value: unknown): EvidenceRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as EvidenceRecord : null;
}

export function evidenceText(value: EvidenceRecord | null, keys: string[]): string | undefined {
  if (!value) return undefined;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return undefined;
}

export function evidenceItems(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function formatEvidence(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 2) ?? 'Unavailable';
}

export function linkedGraphNodes(value: unknown, nodes: GraphNode[]): GraphNode[] {
  const byPath = new Map(nodes.map((node) => [node.path, node]));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const found = new Map<string, GraphNode>();
  const visit = (item: unknown): void => {
    if (typeof item === 'string') {
      const node = byPath.get(item) ?? byId.get(item);
      if (node) found.set(node.id, node);
    } else if (Array.isArray(item)) {
      item.forEach(visit);
    } else if (typeof item === 'object' && item !== null) {
      Object.values(item).forEach(visit);
    }
  };
  visit(value);
  return [...found.values()];
}

function safeGitHubUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function EvidenceItemCard({ item, index, nodes, onSelectNode }: { item: unknown; index: number; nodes: GraphNode[]; onSelectNode: (id: string) => void }) {
  const value = evidenceRecord(item);
  const title = evidenceText(value, ['title', 'name', 'label', 'rule', 'kind', 'path', 'file'])
    ?? (typeof item === 'string' ? item : `Returned item ${index + 1}`);
  const path = evidenceText(value, ['path', 'filePath', 'sourcePath', 'file']);
  const detailValue = value && ['reason', 'evidence', 'description', 'message', 'summary', 'explanation', 'definition', 'caveat']
    .map((key) => value[key])
    .find((candidate) => candidate !== undefined && candidate !== null && candidate !== '');
  const detail = detailValue === undefined ? undefined : formatEvidence(detailValue);
  const linkedNodes = linkedGraphNodes(item, nodes);
  const externalUrl = safeGitHubUrl(evidenceText(value, ['url', 'htmlUrl', 'issueUrl', 'pullRequestUrl']));
  const metadata = value ? ['severity', 'confidence', 'score', 'weight', 'status']
    .filter((key) => value[key] !== undefined && value[key] !== null)
    .map((key) => [key, formatEvidence(value[key])] as const) : [];
  const labels = value && Array.isArray(value.labels)
    ? value.labels.map((label) => typeof label === 'string' ? label : evidenceText(evidenceRecord(label), ['name', 'label'])).filter((label): label is string => !!label)
    : [];

  return (
    <article className="evidence-card">
      <div className="evidence-card__heading">
        <strong>{title}</strong>
        {path && <code>{path}</code>}
      </div>
      {detail && <p className="evidence-card__detail">{detail}</p>}
      {metadata.length > 0 && <dl className="evidence-card__metadata">{metadata.map(([key, valueText]) => <div key={key}><dt>{key}</dt><dd>{valueText}</dd></div>)}</dl>}
      {labels.length > 0 && <ul className="evidence-labels" aria-label="Returned labels">{labels.map((label, labelIndex) => <li key={`${label}-${labelIndex}`}>{label}</li>)}</ul>}
      {(linkedNodes.length > 0 || externalUrl) && <div className="evidence-card__actions">
        {linkedNodes.map((node) => <button type="button" key={node.id} onClick={() => onSelectNode(node.id)}><span>{node.path}</span><ArrowUpRight size={12} /></button>)}
        {externalUrl && <a href={externalUrl} target="_blank" rel="noopener noreferrer">Open on GitHub <ArrowUpRight size={12} /></a>}
      </div>}
      {value && <details className="evidence-card__raw"><summary>All returned fields</summary><pre>{formatEvidence(value)}</pre></details>}
    </article>
  );
}

export function EvidenceGroup({ title, value, nodes, onSelectNode, emptyMessage }: { title: string; value: unknown; nodes: GraphNode[]; onSelectNode: (id: string) => void; emptyMessage?: string }) {
  const headingId = useId();
  const items = evidenceItems(value);
  return (
    <section className="evidence-group" aria-labelledby={headingId}>
      <h3 id={headingId}>{title}<span>{items.length}</span></h3>
      {items.length === 0 ? <p className="evidence-group__empty">{emptyMessage ?? `No ${title.toLowerCase()} were returned.`}</p> : <div className="evidence-card-list">{items.map((item, index) => <EvidenceItemCard key={`${title}-${index}`} item={item} index={index} nodes={nodes} onSelectNode={onSelectNode} />)}</div>}
    </section>
  );
}
