import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Inbox,
  ExternalLink,
  FileText,
  ScanLine,
  FileCode,
  Download,
  Eye,
  FileCheck2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { usePermission } from '../../hooks/usePermission';
import { useAlertModal } from '../../context/AlertModalContext';
import { UiSelect } from '../common/UiSelect';
import { DatePicker, toDateKey } from '../common/DatePicker';
import { autoCategorizeSriExpense } from '../../utils/sriXmlParser';
import { extraerClavesAcceso } from '../../utils/claveAcceso';
import { buildZip, downloadBlob } from '../../services/comprobantesRecibidosService';
import { ApiError, sriApi } from '../../services/sriRecibidosApi';
import type { ComprobanteApi, CorreoConfig, EstadoSync, Paginacion, ResumenListado } from '../../services/sriRecibidosApi';
import type { ExpenseCategory, ExpenseRecord } from '../../types';
import { SyncStatusPanel } from './sri/SyncStatusPanel';
import { ComprobanteDetalleModal } from './sri/ComprobanteDetalleModal';
import { AutoSyncModal, ClavesFallidasModal, ContabilizarModal, CorreoModal } from './sri/SriModales';
import { CONTABILIZABLES, ESTADOS, TIPOS, diaEc, tipoDe, ui } from './sri/sriUi';

const SRI_EN_LINEA_URL = 'https://srienlinea.sri.gob.ec/sri-en-linea/inicio/NAT';
const MIGRADO_KEY = 'inkledger_received_docs_migrated_v1';
const POR_PAGINA = 25;

const mesActual = () => {
  const n = new Date();
  return { desde: toDateKey(new Date(n.getFullYear(), n.getMonth(), 1)), hasta: toDateKey(new Date(n.getFullYear(), n.getMonth() + 1, 0)) };
};

type Aviso = { tipo: 'ok' | 'info' | 'error'; texto: string } | null;

/** Bandeja "Comprobantes recibidos SRI": datos en MongoDB a través de /api/sri/*. */
export const ComprobantesRecibidosView: React.FC = () => {
  const { expenses, addExpense, suppliers, addSupplier, formatMoney, settings, comprobantesRecibidos, deleteComprobanteRecibido } = useStudio();
  const { can, guard } = usePermission();
  const { showAlert } = useAlertModal();
  const puedeImportar = can('expenses.import_xml');
  const puedeContabilizar = can('expenses.create');
  const rucEstudio = (settings.ruc || settings.taxId || '').replace(/\D/g, '');

  // ------------------------------------------------------------------ filtros y datos
  const [{ desde, hasta }, setRango] = useState(mesActual);
  const [tipo, setTipo] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [items, setItems] = useState<ComprobanteApi[]>([]);
  const [paginacion, setPaginacion] = useState<Paginacion | null>(null);
  const [resumen, setResumen] = useState<ResumenListado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  // Búsqueda con pausa para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);
  useEffect(() => setPagina(1), [desde, hasta, tipo, estadoFiltro, q]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await sriApi.listar({ desde, hasta, tipo: tipo || undefined, estado: estadoFiltro || undefined, q: q || undefined, pagina, porPagina: POR_PAGINA });
      setItems(r.items);
      setPaginacion(r.paginacion);
      setResumen(r.resumen);
      setErrorLista(null);
    } catch (e) {
      setErrorLista(e instanceof Error ? e.message : 'No se pudo cargar la bandeja.');
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, tipo, estadoFiltro, q, pagina]);
  useEffect(() => void cargar(), [cargar]);

  // ------------------------------------------------------------------ estado de la sincronización (en vivo)
  const [estado, setEstado] = useState<EstadoSync | null>(null);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);
  const enCursoAntes = useRef(false);
  const refrescarEstado = useCallback(async () => {
    try {
      const e = await sriApi.estado();
      setEstado(e);
      setErrorEstado(null);
      if (enCursoAntes.current && !e.enCurso) {
        void cargar();
        const u = e.ultima;
        if (u) setAviso({ tipo: u.errores ? 'info' : 'ok', texto: `Sincronización terminada: ${u.encontrados} encontrados, ${u.nuevos} nuevos, ${u.duplicados} duplicados, ${u.errores} con error.` });
      }
      enCursoAntes.current = e.enCurso;
    } catch (e) {
      setErrorEstado(e instanceof Error ? e.message : 'Sin conexión');
    }
  }, [cargar]);
  useEffect(() => {
    void refrescarEstado();
    const t = setInterval(() => void refrescarEstado(), estado?.enCurso ? 1500 : 15000);
    return () => clearInterval(t);
  }, [refrescarEstado, estado?.enCurso]);

  // Buzón de correo (fuente IMAP)
  const [correo, setCorreo] = useState<CorreoConfig | null>(null);
  const [verCorreo, setVerCorreo] = useState(false);
  const cargarCorreo = useCallback(() => sriApi.obtenerCorreo().then(r => setCorreo(r.correo)).catch(() => null), []);
  useEffect(() => void cargarCorreo(), [cargarCorreo]);

  const [iniciando, setIniciando] = useState(false);
  const sincronizar = async () => {
    if (!guard('expenses.import_xml')) return;
    setIniciando(true);
    try {
      const r = await sriApi.sincronizar({ desde, hasta });
      enCursoAntes.current = true;
      const c = r.correo;
      setAviso(
        c.error
          ? { tipo: 'error', texto: `Correo: ${c.error} La sincronización continúa con las claves en cola.` }
          : c.omitido
          ? null
          : { tipo: 'info', texto: `Correo revisado: ${c.mensajes} correos nuevos, ${c.claves} claves (${c.encoladas} nuevas en cola). Consultando al SRI…` }
      );
      void refrescarEstado();
      void cargarCorreo();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) showAlert({ title: 'Ya hay una sincronización en curso', message: 'Espere a que termine; el panel muestra su avance.', type: 'info' });
      else showAlert({ title: 'No se pudo sincronizar', message: e instanceof Error ? e.message : String(e), type: 'error' });
    } finally {
      setIniciando(false);
    }
  };

  // ------------------------------------------------------------------ entrada de claves (TXT, escáner, XML)
  const [claveInput, setClaveInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const txtRef = useRef<HTMLInputElement>(null);
  const xmlRef = useRef<HTMLInputElement>(null);

  const resultadoClaves = (r: { recibidas: number; encoladas: number; yaRegistradas: number; invalidas: string[]; reactivadas: number }, origen: string) => {
    const partes = [`${r.recibidas} clave(s) válidas`];
    if (r.encoladas + r.reactivadas) partes.push(`${r.encoladas + r.reactivadas} nuevas en cola`);
    if (r.yaRegistradas) partes.push(`${r.yaRegistradas} ya estaban registradas`);
    if (r.invalidas.length) partes.push(`${r.invalidas.length} inválidas`);
    setAviso({ tipo: r.recibidas ? 'ok' : 'error', texto: `${origen}: ${partes.join(' · ')}.${r.encoladas + r.reactivadas ? ' Sincronizando con el SRI…' : ''}` });
    if (r.encoladas + r.reactivadas) enCursoAntes.current = true;
    void refrescarEstado();
  };

  const enviarClaves = async (texto: string, fuente: 'TXT' | 'CLAVE', origen: string) => {
    if (!guard('expenses.import_xml')) return;
    if (!extraerClavesAcceso(texto).validas.length && fuente === 'CLAVE') {
      setAviso({ tipo: 'error', texto: 'No se encontró ninguna clave de acceso válida de 49 dígitos.' });
      return;
    }
    setEnviando(true);
    try {
      resultadoClaves(await sriApi.agregarClaves({ texto, fuente, sincronizar: true }), origen);
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setEnviando(false);
    }
  };

  const onTxt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const texto = (await Promise.all(files.map(f => f.text()))).join('\n');
    await enviarClaves(texto, 'TXT', files.length === 1 ? files[0].name : `${files.length} reportes`);
  };

  const onXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!guard('expenses.import_xml')) return;
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setEnviando(true);
    try {
      const archivos = await Promise.all(files.map(async f => ({ nombre: f.name, contenido: await f.text() })));
      const r = await sriApi.agregarXml(archivos, true);
      if (r.encolado) resultadoClaves(r.encolado, `${files.length} XML`);
      if (r.errores.length) setAviso({ tipo: 'error', texto: `${r.errores.length} archivo(s) no son comprobantes válidos: ${r.errores.map(x => x.nombre).join(', ')}` });
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : String(err) });
    } finally {
      setEnviando(false);
    }
  };

  // ------------------------------------------------------------------ migración de la bandeja antigua (navegador → MongoDB)
  const migrando = useRef(false);
  useEffect(() => {
    if (migrando.current || !comprobantesRecibidos.length) return;
    let yaMigrado = false;
    try {
      yaMigrado = localStorage.getItem(MIGRADO_KEY) === '1';
    } catch {
      /* sin almacenamiento */
    }
    if (yaMigrado) return;
    migrando.current = true;
    sriApi
      .migrar(
        comprobantesRecibidos.map(c => ({
          claveAcceso: c.claveAcceso,
          xml: c.xmlOriginal || undefined,
          estadoProcesamiento: c.estado === 'CONTABILIZADO' || c.estado === 'REVISADO' ? c.estado : undefined,
          expenseId: c.expenseId,
        }))
      )
      .then(r => {
        if (r.errores.length === 0) {
          comprobantesRecibidos.forEach(c => deleteComprobanteRecibido(c.id));
          try {
            localStorage.setItem(MIGRADO_KEY, '1');
          } catch {
            /* sin almacenamiento */
          }
        }
        setAviso({
          tipo: r.errores.length ? 'error' : 'ok',
          texto: `Bandeja anterior pasada a la base de datos: ${r.nuevos} comprobantes, ${r.duplicados} ya existían, ${r.encolados} se traerán del SRI${r.errores.length ? `, ${r.errores.length} con error (se reintentará)` : ''}.`,
        });
        void cargar();
        void refrescarEstado();
      })
      .catch(() => {
        migrando.current = false; // se reintenta la próxima vez que se abra la bandeja
      });
  }, [comprobantesRecibidos, deleteComprobanteRecibido, cargar, refrescarEstado]);

  // ------------------------------------------------------------------ proveedores: alta automática de los RUC nuevos
  const proveedoresConocidos = useRef(new Set<string>());
  useEffect(() => {
    suppliers.forEach(s => proveedoresConocidos.current.add((s.ruc || '').replace(/\D/g, '')));
  }, [suppliers]);
  useEffect(() => {
    for (const c of items) {
      // Las retenciones y guías no las emite un proveedor de compras
      if (!['01', '03', '04', '05'].includes(c.tipo)) continue;
      const ruc = c.emisor.identificacion;
      if (!ruc || proveedoresConocidos.current.has(ruc)) continue;
      proveedoresConocidos.current.add(ruc);
      addSupplier({
        ruc,
        razonSocial: c.emisor.razonSocial,
        nombreComercial: c.emisor.nombreComercial,
        direccion: c.emisor.dirMatriz,
        categoria: 'otros',
        estado: 'ACTIVO',
        notas: 'Creado automáticamente desde Comprobantes recibidos SRI.',
      });
    }
  }, [items, addSupplier]);

  // ------------------------------------------------------------------ acciones por comprobante
  const [detalle, setDetalle] = useState<string | null>(null);
  const [aContabilizar, setAContabilizar] = useState<ComprobanteApi | null>(null);
  const [verFallidas, setVerFallidas] = useState(false);
  const [configurar, setConfigurar] = useState(false);

  const gastoPorClave = useMemo(() => {
    const m = new Map<string, ExpenseRecord>();
    expenses.forEach(e => e.sriAccessKey && m.set(e.sriAccessKey, e));
    return m;
  }, [expenses]);

  const marcarRevisado = async (c: ComprobanteApi) => {
    try {
      const act = await sriApi.actualizar(c.claveAcceso, { estadoProcesamiento: 'REVISADO' });
      setItems(list => list.map(x => (x.claveAcceso === c.claveAcceso ? { ...x, ...act } : x)));
    } catch (e) {
      showAlert({ title: 'No se pudo actualizar', message: e instanceof Error ? e.message : String(e), type: 'error' });
    }
  };

  const abrirContabilizar = async (c: ComprobanteApi) => {
    if (!guard('expenses.create')) return;
    const existente = gastoPorClave.get(c.claveAcceso);
    if (existente) {
      await sriApi.actualizar(c.claveAcceso, { estadoProcesamiento: 'CONTABILIZADO', expenseId: existente.id }).catch(() => null);
      showAlert({ title: 'Ya estaba en Gastos', message: `Esta compra ya se registró (${existente.invoiceReference || existente.description}). Se marcó como contabilizada.`, type: 'info' });
      void cargar();
      return;
    }
    // El listado no trae los detalles: se piden para sugerir la categoría
    try {
      setAContabilizar(await sriApi.detalle(c.claveAcceso));
    } catch (e) {
      showAlert({ title: 'No se pudo abrir', message: e instanceof Error ? e.message : String(e), type: 'error' });
    }
  };

  const contabilizar = async (c: ComprobanteApi, categoria: ExpenseCategory, pago: ExpenseRecord['paymentMethod']) => {
    const t = c.totales;
    const subtotal = Math.round((t.subtotalSinImpuestos || 0) * 100) / 100;
    const gravado = t.base15 + t.base12 + t.base5 + t.baseOtrasTarifas;
    const descripcion =
      c.detalles.length === 0
        ? `${tipoDe(c.tipo).nombre} ${c.emisor.razonSocial}`
        : c.detalles.length === 1
        ? c.detalles[0].descripcion
        : `${c.detalles.slice(0, 2).map(d => d.descripcion).join(', ')}${c.detalles.length > 2 ? ` (+${c.detalles.length - 2} ítems más)` : ''}`;
    const gasto = addExpense({
      date: new Date(`${diaEc(c.fechaEmision)}T12:00:00-05:00`).toISOString(),
      category: categoria,
      description: descripcion,
      supplier: c.emisor.nombreComercial ? `${c.emisor.nombreComercial} (${c.emisor.razonSocial})` : c.emisor.razonSocial,
      amount: t.total,
      taxDeductible: t.iva > 0,
      taxAmount: t.iva,
      paymentMethod: pago,
      invoiceReference: c.numero,
      supplierRuc: c.emisor.identificacion,
      sriAccessKey: c.claveAcceso,
      subtotal,
      taxRate: gravado > 0 ? Math.round((t.iva / gravado) * 100) : 0,
      notes: `${tipoDe(c.tipo).nombre} electrónica recibida, autorizada por el SRI. Clave de acceso: ${c.claveAcceso}`,
    });
    await sriApi.actualizar(c.claveAcceso, { estadoProcesamiento: 'CONTABILIZADO', expenseId: gasto.id });
    setAContabilizar(null);
    setAviso({ tipo: 'ok', texto: `${tipoDe(c.tipo).nombre} ${c.numero} registrada en Gastos por ${formatMoney(t.total)}.` });
    void cargar();
  };

  const descargarZip = async () => {
    if (!items.length) return;
    setEnviando(true);
    try {
      const archivos = [];
      for (const c of items) archivos.push({ name: `${diaEc(c.fechaEmision)}_${c.emisor.identificacion}_${c.tipo}_${c.numero}.xml`, content: await sriApi.xml(c.claveAcceso) });
      downloadBlob(buildZip(archivos), `comprobantes_recibidos_${desde || 'inicio'}_${hasta || 'hoy'}_p${pagina}.zip`);
    } catch (e) {
      showAlert({ title: 'No se pudo generar el ZIP', message: e instanceof Error ? e.message : String(e), type: 'error' });
    } finally {
      setEnviando(false);
    }
  };

  // ------------------------------------------------------------------ UI
  const ocupado = enviando || Boolean(estado?.enCurso);
  const valorConSigno = (c: ComprobanteApi, v: number) => (c.tipo === '04' ? -v : v);

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Inbox className="w-4 h-4 text-[#FF3366]" /> Comprobantes recibidos SRI
          </h2>
          <p className="text-[11px] text-neutral-400">
            Facturas, notas de crédito, notas de débito, retenciones y guías emitidas al RUC <span className="font-mono text-neutral-300">{rucEstudio || '—'}</span>, verificadas
            con el servicio oficial de autorización del SRI.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={SRI_EN_LINEA_URL} target="_blank" rel="noopener noreferrer" className={ui.btn} title="Facturación electrónica → Comprobantes electrónicos recibidos → Descargar reporte">
            <ExternalLink className="w-3.5 h-3.5" /> SRI en línea
          </a>
          <button type="button" onClick={() => txtRef.current?.click()} disabled={!puedeImportar || ocupado} className={ui.btn}>
            <FileText className="w-3.5 h-3.5" /> Importar reporte TXT
          </button>
          <button type="button" onClick={() => xmlRef.current?.click()} disabled={!puedeImportar || ocupado} className={ui.btn}>
            <FileCode className="w-3.5 h-3.5" /> Subir XML
          </button>
          <button type="button" onClick={descargarZip} disabled={!items.length || enviando} className={ui.btn} title="Descargar en ZIP los XML de esta página">
            <Download className="w-3.5 h-3.5" /> ZIP
          </button>
          <input ref={txtRef} type="file" accept=".txt,.csv,text/plain" multiple hidden onChange={onTxt} />
          <input ref={xmlRef} type="file" accept=".xml,text/xml,application/xml" multiple hidden onChange={onXml} />
        </div>
      </div>

      <SyncStatusPanel
        estado={estado}
        correo={correo}
        iniciando={iniciando}
        onCorreo={() => setVerCorreo(true)}
        error={errorEstado}
        puedeSincronizar={puedeImportar}
        onSincronizar={sincronizar}
        onCancelar={() => sriApi.cancelar().then(() => refrescarEstado()).catch(() => null)}
        onVerFallidas={() => setVerFallidas(true)}
        onConfigurar={() => setConfigurar(true)}
      />

      {aviso && (
        <div
          className={`p-3 rounded-xl border text-[11px] flex items-start justify-between gap-2 ${
            aviso.tipo === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : aviso.tipo === 'info' ? 'bg-blue-500/10 border-blue-500/30 text-blue-200' : 'bg-red-500/10 border-red-500/30 text-red-200'
          }`}
        >
          <span className="flex gap-2">
            {aviso.tipo === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : aviso.tipo === 'info' ? <Info className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            {aviso.texto}
          </span>
          <button type="button" onClick={() => setAviso(null)} className="shrink-0 opacity-70 hover:opacity-100 cursor-pointer" title="Cerrar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Clave de acceso (lector de códigos de barras o pegado) */}
      <div className={`${ui.card} p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end`}>
        <label className="block">
          <span className={`${ui.label} flex items-center gap-1.5 font-bold`}>
            <ScanLine className="w-3.5 h-3.5 text-[#FF3366]" /> Clave de acceso
          </span>
          <div className="flex gap-2">
            <input
              value={claveInput}
              onChange={e => setClaveInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && claveInput.trim()) {
                  e.preventDefault();
                  void enviarClaves(claveInput, 'CLAVE', 'Clave de acceso');
                  setClaveInput('');
                }
              }}
              disabled={!puedeImportar}
              placeholder="Escanee el código de barras del RIDE o pegue una o varias claves de 49 dígitos y presione Enter"
              className={`${ui.input} font-mono`}
            />
            <button
              type="button"
              onClick={() => {
                void enviarClaves(claveInput, 'CLAVE', 'Clave de acceso');
                setClaveInput('');
              }}
              disabled={!puedeImportar || !claveInput.trim() || enviando}
              className={`${ui.btn} shrink-0`}
            >
              <Search className="w-3.5 h-3.5" /> Traer
            </button>
          </div>
        </label>
        <p className="text-[10px] text-neutral-500 lg:max-w-xs">
          Para un período completo: en SRI en línea abra <strong className="text-neutral-300">Comprobantes electrónicos recibidos</strong>, consulte y pulse{' '}
          <strong className="text-neutral-300">Descargar reporte</strong>; luego <strong className="text-neutral-300">Importar reporte TXT</strong>.
        </p>
      </div>

      {/* Filtros */}
      <div className={`${ui.card} p-3 grid grid-cols-2 lg:grid-cols-[150px_150px_190px_170px_1fr] gap-2 items-end`}>
        <label className="block">
          <span className={ui.label}>Desde</span>
          <DatePicker value={desde} max={hasta || undefined} onChange={v => setRango(r => ({ ...r, desde: v }))} className={ui.input} placeholder="Sin límite" />
        </label>
        <label className="block">
          <span className={ui.label}>Hasta</span>
          <DatePicker value={hasta} min={desde || undefined} onChange={v => setRango(r => ({ ...r, hasta: v }))} className={ui.input} placeholder="Sin límite" />
        </label>
        <label className="block">
          <span className={ui.label}>Tipo</span>
          <UiSelect value={tipo} onChange={e => setTipo(e.target.value)} className={ui.input}>
            <option value="">Todos los tipos</option>
            {TIPOS.map(t => (
              <option key={t.codigo} value={t.codigo}>
                {t.nombre}
              </option>
            ))}
          </UiSelect>
        </label>
        <label className="block">
          <span className={ui.label}>Estado</span>
          <UiSelect value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} className={ui.input}>
            <option value="">Todos</option>
            {Object.entries(ESTADOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </UiSelect>
        </label>
        <label className="block col-span-2 lg:col-span-1">
          <span className={ui.label}>Buscar</span>
          <div className="relative">
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Proveedor, RUC, número o clave de acceso" className={`${ui.input} pl-8`} />
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
          </div>
        </label>
      </div>

      {/* Resumen del filtro */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'Comprobantes', valor: String(resumen?.comprobantes ?? 0), nota: `${resumen?.porContabilizar ?? 0} por contabilizar` },
          { label: 'Base IVA 15 %', valor: formatMoney(resumen?.base15 ?? 0) },
          { label: 'Base 0 %', valor: formatMoney(resumen?.base0 ?? 0) },
          { label: 'IVA en compras', valor: formatMoney(resumen?.iva ?? 0), nota: 'Crédito tributario (neto de NC)' },
          { label: 'Total compras', valor: formatMoney(resumen?.total ?? 0), fuerte: true, nota: resumen?.retenido ? `Retenido a favor: ${formatMoney(resumen.retenido)}` : undefined },
        ].map(k => (
          <div key={k.label} className={`${ui.card} px-4 py-3`}>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">{k.label}</div>
            <div className={`font-mono font-bold ${k.fuerte ? 'text-[#FF3366] text-lg' : 'text-white text-base'}`}>{k.valor}</div>
            {k.nota && <div className="text-[10px] text-neutral-500">{k.nota}</div>}
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className={`${ui.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-[#121215] text-[10px] uppercase tracking-wider text-neutral-400">
              <tr>
                <th className="py-2.5 px-3 text-left">Emisión</th>
                <th className="py-2.5 px-3 text-left">Tipo</th>
                <th className="py-2.5 px-3 text-left">Emisor</th>
                <th className="py-2.5 px-3 text-left">Número</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
                <th className="py-2.5 px-3 text-right">IVA</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
                <th className="py-2.5 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {errorLista ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-red-300">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                    {errorLista}
                    <div>
                      <button type="button" onClick={() => void cargar()} className="mt-2 underline text-neutral-300 cursor-pointer">
                        Reintentar
                      </button>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500">
                    {cargando ? <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" /> : <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />}
                    {cargando ? 'Cargando…' : 'No hay comprobantes en este período. Importe el reporte TXT del SRI o escanee una clave de acceso.'}
                  </td>
                </tr>
              ) : (
                items.map(c => {
                  const t = tipoDe(c.tipo);
                  const e = ESTADOS[c.estadoProcesamiento];
                  const conValores = !['06', '07'].includes(c.tipo);
                  const contabilizable = CONTABILIZABLES.includes(c.tipo) && (c.estadoProcesamiento === 'PENDIENTE_REVISION' || c.estadoProcesamiento === 'REVISADO');
                  return (
                    <tr key={c.claveAcceso} className={`align-middle hover:bg-[#1A1A20] ${cargando ? 'opacity-60' : ''}`}>
                      <td className="py-2.5 px-3 font-mono text-neutral-300 whitespace-nowrap">{diaEc(c.fechaEmision)}</td>
                      <td className="py-2.5 px-3">
                        <span className={`${ui.badge} ${t.cls}`}>{t.corto}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white truncate max-w-[240px]" title={c.emisor.razonSocial}>
                          {c.emisor.nombreComercial || c.emisor.razonSocial}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-500">{c.emisor.identificacion}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-neutral-200">{c.numero}</div>
                        {c.advertencias?.length > 0 && (
                          <div className="text-[10px] text-amber-300 flex items-center gap-1" title={c.advertencias.join(' · ')}>
                            <AlertTriangle className="w-3 h-3" /> {c.advertencias.length} aviso(s)
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-300">{conValores ? formatMoney(valorConSigno(c, c.totales.subtotalSinImpuestos)) : '—'}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-300">{conValores ? formatMoney(valorConSigno(c, c.totales.iva)) : '—'}</td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${c.tipo === '04' ? 'text-emerald-300' : c.tipo === '07' ? 'text-violet-300' : 'text-white'}`}>
                        {c.tipo === '07' ? formatMoney(c.totalRetenido || 0) : conValores ? formatMoney(valorConSigno(c, c.totales.total)) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`${ui.badge} ${e.cls}`} title={c.observacion}>
                          {e.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={() => setDetalle(c.claveAcceso)} className={`${ui.icono} border-[#272730] text-neutral-300 hover:text-white`} title="Ver detalle">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a href={sriApi.xmlUrl(c.claveAcceso, true)} className={`${ui.icono} border-[#272730] text-neutral-300 hover:text-white`} title="Descargar XML original">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          {c.estadoProcesamiento === 'PENDIENTE_REVISION' && (
                            <button type="button" onClick={() => marcarRevisado(c)} className={`${ui.icono} border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20`} title="Marcar como revisado">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {contabilizable && puedeContabilizar && (
                            <button
                              type="button"
                              onClick={() => abrirContabilizar(c)}
                              className={`${ui.icono} border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20`}
                              title="Contabilizar: registrar en Gastos y generar el asiento"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {paginacion && paginacion.total > 0 && (
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-[#24242B] text-[11px] text-neutral-400">
            <span>
              {(paginacion.pagina - 1) * paginacion.porPagina + 1}–{Math.min(paginacion.pagina * paginacion.porPagina, paginacion.total)} de {paginacion.total}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPagina(p => p - 1)} disabled={pagina <= 1 || cargando} className={`${ui.icono} border-[#272730] disabled:opacity-30`} title="Anterior">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono">
                {paginacion.pagina} / {paginacion.paginas}
              </span>
              <button type="button" onClick={() => setPagina(p => p + 1)} disabled={pagina >= paginacion.paginas || cargando} className={`${ui.icono} border-[#272730] disabled:opacity-30`} title="Siguiente">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {detalle && <ComprobanteDetalleModal claveAcceso={detalle} formatMoney={formatMoney} onClose={() => setDetalle(null)} />}
      {aContabilizar && (
        <ContabilizarModal
          comprobante={aContabilizar}
          categoriaSugerida={autoCategorizeSriExpense(`${aContabilizar.emisor.razonSocial} ${aContabilizar.emisor.nombreComercial || ''} ${aContabilizar.detalles.map(d => d.descripcion).join(' ')}`)}
          pagoSugerido={(() => {
            const f = aContabilizar.formasPago[0]?.codigo;
            return f === '01' ? 'cash' : ['16', '18', '19'].includes(f || '') ? 'credit_card' : 'bank_transfer';
          })()}
          formatMoney={formatMoney}
          onConfirmar={(cat, pago) => contabilizar(aContabilizar, cat, pago)}
          onClose={() => setAContabilizar(null)}
        />
      )}
      {verFallidas && (
        <ClavesFallidasModal
          onReintentar={async claves => {
            const r = await sriApi.agregarClaves({ claves, fuente: 'CLAVE', sincronizar: true });
            setVerFallidas(false);
            resultadoClaves(r, 'Reintento');
          }}
          onClose={() => setVerFallidas(false)}
        />
      )}
      {verCorreo && (
        <CorreoModal
          onGuardado={() => {
            void cargarCorreo();
            void refrescarEstado();
          }}
          onClose={() => setVerCorreo(false)}
        />
      )}
      {configurar && (
        <AutoSyncModal
          actual={estado?.automatica ?? null}
          onGuardar={async cfg => {
            await sriApi.configurarAutomatica(cfg);
            setConfigurar(false);
            void refrescarEstado();
          }}
          onClose={() => setConfigurar(false)}
        />
      )}
    </div>
  );
};
