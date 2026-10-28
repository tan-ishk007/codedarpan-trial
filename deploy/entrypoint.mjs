import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';

const appRoot = resolve(process.env.APP_ROOT || '/app');
const root = resolve(appRoot, 'frontend/dist');
const backendPort = Number(process.env.BACKEND_PORT || 3001);
const port = Number(process.env.PORT || 3000);
const mime = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

const backend = spawn(process.execPath, [resolve(appRoot, 'backend/dist/server.js')], {
  env: { ...process.env, PORT: String(backendPort) },
  stdio: 'inherit',
});
backend.on('exit', (code, signal) => {
  console.error(`Express backend exited (code=${code}, signal=${signal}); stopping gateway.`);
  process.exit(code ?? 1);
});

const server = createServer((req, res) => {
  if (req.url?.startsWith('/api/')) {
    const upstream = httpRequest({
      hostname: '127.0.0.1', port: backendPort, method: req.method,
      path: req.url, headers: { ...req.headers, host: `127.0.0.1:${backendPort}` },
    }, (response) => {
      res.writeHead(response.statusCode || 502, response.headers);
      response.pipe(res);
    });
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: 'API service unavailable.' }));
    });
    req.pipe(upstream);
    return;
  }

  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }
  const requested = resolve(root, `.${pathname}`);
  if (requested !== root && !requested.startsWith(root + sep)) {
    res.writeHead(404).end('Not found'); return;
  }
  const file = existsSync(requested) && statSync(requested).isFile() ? requested : resolve(root, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

server.listen(port, '0.0.0.0', () => console.log(`CodeDarpan gateway listening on ${port}`));
function shutdown() {
  server.close();
  backend.kill('SIGTERM');
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
