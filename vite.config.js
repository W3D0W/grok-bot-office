import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function dataFiles() {
  const dir = path.resolve('data');
  const serve = (req, res, next) => {
    const raw = decodeURIComponent((req.url || '').split('?')[0]);
    const marker = '/data/';
    const at = raw.indexOf(marker);
    if (at === -1) return next();
    const name = raw.slice(at + marker.length);
    if (!/^[\w.-]+\.json$/.test(name)) return next();
    const file = path.resolve(dir, name);
    if (!file.startsWith(dir) || !fs.existsSync(file)) return next();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(file).pipe(res);
  };
  const copy = () => {
    const out = path.resolve('dist/data');
    fs.mkdirSync(out, { recursive: true });
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith('.json')) fs.copyFileSync(path.join(dir, name), path.join(out, name));
    }
  };
  return {
    name: 'office-data',
    configureServer(server) { server.middlewares.use(serve); },
    configurePreviewServer(server) { server.middlewares.use(serve); },
    writeBundle: copy,
  };
}

export default defineConfig({
  base: '/grok-bot-office/',
  plugins: [dataFiles()],
  build: { target: 'es2022', chunkSizeWarningLimit: 2500 },
});
