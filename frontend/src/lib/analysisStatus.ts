const ACTIVE_STATUSES = new Set([
  'queued',
  'pending',
  'running',
  'processing',
  'inprogress',
  'validating',
  'validation',
  'ingesting',
  'ingestion',
  'downloading',
  'extracting',
  'filtering',
  'filtered',
  'indexing',
  'parsing',
  'parsed',
  'resolving',
  'resolution',
  'analyzing',
  'analysis',
]);

/** True only for a known non-terminal analyzer status; unknown values remain non-active. */
export function isActiveAnalysisStatus(status: string | undefined): boolean {
  if (!status) return false;
  const normalized = status.trim().toLowerCase().replace(/[\s_-]+/g, '');
  return ACTIVE_STATUSES.has(normalized);
}
