import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const originValue = process.env.CODEDARPAN_PUBLIC_ORIGIN?.trim();
const originUrl = originValue ? new URL(originValue) : null;
if (originUrl && (originUrl.protocol !== 'https:' || originUrl.username || originUrl.password || originUrl.pathname !== '/' || originUrl.search || originUrl.hash || originUrl.hostname.endsWith('.example'))) {
  throw new Error('CODEDARPAN_PUBLIC_ORIGIN must be an owner-configured public HTTPS origin without a path, credentials, query or fragment.');
}
const origin = originUrl?.origin.replace(/\/$/, '') ?? '';
const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const server = await createServer({
  configFile: path.join(root, 'vite.config.ts'),
  root,
  appType: 'custom',
  logLevel: 'error',
  ssr: { resolve: { externalConditions: ['node', 'module-sync'] } },
  server: { middlewareMode: true },
});

try {
  const { AppRoutes, routeMeta } = await server.ssrLoadModule('/src/App.tsx');
  const shell = await readFile(path.join(dist, 'index.html'), 'utf8');

  function withPageHead(template, pathName, title, description, noIndex = false) {
    let html = template;
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
    html = html.replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(description)}" />`);
    html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`);
    html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`);
    html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
    html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
    html = html.replace(/<meta name="robots" content="[^"]*"\s*\/>\n?/g, '');
    html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>\n?/g, '');
    html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/>\n?/g, '');
    if (origin) {
      const canonical = `${origin}${pathName === '/' ? '/' : pathName}`;
      const socialImage = `${origin}/assets/codedarpan-social.png`;
      html = html.replace(/<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${escapeHtml(socialImage)}" />`);
      html = html.replace(/<meta name="twitter:image" content="[^"]*"\s*\/>/, `<meta name="twitter:image" content="${escapeHtml(socialImage)}" />`);
      html = html.replace('</head>', `    <link rel="canonical" href="${escapeHtml(canonical)}" />\n    <meta property="og:url" content="${escapeHtml(canonical)}" />\n  </head>`);
    }
    if (noIndex) html = html.replace('</head>', '    <meta name="robots" content="noindex, nofollow" />\n  </head>');
    return html;
  }

  async function emit(pathName, outputFile, title, description, noIndex = false) {
    const markup = renderToString(React.createElement(
      MemoryRouter,
      { initialEntries: [pathName] },
      React.createElement(AppRoutes),
    ));
    const html = withPageHead(shell, pathName, title, description, noIndex)
      .replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${markup}</div>`);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, html);
  }

  for (const [pathName, meta] of Object.entries(routeMeta)) {
    await emit(pathName, path.join(dist, pathName === '/' ? 'index.html' : `${pathName.slice(1)}/index.html`), meta.title, meta.description, meta.noIndex ?? false);
  }
  await emit('/__codedarpan_not_found__', path.join(dist, '404.html'), 'Page not found | CodeDarpan', 'This address does not match a CodeDarpan page.', true);
  const sitemapPath = path.join(dist, 'sitemap.xml');
  if (origin) {
    const publicRoutes = Object.entries(routeMeta).filter(([, meta]) => !meta.noIndex).map(([route]) => route);
    const xmlRoutes = publicRoutes.map((route) => `  <url><loc>${origin}${route === '/' ? '/' : route}</loc></url>`).join('\n');
    await writeFile(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlRoutes}\n</urlset>\n`);
    const robotsPath = path.join(dist, 'robots.txt');
    const robots = await readFile(robotsPath, 'utf8');
    await writeFile(robotsPath, `${robots.trim()}\nSitemap: ${origin}/sitemap.xml\n`);
  } else {
    await rm(sitemapPath, { force: true });
  }
  console.log('Prerendered public CodeDarpan routes and the noindex 404 document.');
} finally {
  await server.close();
}
