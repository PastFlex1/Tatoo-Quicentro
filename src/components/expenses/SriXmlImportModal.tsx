import React, { useState, useRef } from 'react';
import { UiSelect } from '../common/UiSelect';
import { usePermission } from '../../hooks/usePermission';
import {
  X,
  FileCode,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Receipt,
  Layers,
  ArrowRight,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { ExpenseCategory } from '../../types';
import { parseSriXml, ParsedSriInvoice } from '../../utils/sriXmlParser';

interface SriXmlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (count: number) => void;
}

export const SriXmlImportModal: React.FC<SriXmlImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const { addExpense, addKardexMovement, inventory, formatMoney } = useStudio();

  const { guard: guardPermission } = usePermission();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedInvoices, setParsedInvoices] = useState<
    Array<{
      invoice: ParsedSriInvoice;
      selected: boolean;
      chosenCategory: ExpenseCategory;
      addToKardex: boolean;
      showItems: boolean;
    }>
  >([]);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pastedXml, setPastedXml] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    setImportSummary(null);

    const newParsedList: typeof parsedInvoices = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith('.xml')) continue;

      try {
        const text = await file.text();
        const parsed = parseSriXml(text);
        newParsedList.push({
          invoice: parsed,
          selected: true,
          chosenCategory: parsed.suggestedCategory,
          addToKardex: ['supplies_tattoo', 'supplies_piercing', 'jewelry_restock', 'hygiene_sanitary'].includes(
            parsed.suggestedCategory
          ),
          showItems: false,
        });
      } catch (err: any) {
        console.error(`Error procesando archivo ${file.name}:`, err);
        alert(`No se pudo procesar el archivo "${file.name}": ${err.message || 'Formato XML inválido.'}`);
      }
    }

    setParsedInvoices(prev => [...prev, ...newParsedList]);
    setIsProcessing(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handlePasteProcess = () => {
    if (!pastedXml.trim()) return;
    try {
      const parsed = parseSriXml(pastedXml);
      setParsedInvoices(prev => [
        ...prev,
        {
          invoice: parsed,
          selected: true,
          chosenCategory: parsed.suggestedCategory,
          addToKardex: ['supplies_tattoo', 'supplies_piercing', 'jewelry_restock', 'hygiene_sanitary'].includes(
            parsed.suggestedCategory
          ),
          showItems: false,
        },
      ]);
      setPastedXml('');
      setShowPasteArea(false);
    } catch (err: any) {
      alert(`Error al procesar el texto XML: ${err.message}`);
    }
  };

  const handleRemoveInvoice = (index: number) => {
    setParsedInvoices(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleExecuteImport = () => {
    if (!guardPermission('expenses.import_xml')) return;
    const toImport = parsedInvoices.filter(p => p.selected);
    if (toImport.length === 0) {
      alert('Selecciona al menos una factura para importar.');
      return;
    }

    let countExpenses = 0;
    let countKardex = 0;

    toImport.forEach(({ invoice, chosenCategory, addToKardex }) => {
      // 1. Register as Expense
      addExpense({
        date: invoice.emissionDate,
        category: chosenCategory,
        description: invoice.summaryDescription,
        supplier: invoice.supplierTradeName
          ? `${invoice.supplierTradeName} (${invoice.supplierName})`
          : invoice.supplierName,
        amount: invoice.totalAmount,
        taxDeductible: invoice.taxAmount > 0,
        taxAmount: invoice.taxAmount,
        paymentMethod: invoice.paymentMethod,
        invoiceReference: invoice.invoiceNumber,
        supplierRuc: invoice.supplierRuc,
        sriAccessKey: invoice.accessKey,
        subtotal: invoice.subtotal,
        taxRate: invoice.taxRate,
        notes: `Factura Electrónica SRI Autorizada. Clave de Acceso: ${invoice.accessKey}`,
      });
      countExpenses++;

      // 2. Optional: If Kardex integration requested and has inventory items
      if (addToKardex && invoice.items.length > 0) {
        invoice.items.forEach(item => {
          // Find matching item in inventory or match by name
          const matchedInventoryItem = inventory.find(
            inv =>
              inv.name.toLowerCase() === item.description.toLowerCase() ||
              (item.code && inv.sku === item.code)
          );

          if (matchedInventoryItem) {
            addKardexMovement({
              itemId: matchedInventoryItem.id,
              type: 'purchase_in',
              quantity: item.quantity,
              unitCost: item.unitPrice,
              reference: invoice.invoiceNumber,
              concept: `Compra SRI: ${item.description} (${invoice.supplierName})`,
              responsible: 'Administración',
              date: invoice.emissionDate,
            });
            countKardex++;
          }
        });
      }
    });

    setImportSummary(
      `¡Éxito! Se importaron ${countExpenses} facturas del SRI a Gastos & Compras${
        countKardex > 0 ? ` y se actualizaron ${countKardex} movimientos en el Kardex.` : '.'
      }`
    );

    if (onImportComplete) {
      onImportComplete(countExpenses);
    }

    setParsedInvoices([]);
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  const totalSelectedMoney = parsedInvoices
    .filter(p => p.selected)
    .reduce((sum, p) => sum + p.invoice.totalAmount, 0);

  const totalSelectedIva = parsedInvoices
    .filter(p => p.selected)
    .reduce((sum, p) => sum + p.invoice.taxAmount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#141417] border border-[#272730] rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24242A] bg-[#16161B] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Extracción de Gastos desde Facturas XML del SRI
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Ecuador SRI
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Carga directa de Comprobantes Electrónicos de compras autorizados por el SRI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#2A2A34] text-neutral-400 hover:text-white hover:bg-[#1E1E24] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Success Banner if import complete */}
          {importSummary && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{importSummary}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-[#FF3366] bg-[#FF3366]/10 scale-[0.99]'
                : 'border-[#2D2D38] hover:border-[#FF3366]/50 bg-[#16161B]/60 hover:bg-[#181820]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xml,text/xml"
              onChange={e => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-[#FF3366]/15 border border-[#FF3366]/30 flex items-center justify-center text-[#FF3366] mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">
              Arrastra tus archivos XML de compras del SRI aquí
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
              Soporta una o múltiples facturas electrónicas descargadas directamente del portal del SRI o recibidas por correo.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#202028] text-[11px] font-semibold text-neutral-300 border border-[#2D2D38]">
              <span>Hacer clic para buscar archivos .xml</span>
            </div>
          </div>

          {/* Toggle for Paste Text Option */}
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => setShowPasteArea(!showPasteArea)}
              className="text-[#FF3366] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>{showPasteArea ? 'Ocultar pegado manual de texto' : '¿Prefieres pegar el código XML directamente?'}</span>
            </button>
            <span className="text-[11px] text-neutral-500">
              Formato oficial: Factura Electrónica SRI v1.0.0 / v1.1.0
            </span>
          </div>

          {/* Collapsible Paste Area */}
          {showPasteArea && (
            <div className="p-4 bg-[#16161B] rounded-2xl border border-[#282834] space-y-3">
              <textarea
                rows={4}
                value={pastedXml}
                onChange={e => setPastedXml(e.target.value)}
                placeholder="Pega aquí el contenido de tu factura electrónica XML (ej: <?xml version='1.0' encoding='UTF-8'?><factura>...)..."
                className="w-full bg-[#111114] border border-[#272730] rounded-xl p-3 text-xs text-white font-mono focus:outline-hidden focus:border-[#FF3366] resize-none"
              />
              <button
                type="button"
                onClick={handlePasteProcess}
                className="px-4 py-2 bg-[#FF3366] text-white text-xs font-bold rounded-xl hover:bg-[#e02958] transition-colors cursor-pointer"
              >
                Procesar Texto XML
              </button>
            </div>
          )}

          {/* Parsed Invoices Preview List */}
          {parsedInvoices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#24242A] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Facturas Detectadas ({parsedInvoices.length})
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                    Listas para importar
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-neutral-400">
                    IVA Total: <strong className="text-emerald-400">{formatMoney(totalSelectedIva)}</strong>
                  </span>
                  <span className="text-neutral-400">
                    Importe Total: <strong className="text-white font-bold">{formatMoney(totalSelectedMoney)}</strong>
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                {parsedInvoices.map((item, index) => {
                  const inv = item.invoice;
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-2xl border transition-all ${
                        item.selected
                          ? 'bg-[#18181D] border-[#323240]'
                          : 'bg-[#121215] border-[#22222A] opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left Checkbox and Details */}
                        <div className="flex items-start gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={e => {
                              const checked = e.target.checked;
                              setParsedInvoices(prev => {
                                const copy = [...prev];
                                copy[index].selected = checked;
                                return copy;
                              });
                            }}
                            className="mt-1 w-4 h-4 rounded text-[#FF3366] bg-[#121215] border-[#2E2E38] focus:ring-0 cursor-pointer"
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white truncate">
                                {inv.supplierTradeName || inv.supplierName}
                              </span>
                              <span className="text-[10px] font-mono text-neutral-400 bg-[#121215] px-2 py-0.5 rounded border border-[#25252E]">
                                RUC: {inv.supplierRuc}
                              </span>
                              <span className="text-[10px] font-mono text-[#FF3366] font-semibold bg-[#FF3366]/10 px-2 py-0.5 rounded border border-[#FF3366]/20">
                                Fact: {inv.invoiceNumber}
                              </span>
                            </div>

                            <div className="text-[11px] text-neutral-300 mt-1 line-clamp-1">
                              {inv.summaryDescription}
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-neutral-500 font-mono mt-1">
                              <span>Fecha: {inv.formattedDate}</span>
                              <span>·</span>
                              <span>Subtotal: {formatMoney(inv.subtotal)}</span>
                              <span>·</span>
                              <span className="text-emerald-400 font-semibold">
                                IVA ({inv.taxRate}%): {formatMoney(inv.taxAmount)}
                              </span>
                              {inv.paymentMethod && (
                                <>
                                  <span>·</span>
                                  <span className="uppercase text-neutral-400">
                                    Pago: {inv.paymentMethod === 'cash' ? 'Efectivo' : inv.paymentMethod === 'credit_card' ? 'Tarjeta' : 'Transferencia'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Category selector & Amount */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                          <div className="text-right font-mono">
                            <span className="text-sm sm:text-base font-black text-white">
                              {formatMoney(inv.totalAmount)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <UiSelect
                              value={item.chosenCategory}
                              onChange={e => {
                                const newCat = e.target.value as ExpenseCategory;
                                setParsedInvoices(prev => {
                                  const copy = [...prev];
                                  copy[index].chosenCategory = newCat;
                                  return copy;
                                });
                              }}
                              className="bg-[#121215] border border-[#2B2B36] rounded-xl px-2.5 py-1 text-[11px] text-neutral-200 focus:outline-hidden focus:border-[#FF3366]"
                            >
                              <option value="supplies_tattoo">Insumos Tatuaje</option>
                              <option value="supplies_piercing">Insumos Piercing</option>
                              <option value="jewelry_restock">Joyería Titanio/Oro</option>
                              <option value="hygiene_sanitary">Bioseguridad</option>
                              <option value="rent_studio">Alquiler / Quicentro</option>
                              <option value="utilities">Suministros (Luz/Internet)</option>
                              <option value="software_terminals">TPV / Software</option>
                              <option value="marketing_ads">Marketing</option>
                              <option value="maintenance">Mantenimiento</option>
                              <option value="other_expense">Otros Gastos</option>
                            </UiSelect>

                            <button
                              type="button"
                              onClick={() => handleRemoveInvoice(index)}
                              className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-[#202028] transition-colors cursor-pointer"
                              title="Descartar factura"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Items Toggle Accordion */}
                      {inv.items.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-[#252530]">
                          <button
                            type="button"
                            onClick={() => {
                              setParsedInvoices(prev => {
                                const copy = [...prev];
                                copy[index].showItems = !copy[index].showItems;
                                return copy;
                              });
                            }}
                            className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <span>Ver detalle de {inv.items.length} productos / ítems facturados</span>
                            {item.showItems ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {item.showItems && (
                            <div className="mt-2 rounded-xl bg-[#121215] p-2.5 border border-[#222228] space-y-1.5 text-[11px]">
                              {inv.items.map((it, itIdx) => (
                                <div key={itIdx} className="flex justify-between items-center text-neutral-300">
                                  <span className="truncate pr-2">
                                    <strong className="text-white font-mono">{it.quantity}x</strong> {it.description}
                                  </span>
                                  <span className="font-mono text-neutral-200 shrink-0">
                                    {formatMoney(it.total)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-[#121215] border-t border-[#24242A] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-neutral-400 text-center sm:text-left">
            {parsedInvoices.length > 0 ? (
              <span>
                <strong>{parsedInvoices.filter(p => p.selected).length}</strong> de {parsedInvoices.length} facturas seleccionadas ({formatMoney(totalSelectedMoney)})
              </span>
            ) : (
              <span>Arrastra archivos .xml para comenzar</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#1E1E24] text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={parsedInvoices.filter(p => p.selected).length === 0 || isProcessing}
              onClick={handleExecuteImport}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                parsedInvoices.filter(p => p.selected).length > 0 && !isProcessing
                  ? 'bg-[#FF3366] text-white hover:bg-[#e02958] shadow-[0_0_15px_rgba(255,51,102,0.35)]'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Importar {parsedInvoices.filter(p => p.selected).length} Factura(s) a Gastos
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

