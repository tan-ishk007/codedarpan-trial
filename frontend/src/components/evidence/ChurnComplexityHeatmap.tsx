import type { CSSProperties } from 'react';
import type { GraphNode } from '../graph/AtlasGraph';
import { evidenceRecord, formatEvidence } from './EvidencePrimitives';

type HeatmapProps = {
  value: unknown;
  nodes: GraphNode[];
  onSelectNode: (id: string) => void;
};

type Point = { path: string; complexity: number; changes: number; nodeId?: string };

function numeric(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Visualizes only returned churn/complexity pairs. Intensity is normalized to
 * the observed maximum in this response; it is not a risk score or prediction.
 */
export function ChurnComplexityHeatmap({ value, nodes, onSelectNode }: HeatmapProps) {
  const entries = Array.isArray(value) ? value : [];
  const points: Point[] = entries.flatMap((entry) => {
    const record = evidenceRecord(entry);
    if (!record) return [];
    const path = typeof record.path === 'string' ? record.path : typeof record.name === 'string' ? record.name : undefined;
    const complexity = numeric(record.complexity);
    const changes = numeric(record.changes);
    if (!path || complexity === undefined || changes === undefined) return [];
    return [{ path, complexity, changes, nodeId: typeof record.nodeId === 'string' ? record.nodeId : undefined }];
  }).sort((a, b) => (b.changes + b.complexity) - (a.changes + a.complexity)).slice(0, 80);
  if (!points.length) return null;
  const maxChanges = Math.max(1, ...points.map((point) => point.changes));
  const maxComplexity = Math.max(1, ...points.map((point) => point.complexity));
  const byPath = new Map(nodes.map((node) => [node.path, node]));
  return (
    <section className="health-heatmap" aria-labelledby="health-heatmap-title">
      <div className="health-heatmap__heading">
        <div><span className="eyebrow">Returned evidence</span><h3 id="health-heatmap-title">Churn × complexity</h3></div>
        <span className="health-heatmap__legend" aria-label="Cell intensity is relative to the returned maximum">relative intensity</span>
      </div>
      <p className="health-heatmap__note">Each cell uses the analyzer's returned recent churn and complexity values. It is a prioritization view, not a defect prediction.</p>
      <div className="health-heatmap__matrix" role="list" aria-label="Files with returned churn and complexity values">
        {points.map((point) => {
          const node = byPath.get(point.path);
          const intensity = Math.max(point.changes / maxChanges, point.complexity / maxComplexity);
          return (
            <button type="button" className="health-heatmap__cell" key={point.path} style={{ '--heat': String(0.16 + intensity * 0.62) } as CSSProperties} onClick={() => node && onSelectNode(node.id)} disabled={!node} role="listitem" title={formatEvidence({ path: point.path, changes: point.changes, complexity: point.complexity })}>
              <strong>{point.path}</strong><span>{point.changes} changes · C{point.complexity}</span>
            </button>
          );
        })}
      </div>
      <div className="health-heatmap__axes" aria-hidden="true"><span>Lower returned values</span><span>Higher returned values</span></div>
    </section>
  );
}
