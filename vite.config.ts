import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { consultarIdentificacionSriBackend, consultarRucSriBackend } from './src/utils/sriServerHandler.ts';
import { sequenceMiddleware } from './src/utils/sequenceServer.ts';
import { sriAutorizacionMiddleware } from './src/utils/sriAutorizacionServer.ts';
import { comprasWebhookMiddleware } from './src/utils/comprasWebhookServer.ts';
import { sriMiddleware } from './src/server/modules/sri/sri.routes.ts';
import { detenerProgramador, iniciarProgramador } from './src/server/modules/sri/sri.scheduler.ts';

function sriDevApiPlugin(): Plugin {
  return {
    name: 'sri-dev-api',
    // Numeración central de documentos (también disponible con `vite preview`)
    configurePreviewServer(server) {
      server.middlewares.use(sequenceMiddleware);
      server.middlewares.use(sriAutorizacionMiddleware);
      server.middlewares.use(comprasWebhookMiddleware);
      server.middlewares.use(sriMiddleware());
    },
    configureServer(server) {
      server.middlewares.use(sequenceMiddleware);
      server.middlewares.use(sriAutorizacionMiddleware);
      server.middlewares.use(comprasWebhookMiddleware);
      // Comprobantes recibidos SRI (MongoDB): /api/sri/sincronizar, /api/sri/comprobantes-recibidos, …
      server.middlewares.use(sriMiddleware());
      // Sincronización automática mientras el servidor esté encendido
      iniciarProgramador();
      server.httpServer?.once('close', detenerProgramador);
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

export default defineConfig(({ mode }) => {
  // Variables del servidor (sin prefijo VITE_, nunca llegan al navegador) para el webhook de compras
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of ['SRI_WEBHOOK_TOKEN', 'EMPRESA_RUC', 'COMPRAS_RECIBIDAS_PATH', 'MONGODB_URI', 'SRI_SECRET_KEY', 'SRI_API_PERMITIR_REMOTO', 'SRI_PROGRAMADOR']) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }
  return {
    plugins: [react(), tailwindcss(), sriDevApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
  };
});
