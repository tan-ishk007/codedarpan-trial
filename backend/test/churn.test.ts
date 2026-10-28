import { describe, expect, it, vi } from 'vitest';
import { CHURN_MAX_FILES, getFileChurn } from '../src/churn.js';

const base = { owner: 'octo', repo: 'project', revision: 'a'.repeat(40), paths: ['src/a.ts', 'src/b.ts'] };
const response = (status: number, payload: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => payload }) as Response;

describe('getFileChurn', () => {
  it('returns per-file commit counts and a confirmed zero only from a complete file list', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(200, { files: [{ filename: 'src/a.ts', additions: 4, deletions: 2, changes: 6 }] }));
    const result = await getFileChurn({ ...base, fetch: fetcher });
    expect(result).toEqual({ available: true, files: [
      { path: 'src/a.ts', additions: 4, deletions: 2, changes: 6 },
      { path: 'src/b.ts', additions: 0, deletions: 0, changes: 0 },
    ], caveat: 'Churn sums the analyzed revision and up to 4 first-parent commits (1 examined); it is a bounded recent-history measure.', commitsExamined: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain('/commits/');
  });

  it('marks ZIP history unavailable without making an API call', async () => {
    const fetcher = vi.fn();
    const result = await getFileChurn({ ...base, source: 'zip', fetch: fetcher });
    expect(result.available).toBe(false);
    expect(result.files[0]).toMatchObject({ additions: null, deletions: null });
    expect(result.caveat).toMatch(/ZIP uploads/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not claim zero churn on rate-limit responses', async () => {
    const result = await getFileChurn({ ...base, fetch: vi.fn().mockResolvedValue(response(429, {})) });
    expect(result.available).toBe(false);
    expect(result.files.every(f => f.additions === null && f.deletions === null)).toBe(true);
    expect(result.caveat).toMatch(/rate limit/i);
  });

  it('marks absent paths unknown when GitHub returns a capped file list', async () => {
    const files = Array.from({ length: CHURN_MAX_FILES }, (_, i) => ({ filename: `f${i}`, additions: 1, deletions: 0 }));
    const result = await getFileChurn({ ...base, paths: ['missing.ts'], fetch: vi.fn().mockResolvedValue(response(200, { files })) });
    expect(result.available).toBe(false);
    expect(result.files[0]).toMatchObject({ additions: null, deletions: null, changes: null });
    expect(result.caveat).toMatch(/unknown churn, not zero/);
  });

  it('rejects over-budget requests without calling GitHub', async () => {
    const fetcher = vi.fn();
    const paths = Array.from({ length: CHURN_MAX_FILES + 1 }, (_, i) => `file-${i}.ts`);
    const result = await getFileChurn({ ...base, paths, fetch: fetcher });
    expect(result.available).toBe(false);
    expect(result.files).toHaveLength(paths.length);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('handles unavailable or malformed API data without inventing counts', async () => {
    const result = await getFileChurn({ ...base, fetch: vi.fn().mockResolvedValue(response(200, {})) });
    expect(result.available).toBe(false);
    expect(result.files[0]).toMatchObject({ additions: null, deletions: null, changes: null });
  });
  it('sums file churn across the analyzed revision and its first parent', async () => {
    const fetcher=vi.fn()
      .mockResolvedValueOnce(response(200,{files:[{filename:'src/a.ts',additions:2,deletions:1}],parents:[{sha:'b'.repeat(40)}]}))
      .mockResolvedValueOnce(response(200,{files:[{filename:'src/a.ts',additions:3,deletions:4}],parents:[]}));
    const result=await getFileChurn({...base,fetch:fetcher});
    expect(result.files[0]).toMatchObject({additions:5,deletions:5,changes:10});
    expect(result.commitsExamined).toBe(2);expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
