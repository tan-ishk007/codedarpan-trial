import { useState } from 'react';
import { EvidenceGroup, type EvidenceRecord, formatEvidence } from './EvidencePrimitives';
import type { GraphNode } from '../graph/AtlasGraph';
import { ChurnComplexityHeatmap } from './ChurnComplexityHeatmap';

type FilterKey = 'all' | 'findings' | 'factors' | 'hotspots' | 'cycles' | 'churnComplexity';
const groups: { key: Exclude<FilterKey, 'all'>; title: string }[] = [
  { key: 'findings', title: 'Findings' },
  { key: 'factors', title: 'Health factors' },
  { key: 'hotspots', title: 'Hotspots' },
  { key: 'cycles', title: 'Import cycles' },
  { key: 'churnComplexity', title: 'Returned churn × complexity data' },
];

export function HealthEvidencePanel({ value, nodes, onSelectNode }: { value: EvidenceRecord; nodes: GraphNode[]; onSelectNode: (id: string) => void }) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const availableGroups = groups.filter(({ key }) => value[key] !== undefined && value[key] !== null);
  const score = value.score;
  const confidence = value.confidence;
  const historyNote = value.historyUnavailableReason ?? value.historyMessage;
  const scalarCards = [
    ...(score !== undefined && score !== null ? [{ label: 'Returned health score', value: formatEvidence(score) }] : []),
    ...(confidence !== undefined && confidence !== null ? [{ label: 'Returned confidence', value: formatEvidence(confidence) }] : []),
    ...(value.historyAvailable !== undefined ? [{ label: 'History available', value: formatEvidence(value.historyAvailable) }] : []),
  ];

  return (
    <div className="health-evidence-panel">
      {scalarCards.length > 0 && <dl className="health-summary">{scalarCards.map((card) => <div key={card.label}><dt>{card.label}</dt><dd>{card.value}</dd></div>)}</dl>}
      {value.historyAvailable === false && <p className="history-caveat">{typeof historyNote === 'string' && historyNote.trim() ? historyNote : 'Git history is unavailable in the returned evidence. Churn is not inferred as zero.'}</p>}
      {availableGroups.length > 0 && <div className="evidence-filter" role="group" aria-label="Filter health evidence">
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
        {availableGroups.map(({ key, title }) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{title}</button>)}
      </div>}
      <div className="health-evidence-groups">
        <ChurnComplexityHeatmap value={value.churnComplexity} nodes={nodes} onSelectNode={onSelectNode} />
        {availableGroups.filter(({ key }) => filter === 'all' || filter === key).map(({ key, title }) => <EvidenceGroup key={key} title={title} value={value[key]} nodes={nodes} onSelectNode={onSelectNode} />)}
        {availableGroups.length === 0 && <p className="evidence-empty">No recognized health evidence groups were returned.</p>}
      </div>
      <details className="evidence-raw-details"><summary>Full returned health response</summary><pre>{formatEvidence(value)}</pre></details>
    </div>
  );
}
