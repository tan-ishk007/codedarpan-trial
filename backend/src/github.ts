export function githubHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'User-Agent': 'CodeDarpan/1.0',
    Accept: 'application/vnd.github+json',
    ...extra,
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };
}
