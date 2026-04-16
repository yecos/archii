'use client';
import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { Eraser, RotateCcw, PenLine } from 'lucide-react';

export interface SignatureCanvasRef {
  toDataURL: (type?: string, quality?: number) => string | null;
  isEmpty: () => boolean;
  clear: () => void;
}

interface Point {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

interface Props {
  width?: number;
  height?: number;
  penColor?: string;
  penWidth?: number;
  backgroundColor?: string;
  placeholder?: string;
  showControls?: boolean;
  className?: string;
  onChange?: (isEmpty: boolean) => void;
}

const SignatureCanvas = forwardRef<SignatureCanvasRef, Props>(({
  width = 500,
  height = 200,
  penColor = '#1a1a2e',
  penWidth = 2.5,
  backgroundColor = 'transparent',
  placeholder = 'Firma aqui',
  showControls = true,
  className = '',
  onChange,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const pathsRef = useRef<Point[][]>([]);

  const [canvasSize, setCanvasSize] = useState({ w: width, h: height });
  const [isEmpty, setIsEmpty] = useState(true);
  const [currentColor, setCurrentColor] = useState(penColor);
  const [currentWidth, setCurrentWidth] = useState(penWidth);
  const [penSizes] = useState([
    { label: 'Fina', value: 1.5 },
    { label: 'Media', value: 2.5 },
    { label: 'Gruesa', value: 4 },
  ]);
  const [penColors] = useState([
    { label: 'Negro', value: '#1a1a2e' },
    { label: 'Azul', value: '#1e40af' },
    { label: 'Rojo', value: '#b91c1c' },
  ]);

  // Responsive resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        const newW = Math.floor(w);
        const newH = Math.floor(height * (w / width));
        setCanvasSize({ w: newW, h: newH });
        // Redraw existing paths after resize
        setTimeout(() => redrawAll(), 0);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    canvas.style.width = `${canvasSize.w}px`;
    canvas.style.height = `${canvasSize.h}px`;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentWidth;
  }, [canvasSize.w, canvasSize.h, currentColor, currentWidth]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent | PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5, time: Date.now() };
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number, pressure = 0.5;

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
      pressure = (touch as Touch).force || 0.5;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
      pressure = (e as PointerEvent).pressure || 0.5;
    }

    return {
      x: (clientX - rect.left) * (canvasSize.w / rect.width),
      y: (clientY - rect.top) * (canvasSize.h / rect.height),
      pressure,
      time: Date.now(),
    };
  }, [canvasSize.w, canvasSize.h]);

  // Draw smooth Bezier curve between points
  const drawSmooth = useCallback((points: Point[], color: string, lineWidth: number) => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      // Last segment
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();
    ctx.restore();
  }, []);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all saved paths
    for (const path of pathsRef.current) {
      drawSmooth(path, currentColor, currentWidth);
    }
  }, [drawSmooth, currentColor, currentWidth]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pos = getPos(e);
    lastPointRef.current = pos;
    pointsRef.current = [pos];
    setIsEmpty(false);
    onChange?.(false);
  }, [getPos, onChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const last = lastPointRef.current;
    if (!last) return;

    // Dynamic width based on speed
    const dx = pos.x - last.x;
    const dy = pos.y - last.y;
    const dt = Math.max(1, pos.time - last.time);
    const speed = Math.sqrt(dx * dx + dy * dy) / dt;
    const dynamicWidth = Math.max(currentWidth * 0.4, Math.min(currentWidth * 1.8, currentWidth / (speed * 0.5 + 0.5)));

    pointsRef.current.push(pos);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = dynamicWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = pos;
  }, [getPos, currentColor, currentWidth]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (pointsRef.current.length > 1) {
      pathsRef.current.push([...pointsRef.current]);
    }
    pointsRef.current = [];
    lastPointRef.current = null;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    pathsRef.current = [];
    pointsRef.current = [];
    lastPointRef.current = null;
    setIsEmpty(true);
    onChange?.(true);
  }, [onChange]);

  const undo = useCallback(() => {
    if (pathsRef.current.length === 0) return;
    pathsRef.current.pop();
    redrawAll();
    setIsEmpty(pathsRef.current.length === 0);
    onChange?.(pathsRef.current.length === 0);
  }, [redrawAll, onChange]);

  const toDataURL = useCallback((type = 'image/png', quality = 0.92): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return null;
    return canvas.toDataURL(type, quality);
  }, [isEmpty]);

  const checkEmpty = useCallback((): boolean => {
    return isEmpty;
  }, [isEmpty]);

  useImperativeHandle(ref, () => ({
    toDataURL,
    isEmpty: checkEmpty,
    clear,
  }), [toDataURL, checkEmpty, clear]);

  return (
    <div className={`space-y-2 ${className}`}>
      {showControls && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Color picker */}
          <div className="flex items-center gap-1">
            <PenLine size={13} className="text-[var(--muted-foreground)]" />
            {penColors.map(c => (
              <button
                key={c.value}
                className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-all ${
                  currentColor === c.value ? 'border-[var(--af-accent)] scale-110 ring-2 ring-[var(--af-accent)]/20' : 'border-[var(--border)]'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.label}
                onClick={() => setCurrentColor(c.value)}
              />
            ))}
          </div>

          {/* Size picker */}
          <div className="flex items-center gap-1 ml-2">
            {penSizes.map(s => (
              <button
                key={s.value}
                className={`px-2 py-1 rounded-md text-[10px] cursor-pointer transition-all ${
                  currentWidth === s.value
                    ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] border border-[var(--af-accent)]/30 font-medium'
                    : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)] border border-transparent hover:border-[var(--border)]'
                }`}
                onClick={() => setCurrentWidth(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Undo */}
          <button
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[var(--muted-foreground)] cursor-pointer hover:bg-[var(--af-bg4)] hover:text-[var(--foreground)] transition-colors"
            onClick={undo}
            title="Deshacer ultimo trazo"
          >
            <RotateCcw size={12} /> Deshacer
          </button>

          {/* Clear */}
          <button
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-red-400 cursor-pointer hover:bg-red-500/10 transition-colors"
            onClick={clear}
            title="Borrar todo"
          >
            <Eraser size={12} /> Borrar
          </button>
        </div>
      )}

      {/* Canvas container */}
      <div
        ref={containerRef}
        className={`relative rounded-xl overflow-hidden border-2 transition-colors ${
          isDrawingRef.current
            ? 'border-[var(--af-accent)]/50 bg-white'
            : isEmpty
              ? 'border-dashed border-[var(--border)] bg-white'
              : 'border-solid border-[var(--af-accent)]/30 bg-white'
        }`}
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full cursor-crosshair"
          style={{ height: canvasSize.h }}
        />
        {/* Placeholder */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[14px] text-gray-300 italic select-none">
              {placeholder}
            </span>
          </div>
        )}
        {/* Signature line */}
        <div className="absolute bottom-6 left-6 right-6 border-t border-gray-200 pointer-events-none" />
      </div>
    </div>
  );
});

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;
