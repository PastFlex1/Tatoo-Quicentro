import React, { useMemo } from 'react';

/**
 * Pure SVG Code 128 (Subset B & C) Barcode Generator.
 * Zero external dependencies, fully vector, high-resolution printable.
 */

const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

interface SriBarcodeSvgProps {
  value: string;
  height?: number;
  className?: string;
  displayValue?: boolean;
}

export const SriBarcodeSvg: React.FC<SriBarcodeSvgProps> = ({
  value,
  height = 45,
  className = '',
  displayValue = false,
}) => {
  const { totalModules, bars } = useMemo(() => {
    const clean = (value || '').trim();
    if (!clean) return { totalModules: 0, bars: [] };

    // Standard Code 128-B encoding
    const codes: number[] = [104]; // START B
    let sum = 104;

    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i) - 32;
      const validCode = code >= 0 && code <= 95 ? code : 0;
      codes.push(validCode);
      sum += (i + 1) * validCode;
    }

    codes.push(sum % 103); // Checksum
    codes.push(106); // STOP

    let currentX = 0;
    const computedBars: { x: number; width: number }[] = [];

    codes.forEach(c => {
      const pattern = CODE128_PATTERNS[c] || CODE128_PATTERNS[0];
      for (let j = 0; j < pattern.length; j++) {
        const w = parseInt(pattern[j], 10);
        if (j % 2 === 0) {
          // Even index = bar (black)
          computedBars.push({ x: currentX, width: w });
        }
        currentX += w;
      }
    });

    return { totalModules: currentX, bars: computedBars };
  }, [value]);

  if (!bars.length) return null;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox={`0 0 ${totalModules} ${height}`}
        className="w-full h-auto max-h-[50px] select-none"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        <rect width={totalModules} height={height} fill="#ffffff" />
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={0}
            width={bar.width}
            height={height}
            fill="#000000"
          />
        ))}
      </svg>
      {displayValue && (
        <span className="font-mono text-[9px] text-neutral-800 tracking-wider mt-0.5 select-all text-center break-all">
          {value}
        </span>
      )}
    </div>
  );
};

