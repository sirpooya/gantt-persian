import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'node:fs';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Dev mode - serve the app (when running vite dev server)
  if (command === 'serve' || mode === 'development') {
    return {
      plugins: [
        react(),
        {
          name: 'gantt-json-api',
          configureServer(server) {
            const dataFile = path.resolve(process.cwd(), 'data', 'gantt-data.json');
            const assigneesFile = path.resolve(process.cwd(), 'data', 'assignee.json');
            const avatarsDir = path.resolve(process.cwd(), 'data', 'avatars');

            const readData = () => {
              try {
                const raw = fs.readFileSync(dataFile, 'utf8');
                return JSON.parse(raw);
              } catch (e) {
                return { tasks: [], links: [] };
              }
            };

            const writeData = (payload) => {
              fs.mkdirSync(path.dirname(dataFile), { recursive: true });
              fs.writeFileSync(dataFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
            };

            server.middlewares.use('/api/gantt', (req, res, next) => {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');

              if (req.method === 'GET') {
                res.statusCode = 200;
                res.end(JSON.stringify(readData()));
                return;
              }

              if (req.method === 'POST' || req.method === 'PUT') {
                let body = '';
                req.on('data', (chunk) => {
                  body += chunk;
                });
                req.on('end', () => {
                  try {
                    const payload = JSON.parse(body || '{}');
                    const normalized = {
                      tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
                      links: Array.isArray(payload.links) ? payload.links : [],
                    };
                    writeData(normalized);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ ok: true }));
                  } catch (e) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
                  }
                });
                return;
              }

              if (req.method === 'OPTIONS') {
                res.statusCode = 204;
                res.end();
                return;
              }

              next();
            });

            server.middlewares.use('/api/assignees', (req, res, next) => {
              if (req.method !== 'GET') return next();
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              try {
                const raw = fs.readFileSync(assigneesFile, 'utf8');
                res.statusCode = 200;
                res.end(raw);
              } catch (e) {
                res.statusCode = 200;
                res.end('[]');
              }
            });

            // Serve avatars from /data/avatars/*.png (so assignee.json can reference them)
            server.middlewares.use('/data/avatars', (req, res, next) => {
              if (req.method !== 'GET' && req.method !== 'HEAD') return next();
              const urlPath = decodeURIComponent(req.url || '/');
              const rel = urlPath.replace(/^\//, ''); // strip leading slash
              const filePath = path.resolve(avatarsDir, rel);
              // prevent path traversal
              if (!filePath.startsWith(avatarsDir)) return next();
              if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return next();

              const ext = path.extname(filePath).toLowerCase();
              if (ext === '.png') res.setHeader('Content-Type', 'image/png');
              else if (ext === '.jpg' || ext === '.jpeg')
                res.setHeader('Content-Type', 'image/jpeg');
              else res.setHeader('Content-Type', 'application/octet-stream');

              res.statusCode = 200;
              if (req.method === 'HEAD') return res.end();
              fs.createReadStream(filePath).pipe(res);
            });
          },
        },
      ],
      server: {
        port: 5173,
        strictPort: true,
        open: true,
      },
      // Don't externalize dependencies in dev mode - bundle everything
      optimizeDeps: {
        // Only scan our actual app entry to avoid unrelated HTML files in repo
        entries: ['index.html'],
        include: ['react', 'react-dom', 'react/jsx-runtime'],
      },
      // Ensure we're not building as a library in dev mode
      build: undefined,
    };
  }

  // Check if we're building demos
  const isDemoBuild = process.env.BUILD_DEMOS === 'true';
  // Check if we're building full CSS
  const isFullCssBuild = process.env.BUILD_FULL_CSS === 'true';

  if (isDemoBuild) {
    // Demo build configuration - includes all dependencies
    return {
      plugins: [react()],
      base: './',
      build: {
        outDir: 'dist-demos',
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'index.html'),
          },
        },
      },
    };
  }

  const rollupOptions = {
    output: {
      assetFileNames: 'index.css',
    },
    external: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
    ],
  };

  const rollupOptionsStrict = {
    ...rollupOptions,
    external: [
      ...rollupOptions.external,
      /^@wx\//, // matches all modules starting with "@wx/"
      /^@svar-ui\//, // matches all modules starting with "@wx/"
    ],
  };

  if (isFullCssBuild) {
    // Full CSS build configuration - includes base styles and component styles
    return {
      plugins: [react()],
      build: {
        outDir: 'dist-full',
        lib: {
          entry: resolve(__dirname, 'src/full-css.js'),
          fileName: 'index',
          formats: ['es'],
        },
        rollupOptions,
      },
    };
  }

  // Library build configuration (original)
  return {
    plugins: [react()],
    build: {
      sourcemap: true,
      lib: {
        //eslint-disable-next-line no-undef
        entry: resolve(__dirname, 'src/index.js'),
        fileName: (format) => (format === 'cjs' ? 'index.cjs' : 'index.es.js'),
        formats: ['es', 'cjs'],
      },
      rollupOptions: rollupOptionsStrict,
    },
  };
});
