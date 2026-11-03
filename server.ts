import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { consultarIdentificacionSriBackend, consultarRucSriBackend } from './src/utils/sriServerHandler.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Persistent counters storage path
const COUNTERS_FILE = process.env.COUNTERS_PATH || (
  fs.existsSync(path.join(__dirname, 'data_counters.json'))
    ? path.join(__dirname, 'data_counters.json')
    : path.join(process.cwd(), 'data_counters.json')
);

// Default initial counters
let documentCounters: Record<string, number> = {
  nota_venta: 1,
  cotizacion: 1, // Proformas
  factura: 1,
  ticket_pos: 1,
};

// Load saved counters if available
try {
  if (fs.existsSync(COUNTERS_FILE)) {
    const data = fs.readFileSync(COUNTERS_FILE, 'utf-8');
    documentCounters = { ...documentCounters, ...JSON.parse(data) };
  }
} catch (err) {
  console.warn('Could not read counters file, using defaults:', err);
}

// Save counters helper
function saveCounters() {
  try {
    fs.writeFileSync(COUNTERS_FILE, JSON.stringify(documentCounters, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving counters to disk:', err);
  }
}

// Mutex promise queue for atomic safe sequential allocation
let sequentialMutex = Promise.resolve();

async function getNextSequentialSafe(docType: string): Promise<number> {
  return new Promise((resolve) => {
    sequentialMutex = sequentialMutex.then(async () => {
      if (typeof documentCounters[docType] !== 'number') {
        documentCounters[docType] = 1;
      }
      const nextVal = documentCounters[docType];
      documentCounters[docType] = nextVal + 1;
      saveCounters();
      resolve(nextVal);
    });
  });
}

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

  // Query current sequential counters
  app.get('/api/documents/counters', (req, res) => {
    res.json({
      counters: documentCounters,
      timestamp: new Date().toISOString(),
    });
  });

  // Atomic safe consecutive sequential generator (#000000 format)
  app.post('/api/documents/next-sequential', async (req, res) => {
    try {
      const { documentType, branchId = '001', registerId = '001' } = req.body;
      const validTypes = ['nota_venta', 'cotizacion', 'factura', 'ticket_pos'];
      const typeKey = validTypes.includes(documentType) ? documentType : 'nota_venta';
      const seqNumber = await getNextSequentialSafe(typeKey);

      // Generate format #000000
      const formattedCode = `#${String(seqNumber).padStart(6, '0')}`;
      const sriInvoiceCode = `${branchId.padStart(3, '0')}-${registerId.padStart(3, '0')}-${String(seqNumber).padStart(9, '0')}`;

      res.json({
        success: true,
        documentType: typeKey,
        sequentialNumber: seqNumber,
        formattedNumber: formattedCode,
        sriCode: typeKey === 'factura' ? sriInvoiceCode : undefined,
        branchId,
        registerId,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error generating safe sequential:', err);
      res.status(500).json({ error: 'Error generating sequential number' });
    }
  });

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

  app.get('*', (req, res) => {
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
}

// Iniciar servidor si se ejecuta directamente con Node / tsx
if (process.env.RUN_STANDALONE_SERVER === 'true' || process.argv.includes('--start-server')) {
  startServer();
}

export { startServer };

