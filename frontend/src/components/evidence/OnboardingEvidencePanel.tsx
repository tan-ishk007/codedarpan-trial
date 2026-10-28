import { EvidenceGroup, EvidenceItemCard, evidenceItems, evidenceRecord, formatEvidence, type EvidenceRecord } from './EvidencePrimitives';
import type { GraphNode } from '../graph/AtlasGraph';

const STEP_KEYS = ['steps', 'route', 'path', 'items'];
const ISSUE_KEYS = ['issues', 'results', 'items'];

function firstPresent(value: EvidenceRecord | null, keys: string[]): unknown {
  if (!value) return undefined;
  for (const key of keys) if (value[key] !== undefined && value[key] !== null) return value[key];
  return undefined;
}

export function OnboardingEvidencePanel({ route, issues, nodes, onSelectNode }: { route: unknown; issues: unknown; nodes: GraphNode[]; onSelectNode: (id: string) => void }) {
  const routeRecord = evidenceRecord(route);
  const issueRecord = evidenceRecord(issues);
  const stepsValue = firstPresent(routeRecord, STEP_KEYS);
  const steps = evidenceItems(stepsValue);
  const issuesValue = firstPresent(issueRecord, ISSUE_KEYS) ?? firstPresent(routeRecord, ['issues']);
  const issueItems = evidenceItems(issuesValue);
  const role = typeof routeRecord?.role === 'string' ? routeRecord.role : undefined;

  return (
    <div className="onboarding-evidence-panel">
      {role && <p className="onboarding-role"><span>Returned contributor role</span><strong>{role}</strong></p>}
      <section className="onboarding-route" aria-labelledby="onboarding-route-title">
        <h3 id="onboarding-route-title">Ordered contributor path<span>{steps.length}</span></h3>
        {steps.length > 0 ? <ol className="onboarding-steps">{steps.map((step, index) => <li key={`route-step-${index}`}><span className="onboarding-step-index" aria-label={`Step ${index + 1}`}>{String(index + 1).padStart(2, '0')}</span><EvidenceItemCard item={step} index={index} nodes={nodes} onSelectNode={onSelectNode} /></li>)}</ol> : <p className="evidence-group__empty">{stepsValue === undefined ? 'No ordered onboarding steps were returned.' : `The analyzer returned no steps: ${formatEvidence(stepsValue)}`}</p>}
      </section>
      {issuesValue !== undefined && <EvidenceGroup title="Returned public issues" value={issueItems} nodes={nodes} onSelectNode={onSelectNode} emptyMessage="No matching public issues were returned." />}
      {!routeRecord && route !== undefined && <details className="evidence-raw-details"><summary>Unstructured returned route</summary><pre>{formatEvidence(route)}</pre></details>}
      {issueRecord && issueItems.length === 0 && issuesValue === undefined && <p className="evidence-group__empty">No matching issue list was returned.</p>}
    </div>
  );
}
