import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  getGraph,
  getHealth,
  getOnboarding,
  searchAnalysis,
  submitGitHubAnalysis,
  submitZipAnalysis,
} from './api';

const jsonResponse = (payload: unknown, status = 200): Response => new Response(JSON.stringify(payload), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CodeDarpan API client', () => {
  it('submits a GitHub repository as the documented JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ runId: 'run-1' }));
    vi.stubGlobal('fetch', fetchMock);

    await submitGitHubAnalysis({ repositoryUrl: 'https://github.com/acme/project', ref: 'main' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/analyses');
    expect(init.method).toBe('POST');
    expect(init.headers).toBeInstanceOf(Headers);
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ repositoryUrl: 'https://github.com/acme/project', ref: 'main' });
  });

  it('submits ZIP content as multipart form data in the file field', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ runId: 'run-zip' }));
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['archive-bytes'], 'project.zip', { type: 'application/zip' });

    await submitZipAnalysis(file);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/analyses');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBe(file);
    expect((init.headers as Headers).has('Content-Type')).toBe(false);
  });

  it('uses the documented file graph view and depth', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ nodes: [], edges: [], groups: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await getGraph('run/one');

    expect(fetchMock).toHaveBeenCalledWith('/api/analyses/run%2Fone/graph?view=file&depth=1', expect.any(Object));
  });

  it('passes a selected graph depth through the documented query parameter', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ nodes: [], edges: [], groups: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await getGraph('run-1', 2);

    expect(fetchMock).toHaveBeenCalledWith('/api/analyses/run-1/graph?view=file&depth=2', expect.any(Object));
  });

  it('passes a selected role and optional issue URL to contributor onboarding', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ steps: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await getOnboarding('run-1', { role: 'maintainer', issueUrl: 'https://github.com/acme/project/issues/2' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analyses/run-1/onboarding?role=maintainer&issueUrl=https%3A%2F%2Fgithub.com%2Facme%2Fproject%2Fissues%2F2',
      expect.any(Object),
    );
  });

  it('rejects graph nodes without returned identifiers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ nodes: [{ name: 'unlinked.ts' }], edges: [], groups: [] })));

    await expect(getGraph('run-1')).rejects.toMatchObject({ kind: 'unsupported-response' });
  });

  it('rejects search matches missing documented line or score values', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      results: [{ nodeId: 'n1', name: 'entry', path: 'src/index.ts', kind: 'file' }],
    })));

    await expect(searchAnalysis('run-1', { q: 'entry' })).rejects.toMatchObject({ kind: 'unsupported-response' });
  });

  it('rejects unknown health JSON fields rather than presenting them as evidence', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ arbitraryScore: 'unknown' })));

    await expect(getHealth('run-1')).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'unsupported-response',
    });
  });

  it('reports a successful non-JSON response explicitly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>unavailable</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })));

    await expect(getGraph('run-1')).rejects.toMatchObject({ kind: 'non-json', status: 200 });
  });

  it('distinguishes a missing route/resource (404)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Not found' }, 404)));

    await expect(getGraph('run-1')).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'not-found',
      status: 404,
      message: 'Not found',
    });
  });

  it('distinguishes rate limiting (429)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Slow down' }, 429)));

    const request = getGraph('run-1');
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({ kind: 'rate-limit', status: 429, message: 'Slow down' });
  });

  it('rejects empty and unsupported successful JSON payloads rather than inventing data', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getGraph('run-1')).rejects.toMatchObject({ kind: 'empty-response' });
    await expect(getGraph('run-1')).rejects.toMatchObject({ kind: 'unsupported-response' });
  });
});
