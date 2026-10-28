import { describe, expect, it } from 'vitest';
import { isActiveAnalysisStatus } from './analysisStatus';

describe('isActiveAnalysisStatus', () => {
  it.each([
    'queued',
    'running',
    'validating',
    'ingesting',
    'filtering',
    'parsing',
    'resolving',
    'analyzing',
    'in_progress',
    'Processing',
  ])('recognizes active status %s', (status) => {
    expect(isActiveAnalysisStatus(status)).toBe(true);
  });

  it.each(['ready', 'completed', 'failed', 'cancelled', 'unknown', ''])('does not treat terminal or unknown status %s as active', (status) => {
    expect(isActiveAnalysisStatus(status)).toBe(false);
  });

  it('treats a missing status as inactive', () => {
    expect(isActiveAnalysisStatus(undefined)).toBe(false);
  });
});
