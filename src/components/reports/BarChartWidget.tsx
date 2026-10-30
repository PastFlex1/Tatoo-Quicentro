import React, { useState } from 'react';

export interface BarDataPoint {
  id: string;
  label: string;
  sublabel?: string;
  value1: number; // Primary value (e.g. Artist commission or Gross)
  value2?: number; // Secondary value (e.g. Studio cut or Expenses)
  label1?: string;
  label2?: string;
}

interface BarChartWidgetProps {
  data: BarDataPoint[];
  formatMoney: (val: number) => string;
  title: string;
  subtitle: string;
  modeLabel1?: string;
  modeLabel2?: string;
}

export const BarChartWidget: React.FC<BarChartWidgetProps> = ({
  data,
  formatMoney,
  title,
  subtitle,
  modeLabel1 = 'Comisión Artista',
  modeLabel2 = 'Retención Estudio',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Compute maximum total value to scale the bars
  const maxValue = Math.max(
    ...data.map(d => (d.value1 || 0) + (d.value2 || 0)),
    100
  );

  // Ceiling rounded to a clean number
  const yAxisMax = Math.ceil(maxValue / 100) * 100 || 500;
  const chartHeight = 170; // SVG viewBox height for the bar plotting area

  return (
    <div className="p-6 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#24242B] pb-3 mb-4">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
          <p className="text-[11px] text-neutral-400">{subtitle}</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366] shadow-[0_0_6px_#FF3366]" />
            <span className="text-neutral-300 font-medium">{modeLabel1}</span>
          </div>
          {modeLabel2 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
              <span className="text-neutral-300 font-medium">{modeLabel2}</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Bar Chart Area */}
      <div className="relative pt-6 pb-2">
        {/* Background Grid Lines */}
        <div className="absolute inset-x-0 top-6 bottom-10 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-dashed border-neutral-400 w-full" />
          <div className="border-b border-dashed border-neutral-400 w-full" />
          <div className="border-b border-dashed border-neutral-400 w-full" />
        </div>

        {/* Bars Container */}
        <div className="flex items-end justify-around gap-2 h-44 px-2 relative z-10">
          {data.map((item, index) => {
            const v1 = item.value1 || 0;
            const v2 = item.value2 || 0;
            const total = v1 + v2;

            const heightPct1 = Math.min(100, Math.max(4, (v1 / yAxisMax) * 100));
            const heightPct2 = v2 > 0 ? Math.min(100, Math.max(4, (v2 / yAxisMax) * 100)) : 0;
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="flex-1 max-w-[70px] flex flex-col items-center h-full justify-end cursor-pointer group"
              >
                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute top-0 z-30 bg-[#121215] border border-[#FF3366]/40 text-white px-3 py-1.5 rounded-xl text-[11px] shadow-2xl pointer-events-none transform -translate-y-2 whitespace-nowrap">
                    <div className="font-bold text-white mb-0.5">{item.label}</div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[#FF3366]">{modeLabel1}: {formatMoney(v1)}</span>
                      {v2 > 0 && <span className="text-neutral-300">{modeLabel2}: {formatMoney(v2)}</span>}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 border-t border-[#25252E] pt-0.5 font-mono">
                      Total: <span className="text-white font-bold">{formatMoney(total)}</span>
                    </div>
                  </div>
                )}

                {/* Vertical Bar Stack */}
                <div className="w-full flex items-end justify-center gap-1.5 h-full">
                  {/* Bar 1 (Commission) */}
                  <div
                    className={`w-4 sm:w-5 bg-[#FF3366] rounded-t-lg transition-all duration-300 ${
                      isHovered
                        ? 'brightness-125 shadow-[0_0_12px_rgba(255,51,102,0.5)]'
                        : 'group-hover:brightness-110'
                    }`}
                    style={{ height: `${heightPct1}%` }}
                  />

                  {/* Bar 2 (Studio) */}
                  {v2 > 0 && (
                    <div
                      className={`w-4 sm:w-5 bg-neutral-300 rounded-t-lg transition-all duration-300 ${
                        isHovered
                          ? 'brightness-125 shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                          : 'group-hover:brightness-110'
                      }`}
                      style={{ height: `${heightPct2}%` }}
                    />
                  )}
                </div>

                {/* Label X-axis */}
                <div className="text-center mt-2.5 truncate max-w-full">
                  <span
                    className={`text-[11px] block truncate transition-colors ${
                      isHovered ? 'text-white font-bold' : 'text-neutral-400'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-500 block truncate">
                    {formatMoney(total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
