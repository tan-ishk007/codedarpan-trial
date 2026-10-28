import { EvidenceGroup, evidenceRecord, formatEvidence } from './EvidencePrimitives';
import type { GraphNode } from '../graph/AtlasGraph';

const IMPACT_GROUPS: { key: string; title: string }[] = [
  { key: 'changedFiles', title: 'Changed files' },
  { key: 'mappedNodes', title: 'Mapped atlas nodes' },
  { key: 'direct', title: 'Direct dependents' },
  { key: 'directDependents', title: 'Direct dependents' },
  { key: 'transitive', title: 'Transitive dependents' },
  { key: 'transitiveDependents', title: 'Transitive dependents' },
  { key: 'dependents', title: 'Returned dependents' },
  { key: 'affectedFiles', title: 'Affected files' },
  { key: 'affectedNodes', title: 'Affected atlas nodes' },
  { key: 'relatedTests', title: 'Related tests' },
  { key: 'unresolved', title: 'Unresolved relationships' },
];

function RenderImpactSet({ title, value, nodes, onSelectNode }: { title: string; value: unknown; nodes: GraphNode[]; onSelectNode: (id: string) => void }) {
  const record = evidenceRecord(value);
  const groups = IMPACT_GROUPS.filter(({ key }) => record?.[key] !== undefined && record[key] !== null);
  const caveat = record?.caveat;
  return (
    <section className="impact-result-set" aria-label={title}>
      <h3>{title}</h3>
      {groups.length > 0 ? groups.map(({ key, title: groupTitle }) => <EvidenceGroup key={key} title={groupTitle} value={record?.[key]} nodes={nodes} onSelectNode={onSelectNode} />) : <p className="evidence-group__empty">No recognized impact collections were returned.</p>}
      {caveat !== undefined && <p className="impact-caveat">{formatEvidence(caveat)}</p>}
      {record && <details className="evidence-raw-details"><summary>Full returned impact response</summary><pre>{formatEvidence(record)}</pre></details>}
    </section>
  );
}

export function ImpactEvidencePanel({ selectedPath, selectedImpact, pullRequestImpact, nodes, onSelectNode }: { selectedPath: string; selectedImpact: unknown; pullRequestImpact: unknown; nodes: GraphNode[]; onSelectNode: (id: string) => void }) {
  const hasSelectedImpact = selectedImpact !== undefined && selectedImpact !== null;
  const hasPullRequestImpact = pullRequestImpact !== undefined && pullRequestImpact !== null;
  return (
    <div className="impact-evidence-panel">
      <p className="impact-selected-file"><span>Selected file or symbol</span><code>{selectedPath}</code></p>
      {hasSelectedImpact && <RenderImpactSet title="Selected-file impact" value={selectedImpact} nodes={nodes} onSelectNode={onSelectNode} />}
      {hasPullRequestImpact && <RenderImpactSet title="Pull-request blast radius" value={pullRequestImpact} nodes={nodes} onSelectNode={onSelectNode} />}
      {!hasSelectedImpact && !hasPullRequestImpact && <p className="evidence-group__empty">Impact evidence appears only when returned by the analyzer.</p>}
      <p className="illustrative-caveat">A structural blast-radius estimate is not a prediction of every runtime failure.</p>
    </div>
  );
}
