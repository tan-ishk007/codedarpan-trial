import { describe, expect, it } from 'vitest';
import { buildOnboardingRoute } from '../src/onboarding.js';

describe('buildOnboardingRoute', () => {
  it('prioritizes issue-mentioned files, related tests, role context, then simple connected modules', () => {
    const route = buildOnboardingRoute({
      role: 'backend developer',
      issueText: 'Fix src/auth.ts token refresh behavior',
      files: [
        { path: 'README.md', nodeId: 'readme', kind: 'file' },
        { path: 'backend/server.ts', nodeId: 'server', complexity: 8 },
        { path: 'src/auth.ts', nodeId: 'auth', complexity: 7, symbols: [{ name: 'refreshToken', line: 12 }] },
        { path: 'test/auth.test.ts', nodeId: 'test', complexity: 3 },
        { path: 'src/codec.ts', nodeId: 'codec', complexity: 2, symbols: [{ name: 'decode' }] },
        { path: 'src/heavy.ts', nodeId: 'heavy', complexity: 12 },
        { path: 'src/isolated.ts', nodeId: 'isolated', complexity: 1 },
      ],
      resolvedImports: [
        { source: 'test/auth.test.ts', target: 'src/auth.ts', type: 'import' },
        { source: 'src/auth.ts', target: 'src/codec.ts', type: 'import' },
        { source: 'src/auth.ts', target: 'src/heavy.ts', type: 'import' },
      ],
    });
    expect(route.map(item => item.path)).toEqual([
      'src/auth.ts', 'test/auth.test.ts', 'README.md', 'backend/server.ts',
      'src/codec.ts', 'src/heavy.ts', 'src/isolated.ts',
    ]);
    expect(route[0].reason).toContain('issue text explicitly mentions');
    expect(route[0].evidence.join(' ')).toContain('Issue text contains');
    expect(route[1].evidence.join(' ')).toContain('Resolved imports: src/auth.ts');
    expect(route[4].evidence.join(' ')).toContain('Declared symbols: decode');
    expect(route[6].reason).toContain('No resolved-import connection');
    expect(route.every(item => item.path && item.nodeId && item.title && item.reason && item.evidence.length)).toBe(true);
  });

  it('does not invent issue context and is stable for duplicate or unordered edges', () => {
    const input = {
      files: [
        { path: 'z.ts', id: 'z', complexity: 2 },
        { path: 'a.ts', id: 'a', complexity: 2 },
        { path: 'm.ts', id: 'm', complexity: 2 },
      ],
      issueText: 'The reported crash is mysterious; no file named in this report.',
      resolvedImports: [
        { source: 'a.ts', target: 'm.ts', type: 'import' },
        { source: 'a.ts', target: 'm.ts', type: 'import' },
      ],
    };
    const first = buildOnboardingRoute(input);
    const second = buildOnboardingRoute({ ...input, resolvedImports: [...input.resolvedImports].reverse() });
    expect(first).toEqual(second);
    expect(first[0].path).toBe('a.ts');
    expect(first.find(item => item.path === 'z.ts')?.evidence.join(' ')).not.toMatch(/issue mentions|Issue text contains/i);
  });

  it('uses file path as node identifier fallback and respects limits', () => {
    const route = buildOnboardingRoute({ files: [{ path: 'src/one.ts' }, { path: 'src/two.ts' }], limit: 1 });
    expect(route).toHaveLength(1);
    expect(route[0].nodeId).toBe(route[0].path);
  });
});
