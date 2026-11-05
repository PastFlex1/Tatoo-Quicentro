import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { consultarIdentificacionSriBackend, consultarRucSriBackend } from './src/utils/sriServerHandler.ts';
import { sequenceMiddleware } from './src/utils/sequenceServer.ts';

function sriDevApiPlugin(): Plugin {
  return {
    name: 'sri-dev-api',
    // Numeración central de documentos (también disponible con `vite preview`)
    configurePreviewServer(server) {
      server.middlewares.use(sequenceMiddleware);
    },
    configureServer(server) {
      server.middlewares.use(sequenceMiddleware);
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        const urlObj = new URL(rawUrl, 'http://localhost:3000');
        const pathname = urlObj.pathname;

        // 1. /api/sri/ruc/:ruc
        if (pathname.startsWith('/api/sri/ruc/')) {
          const ruc = pathname.replace('/api/sri/ruc/', '').trim();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          try {
            const result = await consultarRucSriBackend(ruc);
            res.statusCode = result.found ? 200 : 404;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ found: false, error: err.message || 'Error en consulta SRI' }));
          }
          return;
        }

        // 2. /api/sri/consultar-ruc/:ruc
        if (pathname.startsWith('/api/sri/consultar-ruc/')) {
          const ruc = pathname.replace('/api/sri/consultar-ruc/', '').trim();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          try {
            const result = await consultarRucSriBackend(ruc);
            res.statusCode = result.found ? 200 : 404;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ found: false, error: err.message || 'Error en consulta SRI' }));
          }
          return;
        }

        // 3. /api/sri/consultar-cedula/:cedula
        if (pathname.startsWith('/api/sri/consultar-cedula/')) {
          const rawId = pathname.replace('/api/sri/consultar-cedula/', '').trim();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          try {
            const result = await consultarIdentificacionSriBackend(rawId);
            res.statusCode = result.success ? 200 : 404;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, found: false, error: err.message || 'Error en consulta de cédula' }));
          }
          return;
        }

        // 4. /api/cedula?identificacion=...
        if (pathname === '/api/cedula') {
          const rawId = urlObj.searchParams.get('identificacion') || urlObj.searchParams.get('cedula') || '';
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          try {
            const result = await consultarIdentificacionSriBackend(rawId);
            res.statusCode = result.success ? 200 : 404;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, found: false, error: err.message || 'Error en consulta de cédula' }));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), sriDevApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
  };
});
