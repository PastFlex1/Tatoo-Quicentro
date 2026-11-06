import React, { useEffect, useState } from 'react';
import { X, Download, Code2, RefreshCw, AlertTriangle, FileText } from 'lucide-react';
import { sriApi } from '../../../services/sriRecibidosApi';
import type { ComprobanteApi } from '../../../services/sriRecibidosApi';
import { ESTADOS, FUENTES, diaEc, fechaHora, tipoDe, ui } from './sriUi';

interface Props {
  claveAcceso: string;
  formatMoney: (n: number) => string;
  onClose: () => void;
}

const Fila: React.FC<{ k: string; v?: React.ReactNode; mono?: boolean }> = ({ k, v, mono }) =>
  v === undefined || v === null || v === '' ? null : (
    <div className="flex justify-between gap-3 py-1 text-[11px]">
      <span className="text-neutral-500 shrink-0">{k}</span>
      <span className={`text-neutral-200 text-right break-all ${mono ? 'font-mono' : ''}`}>{v}</span>
    </div>
  );

const Seccion: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <div className="rounded-xl bg-[#121215] border border-[#24242B] p-3">
    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">{titulo}</div>
    {children}
  </div>
);

/** Detalle completo de un comprobante recibido, adaptado a su tipo, con visor y descarga del XML. */
export const ComprobanteDetalleModal: React.FC<Props> = ({ claveAcceso, formatMoney, onClose }) => {
  const [c, setC] = useState<ComprobanteApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [xml, setXml] = useState<string | null>(null);
  const [verXml, setVerXml] = useState(false);

  useEffect(() => {
    sriApi.detalle(claveAcceso).then(setC).catch(e => setError(e.message));
  }, [claveAcceso]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const mostrarXml = async () => {
    setVerXml(v => !v);
    if (xml === null) setXml(await sriApi.xml(claveAcceso).catch(() => 'No se pudo cargar el XML.'));
  };

  const t = c?.totales;
  const tipo = c ? tipoDe(c.tipo) : null;
  const conValores = c && !['06', '07'].includes(c.tipo);

  return (
    <div className={ui.modalFondo} onMouseDown={onClose}>
      <div className={`${ui.card} w-full max-w-4xl max-h-[90vh] flex flex-col`} onMouseDown={e => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[#24242B]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {tipo && <span className={`${ui.badge} ${tipo.cls}`}>{tipo.nombre}</span>}
              {c && <span className={`${ui.badge} ${ESTADOS[c.estadoProcesamiento].cls}`}>{ESTADOS[c.estadoProcesamiento].label}</span>}
              {c?.estadoSri === 'ANULADO' && <span className={`${ui.badge} bg-red-500/10 border-red-500/30 text-red-300`}>Anulado en el SRI</span>}
            </div>
            <h3 className="text-sm font-bold text-white mt-1 truncate">
              {c ? `${c.numero} · ${c.emisor.nombreComercial || c.emisor.razonSocial}` : 'Cargando…'}
            </h3>
            <p className="text-[10px] font-mono text-neutral-500 break-all">{claveAcceso}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={mostrarXml} className={`${ui.icono} border-[#272730] text-neutral-300 hover:text-white`} title={verXml ? 'Ver detalle' : 'Ver XML'}>
              {verXml ? <FileText className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
            </button>
            <a href={sriApi.xmlUrl(claveAcceso, true)} className={`${ui.icono} border-[#272730] text-neutral-300 hover:text-white`} title="Descargar XML original">
              <Download className="w-3.5 h-3.5" />
            </a>
            <button type="button" onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white cursor-pointer" title="Cerrar (Esc)">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-3 ink-scroll">
          {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs">{error}</div>}
          {!c && !error && (
            <div className="py-10 text-center text-neutral-500 text-xs">
              <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" /> Cargando…
            </div>
          )}

          {c && verXml && (
            <pre className="text-[10px] leading-relaxed text-sky-300 font-mono whitespace-pre-wrap break-all bg-[#0F0F12] border border-[#24242B] rounded-xl p-3 ink-scroll">
              {xml ?? 'Cargando XML…'}
            </pre>
          )}

          {c && !verXml && (
            <>
              {c.advertencias?.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <div>{c.advertencias.join(' · ')}</div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Seccion titulo="Emisor">
                  <Fila k="Razón social" v={c.emisor.razonSocial} />
                  <Fila k="Nombre comercial" v={c.emisor.nombreComercial} />
                  <Fila k="RUC" v={c.emisor.identificacion} mono />
                  <Fila k="Régimen" v={c.emisor.regimen} />
                  <Fila k="Matriz" v={c.emisor.dirMatriz} />
                </Seccion>
                <Seccion titulo={c.tipo === '07' ? 'Sujeto retenido' : c.tipo === '06' ? 'Destinatario' : 'Comprador'}>
                  <Fila k="Razón social" v={c.receptor.razonSocial} />
                  <Fila k="Identificación" v={c.receptor.identificacion} mono />
                  <Fila k="¿Es el estudio?" v={c.esParaEmpresa === null ? 'Sin verificar' : c.esParaEmpresa ? 'Sí' : 'No'} />
                </Seccion>
                <Seccion titulo="Documento">
                  <Fila k="Emisión" v={diaEc(c.fechaEmision)} mono />
                  <Fila k="Autorización" v={fechaHora(c.fechaAutorizacion)} />
                  <Fila k="Ambiente" v={c.ambiente === 'PRODUCCION' ? 'Producción' : 'Pruebas'} />
                  <Fila k="Moneda" v={c.moneda} />
                  <Fila k="Origen" v={FUENTES[c.fuente] || c.fuente} />
                  <Fila k="Sincronizado" v={fechaHora(c.sincronizadoEn)} />
                </Seccion>
              </div>

              {/* Nota de crédito / débito */}
              {(c.documentoModificado || c.motivo) && (
                <Seccion titulo="Documento que modifica">
                  <Fila k="Número" v={c.documentoModificado?.numero} mono />
                  <Fila k="Fecha" v={c.documentoModificado?.fechaEmision} mono />
                  <Fila k="Motivo" v={c.motivo} />
                </Seccion>
              )}

              {/* Totales */}
              {conValores && t && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Seccion titulo="Bases e impuestos">
                    <Fila k="Subtotal sin impuestos" v={formatMoney(t.subtotalSinImpuestos)} mono />
                    {t.descuento > 0 && <Fila k="Descuento" v={formatMoney(t.descuento)} mono />}
                    {t.base15 > 0 && <Fila k="Base IVA 15 %" v={formatMoney(t.base15)} mono />}
                    {t.base12 > 0 && <Fila k="Base IVA 12 %" v={formatMoney(t.base12)} mono />}
                    {t.base5 > 0 && <Fila k="Base IVA 5 %" v={formatMoney(t.base5)} mono />}
                    {t.baseOtrasTarifas > 0 && <Fila k="Base otras tarifas" v={formatMoney(t.baseOtrasTarifas)} mono />}
                    {t.base0 > 0 && <Fila k="Base 0 %" v={formatMoney(t.base0)} mono />}
                    {t.noObjeto > 0 && <Fila k="No objeto de IVA" v={formatMoney(t.noObjeto)} mono />}
                    {t.exento > 0 && <Fila k="Exento de IVA" v={formatMoney(t.exento)} mono />}
                    <Fila k="IVA" v={formatMoney(t.iva)} mono />
                    {t.ice > 0 && <Fila k="ICE" v={formatMoney(t.ice)} mono />}
                    {t.propina > 0 && <Fila k="Propina" v={formatMoney(t.propina)} mono />}
                    <div className="flex justify-between pt-1.5 mt-1 border-t border-[#24242B] text-sm">
                      <span className="font-bold text-white">Total</span>
                      <span className="font-mono font-black text-[#FF3366]">{formatMoney(t.total)}</span>
                    </div>
                  </Seccion>
                  <Seccion titulo="Formas de pago">
                    {c.formasPago.length === 0 ? (
                      <p className="text-[11px] text-neutral-500">No informa formas de pago.</p>
                    ) : (
                      c.formasPago.map((p, i) => (
                        <Fila key={i} k={`${p.codigo} · ${p.nombre}${p.plazo ? ` (${p.plazo} ${p.unidadTiempo || ''})` : ''}`} v={formatMoney(p.total)} mono />
                      ))
                    )}
                    {c.motivos && c.motivos.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#24242B]">
                        {c.motivos.map((m, i) => (
                          <Fila key={i} k={m.razon} v={formatMoney(m.valor)} mono />
                        ))}
                      </div>
                    )}
                  </Seccion>
                </div>
              )}

              {/* Retenciones */}
              {c.tipo === '07' && (
                <Seccion titulo={`Retenciones${c.periodoFiscal ? ` · período ${c.periodoFiscal}` : ''}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] min-w-[520px]">
                      <thead className="text-[10px] uppercase text-neutral-500">
                        <tr>
                          <th className="py-1 text-left">Impuesto</th>
                          <th className="py-1 text-left">Código</th>
                          <th className="py-1 text-left">Documento sustento</th>
                          <th className="py-1 text-right">Base</th>
                          <th className="py-1 text-right">%</th>
                          <th className="py-1 text-right">Retenido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222228]">
                        {(c.retenciones || []).map((r, i) => (
                          <tr key={i}>
                            <td className="py-1.5 text-white">{r.impuesto}</td>
                            <td className="py-1.5 font-mono text-neutral-300">{r.codigoRetencion}</td>
                            <td className="py-1.5 font-mono text-neutral-400">{r.docSustento ? `${r.docSustento.numero} (${r.docSustento.fechaEmision || ''})` : '—'}</td>
                            <td className="py-1.5 text-right font-mono text-neutral-300">{formatMoney(r.baseImponible)}</td>
                            <td className="py-1.5 text-right font-mono text-neutral-300">{r.porcentaje}%</td>
                            <td className="py-1.5 text-right font-mono font-bold text-white">{formatMoney(r.valorRetenido)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between pt-2 mt-1 border-t border-[#24242B] text-sm">
                    <span className="font-bold text-white">Total retenido</span>
                    <span className="font-mono font-black text-violet-300">{formatMoney(c.totalRetenido || 0)}</span>
                  </div>
                </Seccion>
              )}

              {/* Guía de remisión */}
              {c.tipo === '06' && c.transporte && (
                <Seccion titulo="Transporte">
                  <Fila k="Transportista" v={`${c.transporte.transportista.razonSocial} (${c.transporte.transportista.identificacion})`} />
                  <Fila k="Placa" v={c.transporte.placa} mono />
                  <Fila k="Partida" v={c.transporte.dirPartida} />
                  <Fila k="Fechas" v={`${c.transporte.fechaInicio || ''} → ${c.transporte.fechaFin || ''}`} mono />
                  {(c.destinatarios || []).map((d, i) => (
                    <div key={i} className="mt-2 pt-2 border-t border-[#24242B]">
                      <Fila k="Destinatario" v={`${d.razonSocial} (${d.identificacion})`} />
                      <Fila k="Dirección" v={d.direccion} />
                      <Fila k="Motivo" v={d.motivoTraslado} />
                      <Fila k="Documento sustento" v={d.docSustento?.numero} mono />
                    </div>
                  ))}
                </Seccion>
              )}

              {/* Detalle de productos y servicios */}
              {c.detalles.length > 0 && c.tipo !== '07' && (
                <Seccion titulo={`Detalle (${c.detalles.length})`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] min-w-[560px]">
                      <thead className="text-[10px] uppercase text-neutral-500">
                        <tr>
                          <th className="py-1 text-left">Código</th>
                          <th className="py-1 text-left">Descripción</th>
                          <th className="py-1 text-right">Cant.</th>
                          {conValores && <th className="py-1 text-right">P. unit.</th>}
                          {conValores && <th className="py-1 text-right">Desc.</th>}
                          {conValores && <th className="py-1 text-right">IVA</th>}
                          {conValores && <th className="py-1 text-right">Subtotal</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222228]">
                        {c.detalles.map((d, i) => (
                          <tr key={i}>
                            <td className="py-1.5 font-mono text-neutral-500">{d.codigoPrincipal || '—'}</td>
                            <td className="py-1.5 text-neutral-200">{d.descripcion}</td>
                            <td className="py-1.5 text-right font-mono text-neutral-300">{d.cantidad}</td>
                            {conValores && <td className="py-1.5 text-right font-mono text-neutral-300">{formatMoney(d.precioUnitario)}</td>}
                            {conValores && <td className="py-1.5 text-right font-mono text-neutral-400">{d.descuento ? formatMoney(d.descuento) : '—'}</td>}
                            {conValores && <td className="py-1.5 text-right font-mono text-neutral-400">{d.impuestos.find(x => x.codigo === '2')?.tarifa ?? 0}%</td>}
                            {conValores && <td className="py-1.5 text-right font-mono text-white">{formatMoney(d.precioTotalSinImpuesto)}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Seccion>
              )}

              {Object.keys(c.infoAdicional || {}).length > 0 && (
                <Seccion titulo="Información adicional">
                  {Object.entries(c.infoAdicional).map(([k, v]) => (
                    <Fila key={k} k={k} v={v} />
                  ))}
                </Seccion>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
