import React, { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  sublabel?: string;
  value?: string;
  onChange: (dataUrl: string) => void;
}

/** Recuadro para firmar con el dedo, lápiz o mouse. Devuelve la firma como PNG (base64). */
export const SignaturePad: React.FC<SignaturePadProps> = ({ label, sublabel, value, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(Boolean(value));

  // Ajusta la resolución del lienzo al tamaño real (pantallas retina) y repinta la firma guardada
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111111';
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext('2d')!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (canvasRef.current) onChange(canvasRef.current.toDataURL('image/png'));
  };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
    onChange('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-white">{label}</div>
          {sublabel && <div className="text-[10px] text-neutral-400">{sublabel}</div>}
        </div>
        <button type="button" onClick={clear} className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer">
          <Eraser className="w-3.5 h-3.5" />
          Borrar
        </button>
      </div>
      <div className={`relative rounded-xl border-2 ${hasInk ? 'border-emerald-500/60' : 'border-dashed border-[#3A3A48]'} bg-white`}>
        <canvas
          ref={canvasRef}
          className="w-full h-36 touch-none cursor-crosshair rounded-xl"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          aria-label={`Firma: ${label}`}
        />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-neutral-400 text-xs">
            Firme aquí con el dedo o el mouse
          </span>
        )}
        <div className="pointer-events-none absolute left-6 right-6 bottom-6 border-b border-neutral-300" />
      </div>
    </div>
  );
};
