import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  Printer,
  TrendingUp,
  Users,
  PieChart as PieChartIcon,
  BarChart3,
  DollarSign,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { DateFilterRange } from '../../types';
import { PieChartWidget } from './PieChartWidget';
import { BarChartWidget } from './BarChartWidget';

type ReportTab = 'executive' | 'visual_charts' | 'pl_statement' | 'artists_productivity' | 'sales_departments' | 'tax_audit' | 'inventory_costs';

export const ReportsView: React.FC = () => {
  const {
    filteredSales,
    filteredExpenses,
    accountingEntries,
    artists,
    inventory,
    formatMoney,
    settings,
    dateFilter,
    setDateFilter,
    exportBackup,
    importBackup,
  } = useStudio();

  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('executive');
  const [selectedArtistFilter] = useState<string>('all');
  const [pieChartMode, setPieChartMode] = useState<'revenue' | 'expenses' | 'payments'>('revenue');
  const [barChartMode, setBarChartMode] = useState<'artists' | 'departments' | 'hours'>('artists');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter sales
  const validSales = useMemo(() => {
    return filteredSales.filter(s => {
      const isNotCancelled = s.status !== 'cancelled';
      const matchesArtist = selectedArtistFilter === 'all' || s.artistId === selectedArtistFilter;
      return isNotCancelled && matchesArtist;
    });
  }, [filteredSales, selectedArtistFilter]);

  // Aggregated Sales Data
  const totalGrossRevenue = useMemo(() => {
    return validSales.reduce((acc, s) => acc + (s.subtotal - s.discount), 0);
  }, [validSales]);

  const totalInvoicedWithTax = useMemo(() => {
    return validSales.reduce((acc, s) => acc + s.total, 0);
  }, [validSales]);

  const totalArtistCommissions = useMemo(() => {
    return validSales.reduce((acc, s) => acc + s.artistShare, 0);
  }, [validSales]);

  const averageTicket = useMemo(() => {
    return validSales.length > 0 ? totalGrossRevenue / validSales.length : 0;
  }, [validSales, totalGrossRevenue]);

  const totalTattooHours = useMemo(() => {
    return validSales
      .filter(s => s.serviceCategory === 'tattoo')
      .reduce((acc, s) => acc + (s.hours || 0), 0);
  }, [validSales]);

  // Category Revenues
  const tattooRevenue = useMemo(
    () => validSales.filter(s => s.serviceCategory === 'tattoo').reduce((acc, s) => acc + (s.subtotal - s.discount), 0),
    [validSales]
  );
  const piercingRevenue = useMemo(
    () => validSales.filter(s => s.serviceCategory === 'piercing').reduce((acc, s) => acc + (s.subtotal - s.discount), 0),
    [validSales]
  );
  const jewelryRevenue = useMemo(
    () => validSales.filter(s => s.serviceCategory === 'jewelry').reduce((acc, s) => acc + (s.subtotal - s.discount), 0),
    [validSales]
  );
  const aftercareRevenue = useMemo(
    () => validSales.filter(s => s.serviceCategory === 'aftercare').reduce((acc, s) => acc + (s.subtotal - s.discount), 0),
    [validSales]
  );
  const otherRevenue = useMemo(
    () => validSales.filter(s => s.serviceCategory === 'other').reduce((acc, s) => acc + (s.subtotal - s.discount), 0),
    [validSales]
  );

  // Expenses Categorization
  // Costo de insumos = consumo real registrado en contabilidad (cuenta 5102):
  // salidas de kardex + compras directas de insumos sin ingreso a bodega.
  const supplyExpenses = useMemo(() => {
    return accountingEntries.reduce(
      (acc, e) => acc + e.lines.filter(l => l.accountCode === '5102').reduce((a, l) => a + (l.debit || 0) - (l.credit || 0), 0),
      0
    );
  }, [accountingEntries]);

  // Margen real por departamento: ingreso neto − comisión de artistas de esas ventas
  const deptMargin = useMemo(() => {
    const calc = (cats: string[]) => {
      const list = validSales.filter(s => cats.includes(s.serviceCategory));
      const revenue = list.reduce((acc, s) => acc + (s.subtotal - s.discount), 0);
      const cost = list.reduce((acc, s) => acc + (s.artistShare || 0), 0);
      return { revenue, cost, margin: revenue - cost };
    };
    return {
      tattoo: calc(['tattoo']),
      piercing: calc(['piercing']),
      jewelry: calc(['jewelry']),
      aftercare: calc(['aftercare']),
    };
  }, [validSales]);

  const rentExpense = useMemo(() => {
    return filteredExpenses.filter(e => e.category === 'rent_studio').reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  const utilitiesExpense = useMemo(() => {
    return filteredExpenses.filter(e => e.category === 'utilities').reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  const bioSanitaryExpense = useMemo(() => {
    return filteredExpenses.filter(e => e.category === 'hygiene_sanitary').reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  const otherFixedExpenses = useMemo(() => {
    return filteredExpenses
      .filter(e => ['maintenance', 'taxes_licenses', 'software_terminals', 'marketing_ads', 'other_expense'].includes(e.category))
      .reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  const totalFixedExpenses = rentExpense + utilitiesExpense + bioSanitaryExpense + otherFixedExpenses;
  const totalDirectCosts = totalArtistCommissions + supplyExpenses;
  const grossProfit = totalGrossRevenue - totalDirectCosts;
  const grossMarginPercent = totalGrossRevenue > 0 ? Math.round((grossProfit / totalGrossRevenue) * 100) : 0;
  const netOperatingProfit = grossProfit - totalFixedExpenses;
  const netProfitMarginPercent = totalGrossRevenue > 0 ? Math.round((netOperatingProfit / totalGrossRevenue) * 100) : 0;

  // Taxes
  const outputTax = useMemo(() => validSales.reduce((acc, s) => acc + s.taxAmount, 0), [validSales]);
  const inputTax = useMemo(
    () => filteredExpenses.filter(e => e.taxDeductible).reduce((acc, e) => acc + e.taxAmount, 0),
    [filteredExpenses]
  );
  const netTaxPayable = outputTax - inputTax;

  // Payment methods breakdown
  const paymentBreakdown = useMemo(() => {
    let cash = 0;
    let card = 0;
    let transfer = 0;

    validSales.forEach(s => {
      if (s.paymentMethod === 'cash') cash += s.amountPaidNow;
      else if (s.paymentMethod === 'card') card += s.amountPaidNow;
      else if (s.paymentMethod === 'transfer') transfer += s.amountPaidNow;
      else if (s.paymentMethod === 'split') {
        cash += s.cashPaid || 0;
        card += s.cardPaid || 0;
        transfer += s.transferPaid || 0;
      }
    });

    return { cash, card, transfer };
  }, [validSales]);

  // Artist Productivity Metrics
  const artistProductivity = useMemo(() => {
    return artists.map(art => {
      const artSales = filteredSales.filter(s => s.artistId === art.id && s.status !== 'cancelled');
      const gross = artSales.reduce((acc, s) => acc + (s.subtotal - s.discount), 0);
      const commission = artSales.reduce((acc, s) => acc + s.artistShare, 0);
      const studioCut = artSales.reduce((acc, s) => acc + s.studioShare, 0);
      const tips = artSales.reduce((acc, s) => acc + s.tipAmount, 0);
      const hours = artSales.reduce((acc, s) => acc + (s.hours || 0), 0);
      const avg = artSales.length > 0 ? gross / artSales.length : 0;

      return {
        artist: art,
        sessionsCount: artSales.length,
        hours,
        gross,
        commission,
        studioCut,
        tips,
        averagePerSession: avg,
        efficiencyRatio: gross > 0 ? Math.round((studioCut / gross) * 100) : 0,
      };
    }).sort((a, b) => b.gross - a.gross);
  }, [artists, filteredSales]);

  // Data for Pie Chart (Revenue by Department)
  const pieChartSlices = useMemo(() => {
    return [
      {
        label: 'Tatuajes Artísticos',
        value: tattooRevenue,
        color: '#FF3366',
        sublabel: 'Sesiones & Retoques',
      },
      {
        label: 'Body Piercing',
        value: piercingRevenue,
        color: '#10B981',
        sublabel: 'Perforaciones asépticas',
      },
      {
        label: 'Joyería Corporal',
        value: jewelryRevenue,
        color: '#0EA5E9',
        sublabel: 'Titanio ASTM F136 & Oro',
      },
      {
        label: 'Aftercare & Cremas',
        value: aftercareRevenue,
        color: '#A855F7',
        sublabel: 'Bálsamos & jabón',
      },
      ...(otherRevenue > 0
        ? [
            {
              label: 'Otros / Señales',
              value: otherRevenue,
              color: '#F59E0B',
              sublabel: 'Anticipos de citas',
            },
          ]
        : []),
    ];
  }, [tattooRevenue, piercingRevenue, jewelryRevenue, aftercareRevenue, otherRevenue]);

  // Data for Bar Chart (Revenue by Artist)
  const barChartArtistData = useMemo(() => {
    return artistProductivity.map(a => ({
      id: a.artist.id,
      label: a.artist.nickname || a.artist.name.split(' ')[0],
      value1: a.commission,
      value2: a.studioCut,
      label1: 'Comisión Artista',
      label2: 'Retención Estudio',
    }));
  }, [artistProductivity]);

  // Dynamic Pie Chart Data
  const currentPieData = useMemo(() => {
    if (pieChartMode === 'expenses') {
      const slices = [
        { label: 'Insumos & Tintas', value: supplyExpenses, color: '#FF3366', sublabel: 'Agujas, tintas, guantes' },
        { label: 'Alquiler Estudio', value: rentExpense, color: '#0EA5E9', sublabel: 'Arrendamiento del local' },
        { label: 'Bioseguridad & Sanidad', value: bioSanitaryExpense, color: '#10B981', sublabel: 'Contenedores y residuos' },
        { label: 'Suministros (Luz/Agua)', value: utilitiesExpense, color: '#F59E0B', sublabel: 'Electricidad y servicios' },
        { label: 'Otros Gastos Fijos', value: otherFixedExpenses, color: '#8B5CF6', sublabel: 'Marketing, software, seguros' },
      ].filter(s => s.value > 0);
      const total = slices.reduce((acc, s) => acc + s.value, 0);
      return {
        slices,
        total,
        title: 'Gráfica de Pastel: Gastos Operativos',
        subtitle: 'Distribución porcentual de los costos fijos y variables del estudio',
      };
    } else if (pieChartMode === 'payments') {
      const slices = [
        { label: 'Efectivo en Caja', value: paymentBreakdown.cash, color: '#10B981', sublabel: 'Billetes y monedas físicas' },
        { label: 'Tarjeta / Datáfono POS', value: paymentBreakdown.card, color: '#0EA5E9', sublabel: 'Cobros electrónicos' },
        { label: 'Transferencia / Zelle', value: paymentBreakdown.transfer, color: '#FF3366', sublabel: 'Banca y transferencias' },
      ].filter(s => s.value > 0);
      const total = slices.reduce((acc, s) => acc + s.value, 0);
      return {
        slices,
        total,
        title: 'Gráfica de Pastel: Métodos de Cobro',
        subtitle: 'Distribución de ingresos según el canal de pago del cliente',
      };
    } else {
      return {
        slices: pieChartSlices,
        total: totalGrossRevenue,
        title: 'Gráfica de Pastel: Distribución de Ingresos',
        subtitle: 'Porcentaje y volumen facturado por cada línea de negocio del estudio',
      };
    }
  }, [pieChartMode, supplyExpenses, rentExpense, bioSanitaryExpense, utilitiesExpense, otherFixedExpenses, paymentBreakdown, pieChartSlices, totalGrossRevenue]);

  // Dynamic Bar Chart Data
  const currentBarData = useMemo(() => {
    if (barChartMode === 'departments') {
      return {
        data: [
          {
            id: 'dept_tattoo',
            label: 'Tatuajes',
            value1: deptMargin.tattoo.margin,
            value2: deptMargin.tattoo.cost,
          },
          {
            id: 'dept_piercing',
            label: 'Piercing',
            value1: deptMargin.piercing.margin,
            value2: deptMargin.piercing.cost,
          },
          {
            id: 'dept_jewelry',
            label: 'Joyería',
            value1: deptMargin.jewelry.margin,
            value2: deptMargin.jewelry.cost,
          },
          {
            id: 'dept_aftercare',
            label: 'Aftercare',
            value1: deptMargin.aftercare.margin,
            value2: deptMargin.aftercare.cost,
          },
        ],
        title: 'Gráfica de Barras: Rendimiento por Departamento',
        subtitle: 'Facturación neta generada vs costos y comisiones directas',
        label1: 'Margen Bruto',
        label2: 'Costes Directos',
      };
    } else if (barChartMode === 'hours') {
      return {
        data: artistProductivity.map(a => ({
          id: a.artist.id,
          label: a.artist.nickname || a.artist.name.split(' ')[0],
          value1: a.hours,
          value2: a.sessionsCount,
        })),
        title: 'Gráfica de Barras: Citas y Horas de Sesión',
        subtitle: 'Volumen de horas registradas y citas concluidas por artista',
        label1: 'Horas Tatuaje',
        label2: 'Citas Atendidas',
      };
    } else {
      return {
        data: barChartArtistData,
        title: 'Gráfica de Barras: Facturación por Artista',
        subtitle: 'Comparativa de volumen facturado, comisión del artista vs retención de la casa',
        label1: 'Comisión Artista',
        label2: 'Retención Casa',
      };
    }
  }, [barChartMode, barChartArtistData, tattooRevenue, piercingRevenue, jewelryRevenue, aftercareRevenue, supplyExpenses, artistProductivity]);

  // Inventory Metrics
  const inventoryTotalValuation = inventory.reduce((acc, i) => acc + i.currentStock * i.unitCost, 0);
  const inventoryRetailPotential = inventory
    .filter(i => i.isForSale && i.retailPrice)
    .reduce((acc, i) => acc + i.currentStock * (i.retailPrice || 0), 0);
  const lowStockCount = inventory.filter(i => i.currentStock <= i.minStockAlert).length;

  const reportTabTitles: Record<ReportTab, string> = {
    executive: 'INFORME EJECUTIVO DE CONTABILIDAD Y RESULTADOS',
    visual_charts: 'INFORME DE ANÁLISIS GRÁFICO Y DISTRIBUCIÓN CONTABLE',
    pl_statement: 'ESTADO DE PÉRDIDAS Y GANANCIAS AUDITADO (P&L)',
    artists_productivity: 'INFORME DE PRODUCTIVIDAD Y RENDIMIENTO POR ARTISTA',
    sales_departments: 'INFORME DE LÍNEAS DE NEGOCIO Y CANALES DE COBRO',
    tax_audit: 'AUDITORÍA FISCAL Y BALANCE DE IMPUESTOS (SRI ECUADOR)',
    inventory_costs: 'INFORME DE VALUACIÓN DE INVENTARIO Y CONTROL DE STOCK',
  };

  const reportTabShortNames: Record<ReportTab, string> = {
    executive: 'Resumen Ejecutivo',
    visual_charts: 'Gráficas & Métricas',
    pl_statement: 'P&L Resultados',
    artists_productivity: 'Productividad Artistas',
    sales_departments: 'Líneas de Negocio',
    tax_audit: 'Auditoría Fiscal SRI',
    inventory_costs: 'Valuación Stock',
  };

  const dateFilterLabel = useMemo(() => {
    switch (dateFilter) {
      case 'today':
        return 'Hoy (Día Actual)';
      case 'week':
        return 'Semana en Curso';
      case 'month':
        return 'Mes en Curso';
      case 'quarter':
        return 'Trimestre';
      case 'year':
        return 'Año en Curso';
      case 'all':
        return 'Histórico Consolidado (Todo)';
      default:
        return dateFilter;
    }
  }, [dateFilter]);

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const lines: string[] = [
      `"REPORTE FINANCIERO Y CONTABLE - ${settings.studioName.toUpperCase()}"`,
      `"Generado: ${new Date().toLocaleString('es-ES')}"`,
      `"Período: ${dateFilter}"`,
      `"Moneda: ${settings.currencyCode} (${settings.currency})"`,
      '""',
      '"1. RESUMEN DE ESTADO DE RESULTADOS (P&L)"',
      '"Concepto","Importe"',
      `"Facturación Bruta Tatuajes","${tattooRevenue.toFixed(2)}"`,
      `"Facturación Bruta Piercings","${piercingRevenue.toFixed(2)}"`,
      `"Venta Mostrador Joyería","${jewelryRevenue.toFixed(2)}"`,
      `"Venta Mostrador Aftercare","${aftercareRevenue.toFixed(2)}"`,
      `"Total Ingresos Brutos","${totalGrossRevenue.toFixed(2)}"`,
      `"(-) Comisiones Devengadas por Artistas","-${totalArtistCommissions.toFixed(2)}"`,
      `"(-) Coste de Suministros e Insumos","-${supplyExpenses.toFixed(2)}"`,
      `"(=) Margen Bruto Operativo","${grossProfit.toFixed(2)}"`,
      `"Margen Bruto Porcentual","${grossMarginPercent}%"`,
      `"(-) Alquiler del Local","-${rentExpense.toFixed(2)}"`,
      `"(-) Suministros (Luz, Agua, Climatización)","-${utilitiesExpense.toFixed(2)}"`,
      `"(-) Bioseguridad y Residuos Sanitarios","-${bioSanitaryExpense.toFixed(2)}"`,
      `"(-) Otros Gastos Operativos","-${otherFixedExpenses.toFixed(2)}"`,
      `"(=) Utilidad Neta Real (EBITDA)","${netOperatingProfit.toFixed(2)}"`,
      `"Margen Neto Porcentual","${netProfitMarginPercent}%"`,
      '""',
      '"2. RESUMEN FISCAL DE IMPUESTOS (TAX / IVA)"',
      `"Impuesto Repercutido (Cobrado en Tickets)","${outputTax.toFixed(2)}"`,
      `"Impuesto Soportado (Pagado en Compras Deducibles)","${inputTax.toFixed(2)}"`,
      `"Balance Neto a Liquidar","${netTaxPayable.toFixed(2)}"`,
      '""',
      '"3. RENDIMIENTO POR ARTISTA"',
      '"Artista","Rol","Citas","Horas Tatuaje","Facturación Bruta","Comisión Artista","Retención Estudio","Propinas","Ticket Promedio"',
      ...artistProductivity.map(
        a =>
          `"${a.artist.name}","${a.artist.role}","${a.sessionsCount}","${a.hours}","${a.gross.toFixed(2)}","${a.commission.toFixed(2)}","${a.studioCut.toFixed(2)}","${a.tips.toFixed(2)}","${a.averagePerSession.toFixed(2)}"`
      ),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_contable_tatuajes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        const success = importBackup(content);
        if (success) {
          alert('¡Copia de seguridad restaurada con éxito!');
        } else {
          alert('Error al leer el archivo JSON.');
        }
      }
    };
    reader.readAsText(file);
  };

  const renderPrintContent = () => {
    switch (activeReportTab) {
      case 'executive':
        return (
          <div className="space-y-4">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-4 gap-2 border border-neutral-300 p-2.5 rounded bg-neutral-50 text-center">
              <div className="border-r border-neutral-300 pr-2">
                <div className="text-[10px] text-neutral-600 font-bold uppercase">Facturación Bruta</div>
                <div className="text-sm font-bold font-mono text-black">{formatMoney(totalGrossRevenue)}</div>
                <div className="text-[9px] text-neutral-500">{validSales.length} ventas registradas</div>
              </div>
              <div className="border-r border-neutral-300 px-2">
                <div className="text-[10px] text-neutral-600 font-bold uppercase">Margen Bruto Casa</div>
                <div className="text-sm font-bold font-mono text-black">{formatMoney(grossProfit)}</div>
                <div className="text-[9px] text-neutral-500">{grossMarginPercent}% margen operativo</div>
              </div>
              <div className="border-r border-neutral-300 px-2">
                <div className="text-[10px] text-neutral-600 font-bold uppercase">Utilidad Neta (EBITDA)</div>
                <div className="text-sm font-bold font-mono text-black">{formatMoney(netOperatingProfit)}</div>
                <div className="text-[9px] text-neutral-500">{netProfitMarginPercent}% rendimiento neto</div>
              </div>
              <div className="pl-2">
                <div className="text-[10px] text-neutral-600 font-bold uppercase">Ticket Promedio</div>
                <div className="text-sm font-bold font-mono text-black">{formatMoney(averageTicket)}</div>
                <div className="text-[9px] text-neutral-500">{totalTattooHours} hrs en cabina</div>
              </div>
            </div>

            {/* 1. Estado de Resultados (P&L) */}
            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                1. ESTADO DE RESULTADOS (P&L)
              </h3>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1">Facturación Bruta de Servicios & Ventas</td>
                    <td className="py-1 text-right font-mono font-bold">{formatMoney(totalGrossRevenue)}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pl-4 text-neutral-600">(-) Comisiones Devengadas por Artistas</td>
                    <td className="py-0.5 text-right font-mono text-neutral-700">-{formatMoney(totalArtistCommissions)}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pl-4 text-neutral-600">(-) Costo de Insumos de Tatuaje y Joyería</td>
                    <td className="py-0.5 text-right font-mono text-neutral-700">-{formatMoney(supplyExpenses)}</td>
                  </tr>
                  <tr className="font-bold border-t border-b border-neutral-300 bg-neutral-50">
                    <td className="py-1">(=) MARGEN BRUTO OPERATIVO</td>
                    <td className="py-1 text-right font-mono">{formatMoney(grossProfit)} ({grossMarginPercent}%)</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pl-4 text-neutral-600">(-) Alquiler Local y Suministros (Luz, Agua)</td>
                    <td className="py-0.5 text-right font-mono text-neutral-700">-{formatMoney(rentExpense + utilitiesExpense)}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pl-4 text-neutral-600">(-) Bioseguridad y Gestión Sanitaria</td>
                    <td className="py-0.5 text-right font-mono text-neutral-700">-{formatMoney(bioSanitaryExpense)}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pl-4 text-neutral-600">(-) Otros Gastos Operativos y Administrativos</td>
                    <td className="py-0.5 text-right font-mono text-neutral-700">-{formatMoney(otherFixedExpenses)}</td>
                  </tr>
                  <tr className="font-bold text-xs border-t-2 border-black bg-neutral-100">
                    <td className="py-1.5">(=) RESULTADO NETO REAL DEL ESTUDIO (EBITDA)</td>
                    <td className="py-1.5 text-right font-mono">{formatMoney(netOperatingProfit)} ({netProfitMarginPercent}%)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Estructura de Costos y Cobros */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="border border-neutral-300 rounded p-2.5">
                <h4 className="font-bold uppercase text-[11px] border-b border-neutral-300 pb-1 mb-2">
                  Estructura de Costos Totales ({formatMoney(totalDirectCosts + totalFixedExpenses)})
                </h4>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Comisiones Artistas:</span>
                    <strong className="font-mono">{formatMoney(totalArtistCommissions)} ({totalGrossRevenue > 0 ? Math.round((totalArtistCommissions / totalGrossRevenue) * 100) : 0}%)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Insumos y Stock:</span>
                    <strong className="font-mono">{formatMoney(supplyExpenses)} ({totalGrossRevenue > 0 ? Math.round((supplyExpenses / totalGrossRevenue) * 100) : 0}%)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Gastos Fijos Operación:</span>
                    <strong className="font-mono">{formatMoney(totalFixedExpenses)} ({totalGrossRevenue > 0 ? Math.round((totalFixedExpenses / totalGrossRevenue) * 100) : 0}%)</strong>
                  </div>
                </div>
              </div>

              <div className="border border-neutral-300 rounded p-2.5">
                <h4 className="font-bold uppercase text-[11px] border-b border-neutral-300 pb-1 mb-2">
                  Cobros por Canal ({formatMoney(paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.transfer)})
                </h4>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Efectivo en Caja:</span>
                    <strong className="font-mono">{formatMoney(paymentBreakdown.cash)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tarjetas / Datáfono:</span>
                    <strong className="font-mono">{formatMoney(paymentBreakdown.card)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Transferencias Bancarias:</span>
                    <strong className="font-mono">{formatMoney(paymentBreakdown.transfer)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Rendimiento por Artista */}
            <div className="pt-2">
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                2. RENDIMIENTO RESUMIDO POR ARTISTA
              </h3>
              <table className="w-full text-xs border border-neutral-300">
                <thead className="bg-neutral-100 border-b border-neutral-300 font-bold">
                  <tr>
                    <th className="py-1 px-2 text-left">Artista</th>
                    <th className="py-1 px-2 text-center">Citas</th>
                    <th className="py-1 px-2 text-center">Horas</th>
                    <th className="py-1 px-2 text-right">Facturado ($)</th>
                    <th className="py-1 px-2 text-right">Comisión ($)</th>
                    <th className="py-1 px-2 text-right">Estudio ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {artistProductivity.map(a => (
                    <tr key={a.artist.id}>
                      <td className="py-1 px-2 font-medium">{a.artist.name}</td>
                      <td className="py-1 px-2 text-center">{a.sessionsCount}</td>
                      <td className="py-1 px-2 text-center">{a.hours > 0 ? `${a.hours}h` : '—'}</td>
                      <td className="py-1 px-2 text-right font-mono">{formatMoney(a.gross)}</td>
                      <td className="py-1 px-2 text-right font-mono">{formatMoney(a.commission)}</td>
                      <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(a.studioCut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'visual_charts':
        return (
          <div className="space-y-4">
            {/* 1. Líneas de Negocio */}
            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                1. PARTICIPACIÓN Y DISTRIBUCIÓN POR LÍNEA DE NEGOCIO
              </h3>
              <table className="w-full text-xs border border-neutral-300 mb-3">
                <thead className="bg-neutral-100 border-b border-neutral-300 font-bold">
                  <tr>
                    <th className="py-1 px-2 text-left">Departamento</th>
                    <th className="py-1 px-2 text-right">Facturación ($ USD)</th>
                    <th className="py-1 px-2 text-center">% del Total</th>
                    <th className="py-1 px-2 text-right">Margen (− comisiones)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr>
                    <td className="py-1 px-2 font-medium">Tatuajes Artísticos</td>
                    <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(tattooRevenue)}</td>
                    <td className="py-1 px-2 text-center font-mono">{totalGrossRevenue > 0 ? ((tattooRevenue / totalGrossRevenue) * 100).toFixed(1) : 0}%</td>
                    <td className="py-1 px-2 text-right font-mono">{formatMoney(deptMargin.tattoo.margin)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2 font-medium">Body Piercing & Perforaciones</td>
                    <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(piercingRevenue)}</td>
                    <td className="py-1 px-2 text-center font-mono">{totalGrossRevenue > 0 ? ((piercingRevenue / totalGrossRevenue) * 100).toFixed(1) : 0}%</td>
                    <td className="py-1 px-2 text-right font-mono">{formatMoney(deptMargin.piercing.margin)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2 font-medium">Venta Joyería Mostrador (Titanio / Oro)</td>
                    <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(jewelryRevenue)}</td>
                    <td className="py-1 px-2 text-center font-mono">{totalGrossRevenue > 0 ? ((jewelryRevenue / totalGrossRevenue) * 100).toFixed(1) : 0}%</td>
                    <td className="py-1 px-2 text-right font-mono">{formatMoney(deptMargin.jewelry.margin)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2 font-medium">Venta Aftercare & Bálsamos Cicatrizantes</td>
                    <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(aftercareRevenue)}</td>
                    <td className="py-1 px-2 text-center font-mono">{totalGrossRevenue > 0 ? ((aftercareRevenue / totalGrossRevenue) * 100).toFixed(1) : 0}%</td>
                    <td className="py-1 px-2 text-right font-mono">{formatMoney(deptMargin.aftercare.margin)}</td>
                  </tr>
                  {otherRevenue > 0 && (
                    <tr>
                      <td className="py-1 px-2 font-medium">Otros Servicios & Reservas</td>
                      <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(otherRevenue)}</td>
                      <td className="py-1 px-2 text-center font-mono">{totalGrossRevenue > 0 ? ((otherRevenue / totalGrossRevenue) * 100).toFixed(1) : 0}%</td>
                      <td className="py-1 px-2 text-right font-mono">{formatMoney(otherRevenue)}</td>
                    </tr>
                  )}
                  <tr className="bg-neutral-100 font-bold border-t-2 border-black">
                    <td className="py-1.5 px-2">TOTAL FACTURACIÓN BRUTA</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(totalGrossRevenue)}</td>
                    <td className="py-1.5 px-2 text-center font-mono">100.0%</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(grossProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Rendimiento por Artista */}
            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                2. COMPARATIVA DE RENDIMIENTO Y FACTURACIÓN POR ARTISTA
              </h3>
              <table className="w-full text-xs border border-neutral-300">
                <thead className="bg-neutral-100 border-b border-neutral-300 font-bold">
                  <tr>
                    <th className="py-1 px-2 text-left">Artista</th>
                    <th className="py-1 px-2 text-left">Especialidad</th>
                    <th className="py-1 px-2 text-center">Citas</th>
                    <th className="py-1 px-2 text-right">Facturación ($)</th>
                    <th className="py-1 px-2 text-center">% Ventas</th>
                    <th className="py-1 px-2 text-right">Comisión ($)</th>
                    <th className="py-1 px-2 text-right">Estudio ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {artistProductivity.map(a => (
                    <tr key={a.artist.id}>
                      <td className="py-1 px-2 font-medium">{a.artist.name}</td>
                      <td className="py-1 px-2 text-neutral-600">{a.artist.role}</td>
                      <td className="py-1 px-2 text-center">{a.sessionsCount}</td>
                      <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(a.gross)}</td>
                      <td className="py-1 px-2 text-center font-mono">{totalGrossRevenue > 0 ? ((a.gross / totalGrossRevenue) * 100).toFixed(1) : 0}%</td>
                      <td className="py-1 px-2 text-right font-mono">{formatMoney(a.commission)}</td>
                      <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(a.studioCut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 3. Flujo Financiero Global */}
            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                3. RESUMEN DE FLUJO FINANCIERO OPERATIVO
              </h3>
              <div className="grid grid-cols-3 gap-3 border border-neutral-300 p-2.5 rounded bg-neutral-50 text-center text-xs">
                <div>
                  <span className="text-neutral-600 text-[10px] block font-bold uppercase">Ingresos Brutos</span>
                  <span className="font-mono text-base font-bold text-black">{formatMoney(totalGrossRevenue)}</span>
                </div>
                <div>
                  <span className="text-neutral-600 text-[10px] block font-bold uppercase">Costos Totales Operación</span>
                  <span className="font-mono text-base font-bold text-neutral-800">{formatMoney(totalDirectCosts + totalFixedExpenses)}</span>
                </div>
                <div>
                  <span className="text-neutral-600 text-[10px] block font-bold uppercase">Utilidad Neta (EBITDA)</span>
                  <span className="font-mono text-base font-bold text-black">{formatMoney(netOperatingProfit)} ({netProfitMarginPercent}%)</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'pl_statement':
        return (
          <div className="space-y-4">
            <div className="border border-neutral-300 p-2.5 rounded bg-neutral-50 flex justify-between items-center text-xs">
              <span className="font-bold uppercase">Auditoría Financiera Período: {dateFilterLabel}</span>
              <div className="space-x-3 font-mono font-bold">
                <span>Margen Bruto: {grossMarginPercent}%</span>
                <span>Margen Neto: {netProfitMarginPercent}%</span>
              </div>
            </div>

            {/* 1. Ingresos Operativos */}
            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                1. INGRESOS OPERATIVOS BRUTOS
              </h3>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1">Facturación Tatuajes Artísticos</td>
                    <td className="py-1 text-right font-mono">{formatMoney(tattooRevenue)}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1">Facturación Procedimientos Body Piercing</td>
                    <td className="py-1 text-right font-mono">{formatMoney(piercingRevenue)}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1">Ventas de Mostrador - Joyería Titanio / Oro</td>
                    <td className="py-1 text-right font-mono">{formatMoney(jewelryRevenue)}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1">Ventas de Mostrador - Aftercare & Bálsamos</td>
                    <td className="py-1 text-right font-mono">{formatMoney(aftercareRevenue)}</td>
                  </tr>
                  {otherRevenue > 0 && (
                    <tr className="border-b border-neutral-200">
                      <td className="py-1">Otros Servicios & Señales</td>
                      <td className="py-1 text-right font-mono">{formatMoney(otherRevenue)}</td>
                    </tr>
                  )}
                  <tr className="font-bold bg-neutral-100 border-t border-b border-neutral-400">
                    <td className="py-1.5 font-bold">TOTAL INGRESOS OPERATIVOS BRUTOS</td>
                    <td className="py-1.5 text-right font-mono text-sm">{formatMoney(totalGrossRevenue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Costos Directos */}
            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                2. COSTOS DIRECTOS DE SERVICIO (COGS)
              </h3>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1">Comisiones Devengadas por Artistas (Tatuadores / Piercers)</td>
                    <td className="py-1 text-right font-mono text-neutral-800">-{formatMoney(totalArtistCommissions)}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1">Compras de Insumos y Reposición de Joyería</td>
                    <td className="py-1 text-right font-mono text-neutral-800">-{formatMoney(supplyExpenses)}</td>
                  </tr>
                  <tr className="font-bold bg-neutral-100 border-t border-b border-neutral-400">
                    <td className="py-1.5 font-bold">TOTAL COSTOS DIRECTOS</td>
                    <td className="py-1.5 text-right font-mono text-sm">-{formatMoney(totalDirectCosts)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Margen Bruto */}
            <div className="p-2 border-2 border-black bg-neutral-50 flex justify-between items-center text-xs font-bold">
              <span>(=) MARGEN BRUTO OPERATIVO DE LA CASA</span>
              <span className="font-mono text-sm">{formatMoney(grossProfit)} ({grossMarginPercent}%)</span>
            </div>

            {/* 3. Gastos Fijos (OPEX) */}
            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                3. GASTOS FIJOS Y ESTRUCTURA DE OPERACIÓN (OPEX)
              </h3>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1">Alquiler del Local Comercial</td>
                    <td className="py-1 text-right font-mono">-{formatMoney(rentExpense)}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1">Suministros (Electricidad, Agua, Climatización)</td>
                    <td className="py-1 text-right font-mono">-{formatMoney(utilitiesExpense)}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="py-1">Bioseguridad, Sanidad & Gestión Residuos Peligrosos</td>
                    <td className="py-1 text-right font-mono">-{formatMoney(bioSanitaryExpense)}</td>
                  </tr>
                  {otherFixedExpenses > 0 && (
                    <tr className="border-b border-neutral-200">
                      <td className="py-1">Otros Gastos Operativos (TPV, Software, Marketing)</td>
                      <td className="py-1 text-right font-mono">-{formatMoney(otherFixedExpenses)}</td>
                    </tr>
                  )}
                  <tr className="font-bold bg-neutral-100 border-t border-b border-neutral-400">
                    <td className="py-1.5 font-bold">TOTAL GASTOS FIJOS OPERATIVOS</td>
                    <td className="py-1.5 text-right font-mono text-sm">-{formatMoney(totalFixedExpenses)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Resultado Neto */}
            <div className="p-2.5 border-2 border-black bg-neutral-100 flex justify-between items-center text-sm font-bold">
              <span>(=) RESULTADO NETO FINAL DEL ESTUDIO (EBITDA)</span>
              <span className="font-mono text-base">{formatMoney(netOperatingProfit)} ({netProfitMarginPercent}%)</span>
            </div>
          </div>
        );

      case 'artists_productivity':
        return (
          <div className="space-y-4">
            <div className="border border-neutral-300 p-2.5 rounded bg-neutral-50 grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-neutral-600 block uppercase">Artistas Evaluados</span>
                <span className="font-bold text-sm">{artistProductivity.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-600 block uppercase">Citas / Sesiones</span>
                <span className="font-bold text-sm">{validSales.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-600 block uppercase">Horas Tatuaje</span>
                <span className="font-bold text-sm">{totalTattooHours} hrs</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-600 block uppercase">Comisiones Totales</span>
                <span className="font-bold text-sm font-mono">{formatMoney(totalArtistCommissions)}</span>
              </div>
            </div>

            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                TABLA DE RENDIMIENTO Y LIQUIDACIÓN POR ARTISTA
              </h3>
              <table className="w-full text-xs border border-neutral-300">
                <thead className="bg-neutral-100 border-b border-neutral-300 font-bold">
                  <tr>
                    <th className="py-1 px-2 text-left">Artista</th>
                    <th className="py-1 px-2 text-left">Rol / Especialidad</th>
                    <th className="py-1 px-2 text-center">Citas</th>
                    <th className="py-1 px-2 text-center">Horas</th>
                    <th className="py-1 px-2 text-right">Facturación ($)</th>
                    <th className="py-1 px-2 text-right">Comisión ($)</th>
                    <th className="py-1 px-2 text-right">Estudio ($)</th>
                    <th className="py-1 px-2 text-right">Propinas ($)</th>
                    <th className="py-1 px-2 text-right">Ticket Prom.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {artistProductivity.map(item => (
                    <tr key={item.artist.id}>
                      <td className="py-1.5 px-2 font-bold">{item.artist.name}</td>
                      <td className="py-1.5 px-2 text-neutral-600">{item.artist.role}</td>
                      <td className="py-1.5 px-2 text-center font-mono font-bold">{item.sessionsCount}</td>
                      <td className="py-1.5 px-2 text-center font-mono">{item.hours > 0 ? `${item.hours}h` : '—'}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold">{formatMoney(item.gross)}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold">{formatMoney(item.commission)}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold">{formatMoney(item.studioCut)}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-neutral-700">{item.tips > 0 ? formatMoney(item.tips) : '—'}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{formatMoney(item.averagePerSession)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-neutral-100 font-bold border-t-2 border-black">
                  <tr>
                    <td colSpan={2} className="py-1.5 px-2 uppercase">TOTALES CONSOLIDADOS:</td>
                    <td className="py-1.5 px-2 text-center font-mono">{artistProductivity.reduce((acc, a) => acc + a.sessionsCount, 0)}</td>
                    <td className="py-1.5 px-2 text-center font-mono">{totalTattooHours}h</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(totalGrossRevenue)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(totalArtistCommissions)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(grossProfit)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(artistProductivity.reduce((acc, a) => acc + a.tips, 0))}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(averageTicket)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Firmas de Conformidad */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="border-b border-black mb-1 w-48 mx-auto h-8"></div>
                <span className="font-bold block">Firma Administrador / Gerente</span>
                <span className="text-[10px] text-neutral-600">{settings.studioName}</span>
              </div>
              <div>
                <div className="border-b border-black mb-1 w-48 mx-auto h-8"></div>
                <span className="font-bold block">Conformidad de Artistas</span>
                <span className="text-[10px] text-neutral-600">Revisión de Liquidación Periódica</span>
              </div>
            </div>
          </div>
        );

      case 'sales_departments':
        return (
          <div className="space-y-4">
            {/* 1. Líneas de Negocio */}
            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                1. FACTURACIÓN POR LÍNEA DE NEGOCIO Y DEPARTAMENTO
              </h3>
              <table className="w-full text-xs border border-neutral-300">
                <thead className="bg-neutral-100 border-b border-neutral-300 font-bold">
                  <tr>
                    <th className="py-1 px-2 text-left">Departamento</th>
                    <th className="py-1 px-2 text-right">Facturación ($ USD)</th>
                    <th className="py-1 px-2 text-center">% del Total</th>
                    <th className="py-1 px-2 text-right">Margen (− comisiones)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr>
                    <td className="py-1 px-2 font-medium">Tatuajes Artísticos</td>
                    <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(tattooRevenue)}</td>
                    <td className="py-1 px-2 text-center font-mono">{totalGrossRevenue > 0 ? ((tattooRevenue / totalGrossRevenue) * 100).toFixed(1) : 0}%</td>
                    <td className="py-1 px-2 text-right font-mono">{formatMoney(deptMargin.tattoo.margin)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2 font-medium">Procedimientos Body Piercing</td>
                    <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(piercingRevenue)}</td>
                    <td className="py-1 px-2 text-center font-mono">{totalGrossRevenue > 0 ? ((piercingRevenue / totalGrossRevenue) * 100).toFixed(1) : 0}%</td>
                    <td className="py-1 px-2 text-right font-mono">{formatMoney(deptMargin.piercing.margin)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2 font-medium">Venta Joyería Mostrador (Titanio / Oro)</td>
                    <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(jewelryRevenue)}</td>
                    <td className="py-1 px-2 text-center font-mono">{totalGrossRevenue > 0 ? ((jewelryRevenue / totalGrossRevenue) * 100).toFixed(1) : 0}%</td>
                    <td className="py-1 px-2 text-right font-mono">{formatMoney(deptMargin.jewelry.margin)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2 font-medium">Venta Aftercare & Bálsamos</td>
                    <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(aftercareRevenue)}</td>
                    <td className="py-1 px-2 text-center font-mono">{totalGrossRevenue > 0 ? ((aftercareRevenue / totalGrossRevenue) * 100).toFixed(1) : 0}%</td>
                    <td className="py-1 px-2 text-right font-mono">{formatMoney(deptMargin.aftercare.margin)}</td>
                  </tr>
                  {otherRevenue > 0 && (
                    <tr>
                      <td className="py-1 px-2 font-medium">Otros Servicios & Señales</td>
                      <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(otherRevenue)}</td>
                      <td className="py-1 px-2 text-center font-mono">{totalGrossRevenue > 0 ? ((otherRevenue / totalGrossRevenue) * 100).toFixed(1) : 0}%</td>
                      <td className="py-1 px-2 text-right font-mono">{formatMoney(otherRevenue)}</td>
                    </tr>
                  )}
                  <tr className="bg-neutral-100 font-bold border-t-2 border-black">
                    <td className="py-1.5 px-2">TOTAL FACTURACIÓN BRUTA</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(totalGrossRevenue)}</td>
                    <td className="py-1.5 px-2 text-center font-mono">100.0%</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(grossProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Canales de Cobro */}
            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                2. CANALES DE COBRO Y ARQUEO DE CAJA
              </h3>
              <table className="w-full text-xs border border-neutral-300">
                <thead className="bg-neutral-100 border-b border-neutral-300 font-bold">
                  <tr>
                    <th className="py-1 px-2 text-left">Canal de Pago</th>
                    <th className="py-1 px-2 text-left">Detalle / Modalidad</th>
                    <th className="py-1 px-2 text-right">Importe Cobrado ($ USD)</th>
                    <th className="py-1 px-2 text-center">% del Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr>
                    <td className="py-1.5 px-2 font-bold">Efectivo en Caja</td>
                    <td className="py-1.5 px-2 text-neutral-600">Billetes y monedas físicas recibidas</td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold">{formatMoney(paymentBreakdown.cash)}</td>
                    <td className="py-1.5 px-2 text-center font-mono">
                      {paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.transfer > 0
                        ? ((paymentBreakdown.cash / (paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.transfer)) * 100).toFixed(1)
                        : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 font-bold">Tarjetas / Datáfono TPV</td>
                    <td className="py-1.5 px-2 text-neutral-600">Cobro digital directo a banco / Datafast</td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold">{formatMoney(paymentBreakdown.card)}</td>
                    <td className="py-1.5 px-2 text-center font-mono">
                      {paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.transfer > 0
                        ? ((paymentBreakdown.card / (paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.transfer)) * 100).toFixed(1)
                        : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 font-bold">Transferencias Electrónicas</td>
                    <td className="py-1.5 px-2 text-neutral-600">Bancos Ecuador (Pichincha, Produbanco, DeUna)</td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold">{formatMoney(paymentBreakdown.transfer)}</td>
                    <td className="py-1.5 px-2 text-center font-mono">
                      {paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.transfer > 0
                        ? ((paymentBreakdown.transfer / (paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.transfer)) * 100).toFixed(1)
                        : 0}%
                    </td>
                  </tr>
                  <tr className="bg-neutral-100 font-bold border-t-2 border-black">
                    <td colSpan={2} className="py-1.5 px-2 uppercase">TOTAL COBRADO EN PERÍODO:</td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-sm">
                      {formatMoney(paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.transfer)}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono">100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'tax_audit':
        return (
          <div className="space-y-4">
            <div className="border border-neutral-300 p-2.5 rounded bg-neutral-50 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-neutral-600 block uppercase">Contribuyente / RUC</span>
                <span className="font-bold">{settings.razonSocial || settings.studioName}</span>
                <span className="font-mono text-[10px] text-neutral-500 block">{settings.ruc || settings.taxId}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-600 block uppercase">Régimen Tributario</span>
                <span className="font-bold">{settings.regimenTributario || 'RÉGIMEN GENERAL'}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-600 block uppercase">Tarifa IVA Vigente</span>
                <span className="font-bold font-mono">15% (Ecuador SRI)</span>
              </div>
            </div>

            {/* Resumen de IVA */}
            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                1. BALANCE DE IMPUESTOS (IVA REPERCUTIDO VS DEDUCIBLE)
              </h3>
              <table className="w-full text-xs border border-neutral-300">
                <thead className="bg-neutral-100 border-b border-neutral-300 font-bold">
                  <tr>
                    <th className="py-1.5 px-2 text-left">Concepto Fiscal</th>
                    <th className="py-1.5 px-2 text-left">Documentos Sustento</th>
                    <th className="py-1.5 px-2 text-right">Base Imponible ($)</th>
                    <th className="py-1.5 px-2 text-center">Tarifa</th>
                    <th className="py-1.5 px-2 text-right">Monto IVA ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr>
                    <td className="py-2 px-2 font-bold">Impuesto Repercutido (Cobrado)</td>
                    <td className="py-2 px-2 text-neutral-600">{validSales.length} Facturas y Tickets de Venta</td>
                    <td className="py-2 px-2 text-right font-mono">{formatMoney(totalGrossRevenue)}</td>
                    <td className="py-2 px-2 text-center font-mono">15%</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-black">{formatMoney(outputTax)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold">Impuesto Soportado (Deducible)</td>
                    <td className="py-2 px-2 text-neutral-600">Facturas de Proveedores e Insumos</td>
                    <td className="py-2 px-2 text-right font-mono">{formatMoney(supplyExpenses)}</td>
                    <td className="py-2 px-2 text-center font-mono">15%</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-neutral-800">-{formatMoney(inputTax)}</td>
                  </tr>
                  <tr className="bg-neutral-100 font-bold border-t-2 border-black text-sm">
                    <td colSpan={4} className="py-2 px-2 uppercase">
                      {netTaxPayable >= 0 ? '(=) SALDO NETO A LIQUIDAR AL SRI (A PAGAR):' : '(=) CRÉDITO TRIBUTARIO A FAVOR DEL ESTUDIO:'}
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold">
                      {formatMoney(Math.abs(netTaxPayable))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Detalle de Ventas Facturadas */}
            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                2. COMPROBANTES Y MOVIMIENTOS FACTURADOS
              </h3>
              <div className="grid grid-cols-3 gap-3 border border-neutral-300 p-2.5 rounded text-center text-xs">
                <div>
                  <span className="text-[10px] text-neutral-600 block uppercase">Total Ventas Emitidas</span>
                  <span className="font-mono text-base font-bold">{validSales.length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-600 block uppercase">Subtotal Sin Impuesto</span>
                  <span className="font-mono text-base font-bold">{formatMoney(totalGrossRevenue)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-600 block uppercase">Total con IVA (15%)</span>
                  <span className="font-mono text-base font-bold">{formatMoney(totalInvoicedWithTax)}</span>
                </div>
              </div>
            </div>

            <div className="p-2 border border-neutral-300 rounded bg-neutral-50 text-[10px] text-neutral-600">
              <strong>Nota de Responsabilidad Tributaria:</strong> Este reporte refleja la liquidación de IVA calculada en el período con base en los comprobantes autorizados y ventas emitidas conforme a la normativa tributaria del Servicio de Rentas Internas (SRI) del Ecuador.
            </div>
          </div>
        );

      case 'inventory_costs':
        return (
          <div className="space-y-4">
            <div className="border border-neutral-300 p-2.5 rounded bg-neutral-50 grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-neutral-600 block uppercase">Valuación Costo Compra</span>
                <span className="font-mono text-sm font-bold">{formatMoney(inventoryTotalValuation)}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-600 block uppercase">Potencial Venta (PVP)</span>
                <span className="font-mono text-sm font-bold">{formatMoney(inventoryRetailPotential)}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-600 block uppercase">Margen Potencial</span>
                <span className="font-mono text-sm font-bold">
                  {formatMoney(inventoryRetailPotential - inventoryTotalValuation)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-600 block uppercase">Bajo Stock Mínimo</span>
                <span className="font-mono text-sm font-bold text-neutral-900">{lowStockCount} artículos</span>
              </div>
            </div>

            <div>
              <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs">
                DETALLE DE INVENTARIO Y STOCK EN ALMACÉN ({inventory.length} referencias)
              </h3>
              <table className="w-full text-xs border border-neutral-300">
                <thead className="bg-neutral-100 border-b border-neutral-300 font-bold">
                  <tr>
                    <th className="py-1 px-2 text-left">SKU / Código</th>
                    <th className="py-1 px-2 text-left">Producto / Referencia</th>
                    <th className="py-1 px-2 text-left">Categoría</th>
                    <th className="py-1 px-2 text-center">Stock</th>
                    <th className="py-1 px-2 text-center">Mínimo</th>
                    <th className="py-1 px-2 text-right">Costo Unit.</th>
                    <th className="py-1 px-2 text-right">PVP Unit.</th>
                    <th className="py-1 px-2 text-right">Valuación Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {inventory.map(item => (
                    <tr key={item.id}>
                      <td className="py-1 px-2 font-mono text-[10px]">{item.sku || '—'}</td>
                      <td className="py-1 px-2 font-medium">
                        {item.name} {item.brand ? `(${item.brand})` : ''}
                      </td>
                      <td className="py-1 px-2 text-neutral-600 capitalize">{item.category}</td>
                      <td className="py-1 px-2 text-center font-mono font-bold">{item.currentStock}</td>
                      <td className="py-1 px-2 text-center font-mono text-neutral-600">{item.minStockAlert}</td>
                      <td className="py-1 px-2 text-right font-mono">{formatMoney(item.unitCost)}</td>
                      <td className="py-1 px-2 text-right font-mono">{item.retailPrice ? formatMoney(item.retailPrice) : '—'}</td>
                      <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(item.currentStock * item.unitCost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-neutral-100 font-bold border-t-2 border-black">
                  <tr>
                    <td colSpan={7} className="py-1.5 px-2 uppercase">TOTAL VALUACIÓN DE STOCK EN COSTO:</td>
                    <td className="py-1.5 px-2 text-right font-mono text-sm">{formatMoney(inventoryTotalValuation)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Printable Report (Print media) */}
      <div id="printable-receipt" className="hidden print:block p-8 bg-white text-black font-sans text-xs">
        {/* Header Oficial A4 */}
        <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wide">{settings.studioName}</h1>
            <p className="text-xs text-neutral-800">{settings.address} · Tel: {settings.phone}</p>
            <p className="text-xs text-neutral-800">
              RUC: <strong className="font-mono">{settings.ruc || settings.taxId}</strong> · Registro Sanitario: <strong>{settings.healthSanitaryRegistration}</strong>
            </p>
            <p className="text-[11px] text-neutral-600">
              Régimen: {settings.regimenTributario || 'GENERAL'} · Quito - Ecuador · Moneda: USD ($)
            </p>
          </div>
          <div className="text-right border border-neutral-300 rounded p-2.5 bg-neutral-50 text-[11px]">
            <div className="font-bold uppercase text-neutral-800 tracking-wider">REPORTE OFICIAL</div>
            <div className="font-mono text-xs font-bold text-neutral-900 mt-0.5">
              {reportTabTitles[activeReportTab]}
            </div>
            <div className="text-neutral-700 mt-1">Período: <strong>{dateFilterLabel}</strong></div>
            <div className="text-neutral-500 text-[10px]">
              Emisión: {new Date().toLocaleDateString('es-EC')} {new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Dynamic Print Content Based on Active Tab */}
        {renderPrintContent()}

        {/* Footer Oficial */}
        <div className="mt-8 pt-3 border-t border-neutral-400 flex justify-between items-center text-[10px] text-neutral-600">
          <div>
            <span className="font-semibold">{settings.studioName}</span> · C.C. Quicentro Shopping, Quito, Ecuador
            <span className="block text-[9px] text-neutral-500">
              Documento emitido para fines de control administrativo, contable y tributario interno bajo normativa ecuatoriana.
            </span>
          </div>
          <div className="text-right font-mono">
            <span>Página 1 de 1 · Sistema InkLedger POS</span>
          </div>
        </div>
      </div>

      {/* Screen Interface - Header & Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#24242A] pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366] shrink-0"></span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Centro Integral de Reportes & Gráficas Contables
            </h2>
          </div>
          <p className="text-[11px] text-neutral-400">
            Gráfica de pastel de departamentos, gráfica de barras por artista, P&L auditado y exportación oficial.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-1 bg-[#121215] p-1 rounded-full border border-[#272730] overflow-x-auto max-w-full">
            {(['today', 'week', 'month', 'quarter', 'year', 'all'] as DateFilterRange[]).map(df => (
              <button
                key={df}
                onClick={() => setDateFilter(df)}
                className={`px-2.5 py-1 text-[11px] rounded-full transition-all whitespace-nowrap ${
                  dateFilter === df
                    ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_8px_rgba(255,51,102,0.4)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {df === 'today' ? 'Hoy' : df === 'week' ? 'Semana' : df === 'month' ? 'Mes' : df === 'quarter' ? 'Trimestre' : df === 'year' ? 'Año' : 'Todo'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#272730] bg-[#18181D] hover:border-[#FF3366] text-white text-xs font-semibold transition-all shadow-xs"
            title="Exportar informe a formato Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#FF3366]" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,51,102,0.3)] cursor-pointer"
            title={`Imprimir ${reportTabTitles[activeReportTab]} o guardar en PDF`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir: {reportTabShortNames[activeReportTab]} / PDF</span>
          </button>

          <button
            onClick={exportBackup}
            className="p-2 rounded-full border border-[#272730] text-neutral-400 hover:text-white hover:bg-[#1C1C22]"
            title="Descargar Backup Completo en JSON"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#FF3366]" />
          </button>
        </div>
      </div>

      {/* Sub-report Navigation Tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 border-b border-[#24242A]">
        {[
          { id: 'executive', label: 'Resumen Ejecutivo & Gráficas', icon: TrendingUp },
          { id: 'visual_charts', label: 'Solo Gráficas (Pastel & Barras)', icon: BarChart3 },
          { id: 'pl_statement', label: 'P&L Estado de Resultados', icon: DollarSign },
          { id: 'artists_productivity', label: 'Productividad de Artistas', icon: Users },
          { id: 'sales_departments', label: 'Líneas de Negocio & Pagos', icon: Layers },
          { id: 'tax_audit', label: 'Auditoría Fiscal & Impuestos', icon: ShieldCheck },
          { id: 'inventory_costs', label: 'Costos de Insumos & Stock', icon: PieChartIcon },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as ReportTab)}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-full text-xs transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.35)]'
                  : 'bg-[#18181D] text-neutral-400 hover:text-white border border-[#272730]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#FF3366]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-REPORT 1: RESUMEN EJECUTIVO CON AMBAS GRÁFICAS */}
      {(activeReportTab === 'executive' || activeReportTab === 'visual_charts') && (
        <div className="space-y-4 sm:space-y-6">
          {activeReportTab === 'executive' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
                <div>
                  <span className="text-neutral-400 text-xs block mb-1">Facturación Bruta Período</span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-white">{formatMoney(totalGrossRevenue)}</div>
                </div>
                <div className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-[#23232A] flex justify-between">
                  <span>Con impuestos ({validSales.length} ventas):</span>
                  <span className="font-mono text-white font-semibold">{formatMoney(totalInvoicedWithTax)}</span>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
                <div>
                  <span className="text-neutral-400 text-xs block mb-1">Margen Bruto de la Casa</span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-[#FF3366]">{formatMoney(grossProfit)}</div>
                </div>
                <div className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-[#23232A] flex justify-between">
                  <span>Margen operativo:</span>
                  <span className="font-mono text-[#FF3366] font-bold">{grossMarginPercent}%</span>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
                <div>
                  <span className="text-neutral-400 text-xs block mb-1">Utilidad Neta (EBITDA)</span>
                  <div className={`text-xl sm:text-2xl font-bold font-mono ${netOperatingProfit >= 0 ? 'text-white' : 'text-[#FF3366]'}`}>
                    {formatMoney(netOperatingProfit)}
                  </div>
                </div>
                <div className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-[#23232A] flex justify-between">
                  <span>Rendimiento neto:</span>
                  <span className={`font-mono font-bold ${netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-[#FF3366]'}`}>
                    {netProfitMarginPercent}%
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
                <div>
                  <span className="text-neutral-400 text-xs block mb-1">Ticket Promedio por Cita</span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-white">{formatMoney(averageTicket)}</div>
                </div>
                <div className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-[#23232A] flex justify-between">
                  <span>Horas tatuadas registradas:</span>
                  <span className="font-mono text-white font-semibold">{totalTattooHours} hrs</span>
                </div>
              </div>
            </div>
          )}

          {/* DUAL CHARTS GRID */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <div className="flex flex-col space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <PieChartIcon className="w-3.5 h-3.5 text-[#FF3366]" />
                  Gráfica de Pastel
                </span>
                <div className="flex items-center gap-1 bg-[#121215] p-1 rounded-full border border-[#272730]">
                  {[
                    { id: 'revenue', label: 'Ingresos' },
                    { id: 'expenses', label: 'Gastos' },
                    { id: 'payments', label: 'Cobros' },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setPieChartMode(m.id as any)}
                      className={`px-2.5 py-0.5 text-[10px] rounded-full transition-all cursor-pointer ${
                        pieChartMode === m.id
                          ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_6px_rgba(255,51,102,0.4)]'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <PieChartWidget
                title={currentPieData.title}
                subtitle={currentPieData.subtitle}
                slices={currentPieData.slices}
                totalAmount={currentPieData.total}
                formatMoney={formatMoney}
              />
            </div>

            <div className="flex flex-col space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-[#FF3366]" />
                  Gráfica de Barras
                </span>
                <div className="flex items-center gap-1 bg-[#121215] p-1 rounded-full border border-[#272730]">
                  {[
                    { id: 'artists', label: 'Por Artista' },
                    { id: 'departments', label: 'Por Línea' },
                    { id: 'hours', label: 'Horas' },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setBarChartMode(m.id as any)}
                      className={`px-2.5 py-0.5 text-[10px] rounded-full transition-all cursor-pointer ${
                        barChartMode === m.id
                          ? 'bg-[#FF3366] text-white font-bold shadow-[0_0_6px_rgba(255,51,102,0.4)]'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <BarChartWidget
                title={currentBarData.title}
                subtitle={currentBarData.subtitle}
                data={currentBarData.data}
                formatMoney={formatMoney}
                modeLabel1={currentBarData.label1}
                modeLabel2={currentBarData.label2}
              />
            </div>
          </div>

          {activeReportTab === 'visual_charts' && (
            <BarChartWidget
              title="Gráfica de Barras: Flujo Financiero Global"
              subtitle="Ingresos Totales Brutos vs Costos Totales de Operación"
              data={[
                {
                  id: 'total_flow',
                  label: 'Flujo Período',
                  value1: grossProfit,
                  value2: totalDirectCosts + totalFixedExpenses,
                },
                {
                  id: 'tattoo_dept',
                  label: 'Tatuajes',
                  value1: deptMargin.tattoo.margin,
                  value2: deptMargin.tattoo.cost,
                },
                {
                  id: 'piercing_dept',
                  label: 'Piercing',
                  value1: deptMargin.piercing.margin,
                  value2: deptMargin.piercing.cost,
                },
                {
                  id: 'retail_dept',
                  label: 'Joyería/Cremas',
                  value1: deptMargin.jewelry.margin + deptMargin.aftercare.margin,
                  value2: deptMargin.jewelry.cost + deptMargin.aftercare.cost,
                },
              ]}
              formatMoney={formatMoney}
              modeLabel1="Margen Generado"
              modeLabel2="Costes / Comisiones"
            />
          )}

          {activeReportTab === 'executive' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
                <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Estructura de Costos del Período</h3>
                  <span className="text-xs font-mono text-[#FF3366] font-bold">Total: {formatMoney(totalDirectCosts + totalFixedExpenses)}</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-neutral-300 mb-1">
                      <span>Comisiones de Artistas ({totalGrossRevenue > 0 ? Math.round((totalArtistCommissions / totalGrossRevenue) * 100) : 0}%)</span>
                      <span className="font-mono text-[#FF3366] font-bold">{formatMoney(totalArtistCommissions)}</span>
                    </div>
                    <div className="h-2 bg-[#24242D] rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF3366] rounded-full" style={{ width: `${totalGrossRevenue > 0 ? (totalArtistCommissions / totalGrossRevenue) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-neutral-300 mb-1">
                      <span>Insumos y Reposición de Joyería ({totalGrossRevenue > 0 ? Math.round((supplyExpenses / totalGrossRevenue) * 100) : 0}%)</span>
                      <span className="font-mono text-white font-bold">{formatMoney(supplyExpenses)}</span>
                    </div>
                    <div className="h-2 bg-[#24242D] rounded-full overflow-hidden">
                      <div className="h-full bg-neutral-400 rounded-full" style={{ width: `${totalGrossRevenue > 0 ? (supplyExpenses / totalGrossRevenue) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-neutral-300 mb-1">
                      <span>Gastos Fijos de Operación (Renta, Luz, Sanidad) ({totalGrossRevenue > 0 ? Math.round((totalFixedExpenses / totalGrossRevenue) * 100) : 0}%)</span>
                      <span className="font-mono text-amber-400 font-bold">{formatMoney(totalFixedExpenses)}</span>
                    </div>
                    <div className="h-2 bg-[#24242D] rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${totalGrossRevenue > 0 ? (totalFixedExpenses / totalGrossRevenue) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
                <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Cobros por Método</h3>
                  <span className="text-xs font-mono text-white font-bold">{formatMoney(paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.transfer)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730]">
                    <span className="text-[10px] text-neutral-400 block mb-1">Efectivo</span>
                    <span className="font-mono text-base font-bold text-emerald-400">{formatMoney(paymentBreakdown.cash)}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730]">
                    <span className="text-[10px] text-neutral-400 block mb-1">Tarjeta / Datáfono</span>
                    <span className="font-mono text-base font-bold text-sky-400">{formatMoney(paymentBreakdown.card)}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730]">
                    <span className="text-[10px] text-neutral-400 block mb-1">Transferencias</span>
                    <span className="font-mono text-base font-bold text-[#FF3366]">{formatMoney(paymentBreakdown.transfer)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-REPORT 2: P&L DETALLADO */}
      {activeReportTab === 'pl_statement' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24242B] pb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Cuenta de Pérdidas y Ganancias (P&L Audit)
              </h3>
              <p className="text-[11px] text-neutral-400">
                {settings.studioName} · Período contable: {dateFilter}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-[#FF3366]/15 border border-[#FF3366]/40 text-[#FF3366] font-mono font-bold text-xs">
                Margen Bruto: {grossMarginPercent}%
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono font-bold text-xs">
                Margen Neto: {netProfitMarginPercent}%
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs font-sans">
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-[#121215] border border-[#272730] flex justify-between items-center font-bold text-white">
                <span>1. INGRESOS OPERATIVOS BRUTOS</span>
                <span className="font-mono text-base">{formatMoney(totalGrossRevenue)}</span>
              </div>
              <div className="pl-3 sm:pl-4 space-y-1 text-neutral-400">
                <div className="flex justify-between py-1 border-b border-[#202026]">
                  <span>Facturación Tatuajes Artísticos</span>
                  <span className="font-mono text-white font-semibold">{formatMoney(tattooRevenue)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#202026]">
                  <span>Facturación Procedimientos Body Piercing</span>
                  <span className="font-mono text-white font-semibold">{formatMoney(piercingRevenue)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#202026]">
                  <span>Ventas de Mostrador - Joyería Titanio / Oro</span>
                  <span className="font-mono text-white font-semibold">{formatMoney(jewelryRevenue)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#202026]">
                  <span>Ventas de Mostrador - Aftercare & Bálsamos</span>
                  <span className="font-mono text-white font-semibold">{formatMoney(aftercareRevenue)}</span>
                </div>
                {otherRevenue > 0 && (
                  <div className="flex justify-between py-1 border-b border-[#202026]">
                    <span>Otros Servicios & Señales</span>
                    <span className="font-mono text-white font-semibold">{formatMoney(otherRevenue)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-[#121215] border border-[#272730] flex justify-between items-center font-bold text-[#FF3366]">
                <span>2. COSTOS DIRECTOS DE SERVICIO (COGS)</span>
                <span className="font-mono text-base">-{formatMoney(totalDirectCosts)}</span>
              </div>
              <div className="pl-3 sm:pl-4 space-y-1 text-neutral-400">
                <div className="flex justify-between py-1 border-b border-[#202026]">
                  <span>Comisiones a Tatuadores y Anilladores</span>
                  <span className="font-mono text-[#FF3366] font-semibold">-{formatMoney(totalArtistCommissions)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#202026]">
                  <span>Compras de Insumos (Agujas, tintas, apósitos) y Joyería</span>
                  <span className="font-mono text-[#FF3366] font-semibold">-{formatMoney(supplyExpenses)}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FF3366]/10 border border-[#FF3366]/30 flex justify-between items-center text-sm font-bold">
              <span className="text-white">(=) MARGEN BRUTO OPERATIVO</span>
              <span className="font-mono text-[#FF3366] text-base">{formatMoney(grossProfit)} ({grossMarginPercent}%)</span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-[#121215] border border-[#272730] flex justify-between items-center font-bold text-amber-400">
                <span>3. GASTOS FIJOS Y ESTRUCTURA (OPEX)</span>
                <span className="font-mono text-base">-{formatMoney(totalFixedExpenses)}</span>
              </div>
              <div className="pl-3 sm:pl-4 space-y-1 text-neutral-400">
                <div className="flex justify-between py-1 border-b border-[#202026]">
                  <span>Alquiler del Local Comercial</span>
                  <span className="font-mono text-neutral-200">{formatMoney(rentExpense)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#202026]">
                  <span>Suministros (Electricidad, agua, climatización)</span>
                  <span className="font-mono text-neutral-200">{formatMoney(utilitiesExpense)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#202026]">
                  <span>Bioseguridad, Sanidad & Gestión Residuos Peligrosos</span>
                  <span className="font-mono text-neutral-200">{formatMoney(bioSanitaryExpense)}</span>
                </div>
                {otherFixedExpenses > 0 && (
                  <div className="flex justify-between py-1 border-b border-[#202026]">
                    <span>Otros Gastos Operativos (TPV, Software, Marketing)</span>
                    <span className="font-mono text-neutral-200">{formatMoney(otherFixedExpenses)}</span>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm ${
                netOperatingProfit >= 0
                  ? 'bg-[#14231A] border-emerald-500/40 text-emerald-400'
                  : 'bg-[#29141D] border-[#FF3366]/40 text-[#FF4D79]'
              }`}
            >
              <div>
                <span className="font-bold text-sm sm:text-base block">(=) RESULTADO NETO DEL ESTUDIO (EBITDA)</span>
                <span className="text-[11px] text-neutral-400">Ganancia final líquida generada</span>
              </div>
              <span className="font-mono text-xl sm:text-2xl font-bold">{formatMoney(netOperatingProfit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-REPORT 3: PRODUCTIVIDAD DE ARTISTAS */}
      {activeReportTab === 'artists_productivity' && (
        <div className="space-y-6">
          <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24242B] pb-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Tabla de Rendimiento y Liquidación por Artista
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Volumen facturado, horas en cabina, retención de la casa y comisiones devengadas
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#FF3366]">
                {artistProductivity.length} artistas evaluados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#121215] border-b border-[#24242B] text-neutral-400 font-medium">
                    <th className="py-3 px-4 whitespace-nowrap">Artista</th>
                    <th className="py-3 px-4 whitespace-nowrap">Rol / Especialidad</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Citas</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Horas Tatuaje</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Facturación Bruta</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Comisión Artista</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Retención Casa</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Propinas</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Ticket Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222228]">
                  {artistProductivity.map(item => (
                    <tr key={item.artist.id} className="hover:bg-[#1E1E25] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                        {item.artist.name}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-400 whitespace-nowrap">
                        <span className="text-[#FF3366] font-semibold">{item.artist.role}</span>
                        <span className="block text-[10px] text-neutral-500 truncate max-w-[160px]">{item.artist.specialty}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white whitespace-nowrap">
                        {item.sessionsCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-neutral-300 whitespace-nowrap">
                        {item.hours > 0 ? `${item.hours}h` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                        {formatMoney(item.gross)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#FF3366] whitespace-nowrap">
                        {formatMoney(item.commission)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {formatMoney(item.studioCut)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-neutral-300 whitespace-nowrap">
                        {item.tips > 0 ? formatMoney(item.tips) : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-white whitespace-nowrap">
                        {formatMoney(item.averagePerSession)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-REPORT 4: LÍNEAS DE NEGOCIO & MÉTODOS DE COBRO */}
      {activeReportTab === 'sales_departments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <PieChartWidget
              title="Distribución de Facturación por Departamento"
              subtitle="Desglose de ingresos en Tatuajes, Piercings, Joyería y Aftercare"
              slices={pieChartSlices}
              totalAmount={totalGrossRevenue}
              formatMoney={formatMoney}
            />

            <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
              <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Canales de Cobro Utilizados
                </h3>
                <span className="text-xs font-mono font-bold text-white">
                  Total: {formatMoney(paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.transfer)}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-[#121215] border border-[#272730] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 block mb-0.5">Efectivo en Caja</span>
                    <span className="font-semibold text-white">Billetes y monedas físicas</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-emerald-400">{formatMoney(paymentBreakdown.cash)}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#121215] border border-[#272730] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 block mb-0.5">Tarjetas / Datáfono TPV</span>
                    <span className="font-semibold text-white">Cobro digital directo a banco</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-sky-400">{formatMoney(paymentBreakdown.card)}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#121215] border border-[#272730] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 block mb-0.5">Transferencias / Bizum / Zelle</span>
                    <span className="font-semibold text-white">Transferencias electrónicas</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-[#FF3366]">{formatMoney(paymentBreakdown.transfer)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-REPORT 5: AUDITORÍA FISCAL */}
      {activeReportTab === 'tax_audit' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24242B] pb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Auditoría Fiscal y Balance de Impuestos
              </h3>
              <p className="text-[11px] text-neutral-400">
                Cálculo de impuestos repercutidos en tickets de venta vs impuestos soportados en compras de suministros
              </p>
            </div>
            <span className="font-mono font-bold text-xs text-[#FF3366] bg-[#FF3366]/15 px-3 py-1 rounded-full border border-[#FF3366]/30 self-start sm:self-auto">
              Período: {dateFilter}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#121215] border border-[#272730]">
              <span className="text-[10px] text-neutral-400 block mb-1">Impuesto Repercutido (Cobrado)</span>
              <span className="text-xl font-bold font-mono text-white">{formatMoney(outputTax)}</span>
              <span className="text-[10px] text-neutral-500 block mt-1">Generado en {validSales.length} ventas</span>
            </div>

            <div className="p-4 rounded-xl bg-[#121215] border border-[#272730]">
              <span className="text-[10px] text-neutral-400 block mb-1">Impuesto Soportado (Deducible)</span>
              <span className="text-xl font-bold font-mono text-emerald-400">{formatMoney(inputTax)}</span>
              <span className="text-[10px] text-neutral-500 block mt-1">En facturas de proveedores</span>
            </div>

            <div className="p-4 rounded-xl bg-[#121215] border border-[#272730]">
              <span className="text-[10px] text-neutral-400 block mb-1">Saldo Fiscal a Liquidar</span>
              <span className={`text-xl font-bold font-mono ${netTaxPayable >= 0 ? 'text-[#FF3366]' : 'text-emerald-400'}`}>
                {formatMoney(netTaxPayable)}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-1">{netTaxPayable >= 0 ? 'A ingresar' : 'A favor del estudio'}</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-REPORT 6: COSTOS DE INSUMOS & STOCK */}
      {activeReportTab === 'inventory_costs' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24242B] pb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Auditoría de Insumos y Valuación de Stock
              </h3>
              <p className="text-[11px] text-neutral-400">
                Valor monetario inmovilizado en cabinas y vitrinas de joyería
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-white font-bold">Valuación Almacén: {formatMoney(inventoryTotalValuation)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#121215] border border-[#272730]">
              <span className="text-[10px] text-neutral-400 block mb-1">Valoración a Costo de Compra</span>
              <span className="font-mono text-xl font-bold text-white">{formatMoney(inventoryTotalValuation)}</span>
              <span className="text-[10px] text-neutral-500 block mt-1">{inventory.length} referencias en stock</span>
            </div>

            <div className="p-4 rounded-xl bg-[#121215] border border-[#272730]">
              <span className="text-[10px] text-neutral-400 block mb-1">Potencial de Venta (PVP)</span>
              <span className="font-mono text-xl font-bold text-emerald-400">{formatMoney(inventoryRetailPotential)}</span>
              <span className="text-[10px] text-neutral-500 block mt-1">Joyería y Aftercare en mostrador</span>
            </div>

            <div className="p-4 rounded-xl bg-[#121215] border border-[#272730]">
              <span className="text-[10px] text-neutral-400 block mb-1">Alertas de Stock Mínimo</span>
              <span className={`font-mono text-xl font-bold ${lowStockCount > 0 ? 'text-[#FF3366]' : 'text-white'}`}>
                {lowStockCount} artículos
              </span>
              <span className="text-[10px] text-neutral-500 block mt-1">Requieren reposición</span>
            </div>
          </div>
        </div>
      )}

      {/* System Backup & Data Reset Section */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Copias de Seguridad y Respaldo</h4>
          <p className="text-[11px] text-neutral-400">
            Descarga una copia de seguridad en JSON con todos los datos contables o restaura un backup previo.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#272730] bg-[#121215] hover:border-[#FF3366] text-white text-xs font-semibold transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-[#FF3366]" />
            <span>Restaurar Backup</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />

        </div>
      </div>
    </div>
  );
};
