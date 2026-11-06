/**
 * Rutas del módulo de comprobantes recibidos del SRI.
 *
 *   POST   /api/sri/sincronizar                              { desde?, hasta? }  → 202 | 409
 *   POST   /api/sri/sincronizar/cancelar
 *   GET    /api/sri/estado-sincronizacion
 *   GET    /api/sri/sincronizaciones?limite=20
 *   POST   /api/sri/sincronizacion/automatica                { activa, cadaMinutos, horaInicio, horaFin }
 *   GET    /api/sri/correo                                    configuración del buzón (sin contraseña)
 *   PUT    /api/sri/correo                                    { activo, host, puerto, seguro, usuario, contrasena?, carpeta, diasAtras }
 *   POST   /api/sri/correo/probar · /api/sri/correo/leer
 *   POST   /api/sri/claves                                    { texto | claves[], fuente?, sincronizar? }  (también text/plain)
 *   GET    /api/sri/claves?estado=FALLIDA&pagina=1
 *   POST   /api/sri/migrar                                    { comprobantes: [{ claveAcceso, xml?, estadoProcesamiento?, expenseId? }] }
 *   POST   /api/sri/xml                                       { archivos: [{ nombre, contenido }], sincronizar? }
 *   GET    /api/sri/comprobantes-recibidos?desde&hasta&tipo&estado&q&pagina&porPagina&orden
 *   GET    /api/sri/comprobantes-recibidos/:clave
 *   GET    /api/sri/comprobantes-recibidos/:clave/xml[?descargar=1]
 *   PATCH  /api/sri/comprobantes-recibidos/:clave            { estadoProcesamiento?, expenseId?, observacion? }
 *
 * Todas solo desde la red local. Se montan igual en el servidor de Vite (desarrollo) y en server.ts.
 */
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { soloRedLocal } from '../../middleware/localOnly.ts';
import * as c from './sri.controller.ts';

export function crearSriRouter() {
  const r = express.Router();
  r.use(soloRedLocal);
  r.use(express.json({ limit: '25mb' }));
  r.use(express.text({ type: 'text/plain', limit: '5mb' }));

  r.post('/api/sri/sincronizar', c.sincronizar);
  r.post('/api/sri/sincronizar/cancelar', c.cancelar);
  r.get('/api/sri/estado-sincronizacion', c.estado);
  r.get('/api/sri/sincronizaciones', c.historial);
  r.post('/api/sri/sincronizacion/automatica', c.automatica);

  r.get('/api/sri/correo', c.obtenerCorreo);
  r.put('/api/sri/correo', c.guardarCorreo);
  r.post('/api/sri/correo/probar', c.probarCorreo);
  r.post('/api/sri/correo/leer', c.leerCorreo);

  r.post('/api/sri/claves', c.agregarClaves);
  r.get('/api/sri/claves', c.listarClaves);
  r.post('/api/sri/xml', c.agregarXml);
  r.post('/api/sri/migrar', c.migrar);

  r.get('/api/sri/comprobantes-recibidos', c.listar);
  r.get('/api/sri/comprobantes-recibidos/:clave', c.detalle);
  r.get('/api/sri/comprobantes-recibidos/:clave/xml', c.xml);
  r.patch('/api/sri/comprobantes-recibidos/:clave', c.actualizar);

  r.use(c.manejarErrores);
  return r;
}

/** Rutas de este módulo (las demás /api/sri/… —RUC, cédula, consulta por clave— siguen en sus middlewares) */
const RUTAS = /^\/api\/sri\/(sincronizar(\/cancelar)?|estado-sincronizacion|sincronizaciones|sincronizacion\/automatica|correo(\/(probar|leer))?|claves|xml|migrar|comprobantes-recibidos(\/\d+(\/xml)?)?)\/?$/;

/**
 * Middleware para Vite (connect) y para server.ts (Express): una mini-app Express que solo atiende las rutas del módulo,
 * así no altera las peticiones del resto de la aplicación.
 */
export function sriMiddleware() {
  const app = express();
  app.disable('x-powered-by');
  app.use(crearSriRouter());
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = (req.url || '').split('?')[0];
    if (!RUTAS.test(path)) return next();
    app(req as unknown as Request, res as unknown as Response, ((err?: unknown) => {
      // Método no soportado en una ruta del módulo
      if (!res.headersSent) {
        res.statusCode = err ? 500 : 405;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: err ? 'Error interno del servidor.' : 'Método no permitido en esta ruta.' }));
      }
    }) as NextFunction);
  };
}
