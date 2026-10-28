import { afterEach, describe, expect, it, vi } from 'vitest';
import { githubHeaders } from '../src/github.js';

afterEach(() => vi.unstubAllEnvs());

describe('githubHeaders', () => {
  it('uses the public unauthenticated headers by default', () => {
    expect(githubHeaders()).toEqual({
      'User-Agent': 'CodeDarpan/1.0',
      Accept: 'application/vnd.github+json',
    });
  });

  it('adds a bearer token without exposing it in source defaults', () => {
    vi.stubEnv('GITHUB_TOKEN', 'test-token');
    expect(githubHeaders()).toMatchObject({ Authorization: 'Bearer test-token' });
  });
});
