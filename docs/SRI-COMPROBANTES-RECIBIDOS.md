# Comprobantes recibidos SRI

Módulo que reúne los comprobantes electrónicos que **otros emiten al RUC del estudio** (facturas de compra, notas de crédito y débito, retenciones, guías de remisión y liquidaciones), los guarda en MongoDB con su XML original y permite contabilizarlos como gastos.

## Cómo funciona (y por qué así)

El SRI **no ofrece un servicio para listar** los comprobantes recibidos: esa lista solo está en SRI en Línea, con usuario, clave y reCAPTCHA. Lo que sí es oficial y público es el servicio web **`AutorizacionComprobantesOffline`**, que devuelve el XML autorizado a partir de la **clave de acceso**. Por eso el módulo trabaja así:

```
Fuentes de claves                       Cola (MongoDB)          SRI oficial              MongoDB
─────────────────                       ──────────────          ───────────              ───────
Reporte TXT de SRI en Línea  ─┐
Clave escaneada / pegada     ─┼──►  sri_claves_pendientes ──► autorizacionComprobante ──► comprobantes_recibidos
XML subidos                  ─┤        (sin duplicados)        (reintentos, timeouts)     (índice único por clave)
Correo IMAP (automático)     ─┤
Webhook de un proveedor API  ─┘
```

- Nunca se pide ni se guarda la clave del SRI y no se evade ningún captcha.
- El XML guardado es siempre **el que devuelve el SRI**, aunque el comprobante llegue por correo o se suba a mano.
- Las claves que fallan por el SRI (caído, sin internet) se reintentan solas; las inválidas o inexistentes se listan en **Fallidas**.

## Configuración (`.env` en la carpeta del proyecto)

```ini
# Base de datos (valor predeterminado si no se define)
MONGODB_URI=mongodb://127.0.0.1:27017/tatoo_quicentro

# RUC del estudio: se rechazan comprobantes emitidos a otro comprador
EMPRESA_RUC=1792847102001

# Llave para cifrar la contraseña del correo (frase larga y aleatoria; no la pierda)
SRI_SECRET_KEY=cambie-esto-por-una-frase-larga-y-aleatoria

# Opcionales
# SRI_WEBHOOK_TOKEN=token-para-un-proveedor-de-api
# SRI_PROGRAMADOR=0          (desactiva la sincronización automática en este equipo)
# SRI_API_PERMITIR_REMOTO=1  (NO recomendado: permite la API desde fuera de la red local)
```

Requisitos: Windows 10/11, Node.js 18+ y MongoDB Community Server instalado como servicio.

## Uso diario

1. Menú **Comprobantes recibidos SRI**.
2. Cargue claves de una de estas formas:
   - **Correo** (recomendado): botón *Correo* → servidor IMAP, usuario y contraseña de aplicación → *Probar conexión* → *Guardar*. Desde entonces cada sincronización lee los correos nuevos en solo lectura.
   - **Reporte TXT**: *SRI en línea* → Facturación electrónica → Comprobantes electrónicos recibidos → consultar → *Descargar reporte* → *Importar reporte TXT*.
   - **Clave de acceso**: escanee el código de barras del RIDE o pegue la clave y presione Enter.
3. Pulse **SINCRONIZAR SRI**: lee el correo, consulta cada clave al SRI y muestra encontrados, nuevos, duplicados y errores.
4. Revise y **contabilice** (facturas, liquidaciones y notas de débito): se crea el gasto con su clave de acceso.

### Sincronización automática

Botón *Automática* → active, elija cada cuánto y el horario. Funciona mientras el sistema esté encendido.
Para que el sistema arranque solo con Windows (una vez, sin permisos de administrador):

```powershell
npm run build
powershell -ExecutionPolicy Bypass -File scripts\windows\instalar-inicio-automatico.ps1
```

Quitarlo: `scripts\windows\desinstalar-inicio-automatico.ps1`. Registro del servidor: `logs\servidor.log`.

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | Sistema en modo desarrollo (puerto 3000) |
| `npm run build` y `npm run server` | Sistema compilado (lo que usa el inicio automático) |
| `npm run sri:test` | Todas las pruebas del módulo (usan la base `tatoo_quicentro_test`, que se borra) |
| `npm run sri:probar -- <clave>` | Consulta claves reales al SRI y guarda los XML en `tmp-sri/` |
| `npm run sri:parser -- archivo.xml` | Analiza XML reales |

## API (solo red local)

| Método | Ruta |
|---|---|
| POST | `/api/sri/sincronizar` · `/api/sri/sincronizar/cancelar` |
| GET | `/api/sri/estado-sincronizacion` · `/api/sri/sincronizaciones` |
| POST | `/api/sri/sincronizacion/automatica` |
| GET · PUT | `/api/sri/correo` · POST `/api/sri/correo/probar` · `/api/sri/correo/leer` |
| POST | `/api/sri/claves` · `/api/sri/xml` · `/api/sri/migrar` |
| GET | `/api/sri/claves?estado=FALLIDA` |
| GET | `/api/sri/comprobantes-recibidos` (filtros `desde`, `hasta`, `tipo`, `estado`, `q`, `pagina`, `porPagina`, `orden`) |
| GET · PATCH | `/api/sri/comprobantes-recibidos/:clave` · GET `…/:clave/xml` |

## Código

`src/server/modules/sri/`: `sri.authorization.ts` (SOAP oficial), `sri.parser.ts` + `parsers/` (6 tipos), `sri.model.ts` (colecciones e índices), `sri.sync.ts` (cola y sincronización), `sri.service.ts`, `sri.controller.ts`, `sri.routes.ts`, `sri.scheduler.ts`, `sources/imap.source.ts`.
Interfaz: `src/components/purchases/ComprobantesRecibidosView.tsx` y `src/components/purchases/sri/`.
