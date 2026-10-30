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
    artists,
    inventory,
    formatMoney,
    settings,
    dateFilter,
    setDateFilter,
    resetToDemo,
    clearAllData,
    exportBackup,
    importBackup,
  } = useStudio();

  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('executive');
  const [selectedArtistFilter, setSelectedArtistFilter] = useState<string>('all');
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

  const totalStudioRetained = useMemo(() => {
    return validSales.reduce((acc, s) => acc + s.studioShare, 0);
  }, [validSales]);

  const totalTips = useMemo(() => {
    return validSales.reduce((acc, s) => acc + s.tipAmount, 0);
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
  const supplyExpenses = useMemo(() => {
    return filteredExpenses
      .filter(e => ['supplies_tattoo', 'supplies_piercing', 'jewelry_restock'].includes(e.category))
      .reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

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
      value1: a.commission, // Artista
      value2: a.studioCut, // Casa
      label1: 'Comisión Artista',
      label2: 'Retención Estudio',
    }));
  }, [artistProductivity]);

  // Dynamic Pie Chart Data based on user-selected mode
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

  // Dynamic Bar Chart Data based on user-selected mode
  const currentBarData = useMemo(() => {
    if (barChartMode === 'departments') {
      return {
        data: [
          {
            id: 'dept_tattoo',
            label: 'Tatuajes',
            value1: tattooRevenue * 0.65,
            value2: tattooRevenue * 0.35,
          },
          {
            id: 'dept_piercing',
            label: 'Piercing',
            value1: piercingRevenue * 0.5,
            value2: piercingRevenue * 0.5,
          },
          {
            id: 'dept_jewelry',
            label: 'Joyería',
            value1: jewelryRevenue,
            value2: supplyExpenses * 0.35,
          },
          {
            id: 'dept_aftercare',
            label: 'Aftercare',
            value1: aftercareRevenue,
            value2: supplyExpenses * 0.15,
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Printable Report (Print media) */}
      <div id="printable-receipt" className="hidden print:block p-8 bg-white text-black font-sans text-xs">
        <div className="border-b-2 border-black pb-4 mb-4 text-center">
          <h1 className="text-xl font-bold uppercase">{settings.studioName}</h1>
          <p className="text-xs">{settings.address} · Tel: {settings.phone}</p>
          <p className="text-xs">Tax ID / NIF: {settings.taxId} · Registro Sanitario: {settings.healthSanitaryRegistration}</p>
          <h2 className="text-sm font-bold uppercase mt-3 tracking-wider">INFORME EJECUTIVO DE CONTABILIDAD Y RESULTADOS</h2>
          <p className="text-[11px] text-neutral-600">Período: {dateFilter} · Fecha: {new Date().toLocaleDateString('es-ES')}</p>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-bold border-b border-neutral-400 pb-1 mb-2">1. ESTADO DE RESULTADOS (P&L)</h3>
            <table className="w-full text-xs">
              <tbody>
                <tr><td className="py-1">Ingresos Brutos Servicios & Ventas</td><td className="py-1 text-right font-mono font-bold">{formatMoney(totalGrossRevenue)}</td></tr>
                <tr><td className="py-1 pl-4 text-neutral-600">(-) Comisiones a Artistas</td><td className="py-1 text-right font-mono text-neutral-700">-{formatMoney(totalArtistCommissions)}</td></tr>
                <tr><td className="py-1 pl-4 text-neutral-600">(-) Insumos de Tatuaje y Joyería</td><td className="py-1 text-right font-mono text-neutral-700">-{formatMoney(supplyExpenses)}</td></tr>
                <tr className="font-bold border-t border-b border-neutral-300"><td className="py-1">(=) MARGEN BRUTO OPERATIVO</td><td className="py-1 text-right font-mono">{formatMoney(grossProfit)} ({grossMarginPercent}%)</td></tr>
                <tr><td className="py-1 pl-4 text-neutral-600">(-) Alquiler y Suministros</td><td className="py-1 text-right font-mono text-neutral-700">-{formatMoney(rentExpense + utilitiesExpense)}</td></tr>
                <tr><td className="py-1 pl-4 text-neutral-600">(-) Bioseguridad y Sanidad</td><td className="py-1 text-right font-mono text-neutral-700">-{formatMoney(bioSanitaryExpense)}</td></tr>
                <tr><td className="py-1 pl-4 text-neutral-600">(-) Otros Gastos Fijos</td><td className="py-1 text-right font-mono text-neutral-700">-{formatMoney(otherFixedExpenses)}</td></tr>
                <tr className="font-bold text-sm border-t-2 border-black"><td className="py-1.5">(=) RESULTADO NETO (EBITDA)</td><td className="py-1.5 text-right font-mono">{formatMoney(netOperatingProfit)} ({netProfitMarginPercent}%)</td></tr>
              </tbody>
            </table>
          </div>

          <div className="pt-3">
            <h3 className="font-bold border-b border-neutral-400 pb-1 mb-2">2. RENDIMIENTO POR ARTISTA</h3>
            <table className="w-full text-xs border border-neutral-300">
              <thead className="bg-neutral-100 border-b border-neutral-300 font-bold">
                <tr><th className="py-1 px-2 text-left">Artista</th><th className="py-1 px-2 text-center">Citas</th><th className="py-1 px-2 text-right">Facturado</th><th className="py-1 px-2 text-right">Comisión</th><th className="py-1 px-2 text-right">Estudio</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {artistProductivity.map(a => (
                  <tr key={a.artist.id}>
                    <td className="py-1 px-2 font-medium">{a.artist.name}</td>
                    <td className="py-1 px-2 text-center">{a.sessionsCount}</td>
                    <td className="py-1 px-2 text-right font-mono">{formatMoney(a.gross)}</td>
                    <td className="py-1 px-2 text-right font-mono">{formatMoney(a.commission)}</td>
                    <td className="py-1 px-2 text-right font-mono font-bold">{formatMoney(a.studioCut)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t border-neutral-400 pt-2">
              <p className="font-bold">Dirección / Administración del Estudio</p>
              <p className="text-[10px] text-neutral-500">Firma y Sello</p>
            </div>
            <div className="border-t border-neutral-400 pt-2">
              <p className="font-bold">Responsable Contable</p>
              <p className="text-[10px] text-neutral-500">Conformidad de Cierre</p>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Interface - Header & Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#24242A] pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366]"></span>
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
          {/* Quick Date Range Filter */}
          <div className="flex items-center gap-1 bg-[#121215] p-1 rounded-full border border-[#272730]">
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,51,102,0.3)]"
            title="Imprimir informe formal o guardar como PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / PDF</span>
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
      <div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-[#24242A]">
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
              className={`flex items-center gap-2 py-2 px-3.5 rounded-full text-xs transition-all whitespace-nowrap ${
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

      {/* SUB-REPORT 1: RESUMEN EJECUTIVO CON AMBAS GRÁFICAS (PASTEL Y BARRAS) */}
      {(activeReportTab === 'executive' || activeReportTab === 'visual_charts') && (
        <div className="space-y-6">
          {/* Executive KPI Cards (If in executive tab) */}
          {activeReportTab === 'executive' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
                <div>
                  <span className="text-neutral-400 text-xs block mb-1">Facturación Bruta Período</span>
                  <div className="text-2xl font-bold font-mono text-white">{formatMoney(totalGrossRevenue)}</div>
                </div>
                <div className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-[#23232A] flex justify-between">
                  <span>Con impuestos ({validSales.length} ventas):</span>
                  <span className="font-mono text-white font-semibold">{formatMoney(totalInvoicedWithTax)}</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
                <div>
                  <span className="text-neutral-400 text-xs block mb-1">Margen Bruto de la Casa</span>
                  <div className="text-2xl font-bold font-mono text-[#FF3366]">{formatMoney(grossProfit)}</div>
                </div>
                <div className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-[#23232A] flex justify-between">
                  <span>Margen operativo:</span>
                  <span className="font-mono text-[#FF3366] font-bold">{grossMarginPercent}%</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
                <div>
                  <span className="text-neutral-400 text-xs block mb-1">Utilidad Neta (EBITDA)</span>
                  <div className={`text-2xl font-bold font-mono ${netOperatingProfit >= 0 ? 'text-white' : 'text-[#FF3366]'}`}>
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

              <div className="p-5 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
                <div>
                  <span className="text-neutral-400 text-xs block mb-1">Ticket Promedio por Cita</span>
                  <div className="text-2xl font-bold font-mono text-white">{formatMoney(averageTicket)}</div>
                </div>
                <div className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-[#23232A] flex justify-between">
                  <span>Horas tatuadas registradas:</span>
                  <span className="font-mono text-white font-semibold">{totalTattooHours} hrs</span>
                </div>
              </div>
            </div>
          )}

          {/* DUAL CHARTS GRID: GRÁFICA DE PASTEL Y GRÁFICA DE BARRAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. GRÁFICA DE PASTEL / DONA (PIE CHART) */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between px-1">
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

            {/* 2. GRÁFICA DE BARRAS (BAR CHART) */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between px-1">
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

          {/* Additional Financial Flow Bar Chart if in visual_charts tab */}
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
                  value1: tattooRevenue * 0.65,
                  value2: tattooRevenue * 0.35,
                },
                {
                  id: 'piercing_dept',
                  label: 'Piercing',
                  value1: piercingRevenue * 0.5,
                  value2: piercingRevenue * 0.5,
                },
                {
                  id: 'retail_dept',
                  label: 'Joyería/Cremas',
                  value1: jewelryRevenue + aftercareRevenue,
                  value2: supplyExpenses,
                },
              ]}
              formatMoney={formatMoney}
              modeLabel1="Margen Generado"
              modeLabel2="Costes / Comisiones"
            />
          )}

          {/* Performance Summary Cards (Only in executive tab) */}
          {activeReportTab === 'executive' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Direct Cost Distribution Card */}
              <div className="p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
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

              {/* Quick Payment Channels */}
              <div className="p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
                <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Cobros por Método</h3>
                  <span className="text-xs font-mono text-white font-bold">{formatMoney(paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.transfer)}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs">
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
        <div className="p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24242B] pb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Cuenta de Pérdidas y Ganancias (P&L Audit)
              </h3>
              <p className="text-[11px] text-neutral-400">
                {settings.studioName} · Período contable: {dateFilter}
              </p>
            </div>
            <div className="flex items-center gap-2">
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
              <div className="pl-4 space-y-1 text-neutral-400">
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
              <div className="pl-4 space-y-1 text-neutral-400">
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
              <div className="pl-4 space-y-1 text-neutral-400">
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
              className={`p-4 rounded-2xl border flex justify-between items-center text-sm ${
                netOperatingProfit >= 0
                  ? 'bg-[#14231A] border-emerald-500/40 text-emerald-400'
                  : 'bg-[#29141D] border-[#FF3366]/40 text-[#FF4D79]'
              }`}
            >
              <div>
                <span className="font-bold text-base block">(=) RESULTADO NETO DEL ESTUDIO (EBITDA)</span>
                <span className="text-[11px] text-neutral-400">Ganancia final líquida generada</span>
              </div>
              <span className="font-mono text-2xl font-bold">{formatMoney(netOperatingProfit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-REPORT 3: PRODUCTIVIDAD DE ARTISTAS */}
      {activeReportTab === 'artists_productivity' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
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
                    <th className="py-3 px-4">Artista</th>
                    <th className="py-3 px-4">Rol / Especialidad</th>
                    <th className="py-3 px-4 text-center">Citas</th>
                    <th className="py-3 px-4 text-center">Horas Tatuaje</th>
                    <th className="py-3 px-4 text-right">Facturación Bruta</th>
                    <th className="py-3 px-4 text-right">Comisión Artista</th>
                    <th className="py-3 px-4 text-right">Retención Casa</th>
                    <th className="py-3 px-4 text-right">Propinas</th>
                    <th className="py-3 px-4 text-right">Ticket Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222228]">
                  {artistProductivity.map(item => (
                    <tr key={item.artist.id} className="hover:bg-[#1E1E25] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                        {item.artist.name}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-400">
                        <span className="text-[#FF3366] font-semibold">{item.artist.role}</span>
                        <span className="block text-[10px] text-neutral-500 truncate max-w-[160px]">{item.artist.specialty}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                        {item.sessionsCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-neutral-300">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChartWidget
              title="Distribución de Facturación por Departamento"
              subtitle="Desglose de ingresos en Tatuajes, Piercings, Joyería y Aftercare"
              slices={pieChartSlices}
              totalAmount={totalGrossRevenue}
              formatMoney={formatMoney}
            />

            <div className="p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-4">
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
        <div className="p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24242B] pb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Auditoría Fiscal y Balance de Impuestos
              </h3>
              <p className="text-[11px] text-neutral-400">
                Cálculo de impuestos repercutidos en tickets de venta vs impuestos soportados en compras de suministros
              </p>
            </div>
            <span className="font-mono font-bold text-xs text-[#FF3366] bg-[#FF3366]/15 px-3 py-1 rounded-full border border-[#FF3366]/30">
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
        <div className="p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-5">
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
      <div className="p-6 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Copias de Seguridad y Respaldo</h4>
          <p className="text-[11px] text-neutral-400">
            Descarga una copia de seguridad en JSON con todos los datos contables o restaura un backup previo.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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

          <button
            onClick={() => {
              if (confirm('¿Restablecer el sistema con los datos de ejemplo del estudio?')) {
                resetToDemo();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#272730] bg-[#121215] hover:border-[#FF3366] text-white text-xs font-semibold transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FF3366]" />
            <span>Recargar Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
