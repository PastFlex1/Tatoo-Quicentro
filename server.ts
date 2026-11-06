import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { consultarIdentificacionSriBackend, consultarRucSriBackend } from './src/utils/sriServerHandler.ts';
import { sequenceMiddleware } from './src/utils/sequenceServer.ts';
import { sriAutorizacionMiddleware } from './src/utils/sriAutorizacionServer.ts';
import { comprasWebhookMiddleware } from './src/utils/comprasWebhookServer.ts';
import { sriMiddleware } from './src/server/modules/sri/sri.routes.ts';
import { cerrarMongo } from './src/server/db/mongo.ts';
import { cancelarSincronizacion } from './src/server/modules/sri/sri.service.ts';
import { detenerProgramador, iniciarProgramador } from './src/server/modules/sri/sri.scheduler.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: '15mb' }));
  app.use(express.text({ limit: '15mb', type: ['text/plain', 'application/xml', 'text/xml'] }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Devolution Ink Tattoo Studio - SRI API & POS',
      timestamp: new Date().toISOString()
    });
  });

  // Numeración central de documentos: /api/sequence/state · /next · /set · /log
  app.use(sequenceMiddleware);

  // Comprobantes recibidos: XML autorizado por clave de acceso (servicio público del SRI)
  app.use(sriAutorizacionMiddleware);

  // Webhook de compras: POST /api/v1/compras/sri-webhook (token) · GET /api/v1/compras/recibidas
  app.use(comprasWebhookMiddleware);

  // Comprobantes recibidos SRI (MongoDB): /api/sri/sincronizar, /api/sri/comprobantes-recibidos, …
  app.use(sriMiddleware());
  // Sincronización automática mientras el servidor esté encendido
  iniciarProgramador();

  // ==============================================================
  // SRI & REGISTRO CIVIL ENDPOINTS (Catastro, Persona, SECAP)
  // ==============================================================

  // 1. Consultar RUC completo (Catastro Consolidado Contribuyente SRI)
  app.get('/api/sri/ruc/:ruc', async (req, res) => {
    try {
      const result = await consultarRucSriBackend(req.params.ruc);
      res.status(result.found ? 200 : 404).json(result);
    } catch (err: any) {
      res.status(500).json({ found: false, error: err.message || 'Error consultando RUC en SRI' });
    }
  });

  // 2. Consultar Cédula y Pasaporte (4 niveles: Persona SRI, Catastro, SRI Móvil, SECAP)
  app.get('/api/sri/consultar-cedula/:cedula', async (req, res) => {
    try {
      const result = await consultarIdentificacionSriBackend(req.params.cedula);
      res.status(result.success ? 200 : 404).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, found: false, error: err.message || 'Error consultando cédula' });
    }
  });

  // 3. Consultar Identificación alias
  app.get('/api/cedula', async (req, res) => {
    const rawId = (req.query.identificacion as string) || (req.query.cedula as string) || '';
    try {
      const result = await consultarIdentificacionSriBackend(rawId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, found: false, error: err.message || 'Error consultando identificación' });
    }
  });

  // 4. Consultar RUC alias
  app.get('/api/sri/consultar-ruc/:ruc', async (req, res) => {
    const ruc = (req.params.ruc || '').replace(/\D/g, '');
    try {
      const result = await consultarRucSriBackend(ruc);
      res.status(result.found ? 200 : 404).json(result);
    } catch (err: any) {
      res.status(500).json({ found: false, error: err.message || 'Error consultando RUC' });
    }
  });

  // Static files (dist directory)
  const candidateDistPaths = [
    path.join(__dirname, 'dist'),
    path.join(process.cwd(), 'dist'),
  ];

  const distPath = candidateDistPaths.find((dir) => {
    return fs.existsSync(path.join(dir, 'index.html')) && fs.existsSync(path.join(dir, 'assets'));
  }) || (fs.existsSync(path.join(process.cwd(), 'dist', 'index.html')) ? path.join(process.cwd(), 'dist') : __dirname);

  console.log(`[Express] Sirviendo archivos estáticos desde: ${distPath}`);
  app.use(express.static(distPath));

  // Express 5: el comodín debe tener nombre
  app.get('/{*ruta}', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint API no encontrado' });
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('index.html no encontrado en ' + distPath);
    }
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ⚡ Devolution Ink Tattoo Studio - Servidor SRI & POS listo en puerto ${PORT}:`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/\n`);
  });

  // Cierre ordenado (Ctrl+C o apagado de Windows): la sincronización en curso se cancela,
  // sus claves pendientes quedan en la cola y se cierra la conexión a MongoDB.
  let cerrando = false;
  const cerrar = async (senal: string) => {
    if (cerrando) return;
    cerrando = true;
    console.log(`\n[Servidor] ${senal} recibido: cerrando…`);
    detenerProgramador();
    cancelarSincronizacion();
    httpServer.close();
    await cerrarMongo().catch(() => {});
    process.exitCode = 0;
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', () => void cerrar('SIGINT'));
  process.on('SIGTERM', () => void cerrar('SIGTERM'));
}

// Iniciar servidor si se ejecuta directamente con Node / tsx
if (process.env.RUN_STANDALONE_SERVER === 'true' || process.argv.includes('--start-server')) {
  startServer();
}

export { startServer };

