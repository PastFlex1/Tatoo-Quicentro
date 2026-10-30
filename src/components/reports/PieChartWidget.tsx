import React, { useState } from 'react';

interface PieSlice {
  label: string;
  value: number;
  color: string;
  sublabel?: string;
}

interface PieChartWidgetProps {
  slices: PieSlice[];
  totalAmount: number;
  formatMoney: (val: number) => string;
  title: string;
  subtitle: string;
}

export const PieChartWidget: React.FC<PieChartWidgetProps> = ({
  slices,
  totalAmount,
  formatMoney,
  title,
  subtitle,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const radius = 80;
  const innerRadius = 50; // Donut style
  const center = 100;

  // Compute angles for each slice
  let currentAngle = 0;
  const sliceAngles = slices.map(s => {
    const fraction = totalAmount > 0 ? s.value / totalAmount : 0;
    const angle = fraction * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle += angle;
    return {
      ...s,
      fraction,
      percentage: Math.round(fraction * 100),
      startAngle,
      endAngle,
    };
  });

  const getCoordinates = (angleInDegrees: number, r: number) => {
    const rad = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  const activeSlice = hoveredIndex !== null ? sliceAngles[hoveredIndex] : null;

  return (
    <div className="p-6 rounded-2xl bg-[#18181D] border border-[#272730] flex flex-col justify-between">
      <div className="border-b border-[#24242B] pb-3 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
          <span className="text-xs font-mono font-bold text-[#FF3366]">{formatMoney(totalAmount)}</span>
        </div>
        <p className="text-[11px] text-neutral-400">{subtitle}</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* SVG Donut / Pie Chart */}
        <div className="relative w-52 h-52 shrink-0">
          <svg className="w-full h-full" viewBox="0 0 200 200">
            {totalAmount === 0 ? (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#24242D"
                strokeWidth="30"
              />
            ) : (
              sliceAngles.map((slice, i) => {
                if (slice.value <= 0) return null;
                // If it's a full 360 circle
                if (slice.percentage >= 99.5) {
                  return (
                    <circle
                      key={slice.label}
                      cx={center}
                      cy={center}
                      r={(radius + innerRadius) / 2}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={radius - innerRadius}
                      className="cursor-pointer transition-all duration-300"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  );
                }

                const isHovered = hoveredIndex === i;
                const rOuter = isHovered ? radius + 4 : radius;
                const rInner = innerRadius;

                const startOuter = getCoordinates(slice.startAngle, rOuter);
                const endOuter = getCoordinates(slice.endAngle, rOuter);
                const startInner = getCoordinates(slice.endAngle, rInner);
                const endInner = getCoordinates(slice.startAngle, rInner);

                const largeArcFlag = slice.endAngle - slice.startAngle <= 180 ? 0 : 1;

                const pathData = [
                  `M ${startOuter.x} ${startOuter.y}`,
                  `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
                  `L ${startInner.x} ${startInner.y}`,
                  `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
                  'Z',
                ].join(' ');

                return (
                  <path
                    key={slice.label}
                    d={pathData}
                    fill={slice.color}
                    className="cursor-pointer transition-all duration-300 hover:opacity-90"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    filter={isHovered ? 'drop-shadow(0px 0px 8px rgba(255,51,102,0.4))' : undefined}
                  />
                );
              })
            )}
          </svg>

          {/* Central Donut Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
            {activeSlice ? (
              <>
                <span className="font-mono text-xs font-bold text-white truncate max-w-[100px]">
                  {activeSlice.percentage}%
                </span>
                <span className="text-[10px] text-neutral-400 font-mono truncate max-w-[110px]">
                  {formatMoney(activeSlice.value)}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Total</span>
                <span className="font-mono text-xs font-bold text-white">
                  {formatMoney(totalAmount)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2.5 w-full text-xs">
          {sliceAngles.map((slice, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <div
                key={slice.label}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isHovered
                    ? 'bg-[#202028] border-[#FF3366]/40 shadow-xs'
                    : 'bg-[#121215] border-[#272730]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <div className="truncate">
                    <span className="font-medium text-white block truncate">{slice.label}</span>
                    {slice.sublabel && (
                      <span className="text-[10px] text-neutral-500 block truncate">{slice.sublabel}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <span className="font-mono font-bold text-white block">
                    {formatMoney(slice.value)}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-400">
                    {slice.percentage}%
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
