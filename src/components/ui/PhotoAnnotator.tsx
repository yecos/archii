'use client';
import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Type, ArrowRight, Square, Circle, Pencil, Minus,
  Undo2, Trash2, Download, Move, Palette, ChevronDown,
} from 'lucide-react';

export type AnnotationTool = 'select' | 'pen' | 'arrow' | 'rect' | 'circle' | 'text' | 'line';

interface Annotation {
  id: string;
  type: AnnotationTool;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  text?: string;
  fontSize?: number;
  completed: boolean;
}

interface Props {
  src: string;
  width?: number;
  height?: number;
  annotations?: Annotation[];
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  readOnly?: boolean;
  showToolbar?: boolean;
  className?: string;
}

export interface PhotoAnnotatorRef {
  getAnnotations: () => Annotation[];
  clearAnnotations: () => void;
  exportAnnotated: () => string | null;
  undo: () => void;
}

const TOOL_CONFIG: { id: AnnotationTool; icon: React.ReactNode; label: string }[] = [
  { id: 'select', icon: <Move size={15} />, label: 'Mover' },
  { id: 'pen', icon: <Pencil size={15} />, label: 'Lápiz' },
  { id: 'arrow', icon: <ArrowRight size={15} />, label: 'Flecha' },
  { id: 'rect', icon: <Square size={15} />, label: 'Rectángulo' },
  { id: 'circle', icon: <Circle size={15} />, label: 'Círculo' },
  { id: 'line', icon: <Minus size={15} />, label: 'Línea' },
  { id: 'text', icon: <Type size={15} />, label: 'Texto' },
];

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ffffff', '#000000'];

const PhotoAnnotator = forwardRef<PhotoAnnotatorRef, Props>(({
  src,
  width = 600,
  height = 400,
  annotations: externalAnnotations,
  onAnnotationsChange,
  readOnly = false,
  showToolbar = true,
  className = '',
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<AnnotationTool>('pen');
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [annotations, setAnnotations] = useState<Annotation[]>(externalAnnotations || []);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: width, h: height });
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImgLoaded(true);
      redraw();
    };
    img.src = src;
  }, [src]);

  // Responsive resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w } = entry.contentRect;
        if (w < 50) return;
        const img = imageRef.current;
        const aspect = img ? (img.naturalHeight / img.naturalWidth) : (height / width);
        const newW = Math.floor(w);
        const newH = Math.floor(w * aspect);
        setCanvasSize({ w: newW, h: newH });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [imgLoaded, width, height]);

  // Sync external annotations
  useEffect(() => {
    if (externalAnnotations) setAnnotations(externalAnnotations);
  }, [externalAnnotations]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    canvas.style.width = `${canvasSize.w}px`;
    canvas.style.height = `${canvasSize.h}px`;
    redraw();
  }, [canvasSize, annotations, currentAnnotation]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

    // Draw image
    if (img) {
      ctx.drawImage(img, 0, 0, canvasSize.w, canvasSize.h);
    }

    // Draw all annotations
    const all = [...annotations, ...(currentAnnotation ? [currentAnnotation] : [])];
    for (const ann of all) {
      if (ann.points.length < 1) continue;
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = ann.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (ann.type) {
        case 'pen':
          if (ann.points.length < 2) break;
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.points[i].x, ann.points[i].y);
          }
          ctx.stroke();
          break;

        case 'line':
          if (ann.points.length < 2) break;
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          ctx.lineTo(ann.points[ann.points.length - 1].x, ann.points[ann.points.length - 1].y);
          ctx.stroke();
          break;

        case 'arrow': {
          if (ann.points.length < 2) break;
          const from = ann.points[0];
          const to = ann.points[ann.points.length - 1];
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          // Arrowhead
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const headLen = 12 + ann.width * 2;
          ctx.beginPath();
          ctx.moveTo(to.x, to.y);
          ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
          break;
        }

        case 'rect': {
          if (ann.points.length < 2) break;
          const r = ann.points[0];
          const b = ann.points[ann.points.length - 1];
          ctx.strokeRect(r.x, r.y, b.x - r.x, b.y - r.y);
          break;
        }

        case 'circle': {
          if (ann.points.length < 2) break;
          const c = ann.points[0];
          const e = ann.points[ann.points.length - 1];
          const rx = Math.abs(e.x - c.x) / 2;
          const ry = Math.abs(e.y - c.y) / 2;
          const cx = (c.x + e.x) / 2;
          const cy = (c.y + e.y) / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        case 'text':
          if (ann.text && ann.points.length > 0) {
            const fontSize = ann.fontSize || 14;
            ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 3;
            ctx.strokeText(ann.text, ann.points[0].x, ann.points[0].y);
            ctx.fillText(ann.text, ann.points[0].x, ann.points[0].y);
          }
          break;
      }
    }
  }, [annotations, currentAnnotation, canvasSize]);

  const getPos = useCallback((e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvasSize.w / rect.width),
      y: (e.clientY - rect.top) * (canvasSize.h / rect.height),
    };
  }, [canvasSize]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (readOnly) return;
    const pos = getPos(e);
    if (tool === 'text') {
      setTextInput(pos);
      return;
    }
    setIsDrawing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const ann: Annotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: tool,
      points: [pos],
      color,
      width: lineWidth,
      completed: false,
    };
    setCurrentAnnotation(ann);
  }, [readOnly, tool, getPos, color, lineWidth]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !currentAnnotation) return;
    const pos = getPos(e);
    setCurrentAnnotation(prev => {
      if (!prev) return null;
      const pts = prev.type === 'pen' ? [...prev.points, pos] : [prev.points[0], pos];
      return { ...prev, points: pts };
    });
  }, [isDrawing, currentAnnotation, getPos]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing || !currentAnnotation) return;
    setIsDrawing(false);
    const completed = { ...currentAnnotation, completed: true };
    setCurrentAnnotation(null);
    setAnnotations(prev => [...prev, completed]);
    onAnnotationsChange?.([...annotations, completed]);
  }, [isDrawing, currentAnnotation, annotations, onAnnotationsChange]);

  const handleTextSubmit = useCallback(() => {
    if (!textValue.trim() || !textInput) return;
    const ann: Annotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: 'text',
      points: [textInput],
      color,
      width: lineWidth,
      text: textValue.trim(),
      fontSize: 14 + lineWidth * 2,
      completed: true,
    };
    setAnnotations(prev => [...prev, ann]);
    onAnnotationsChange?.([...annotations, ann]);
    setTextInput(null);
    setTextValue('');
  }, [textValue, textInput, color, lineWidth, annotations, onAnnotationsChange]);

  const undo = useCallback(() => {
    setAnnotations(prev => {
      const next = prev.slice(0, -1);
      onAnnotationsChange?.(next);
      return next;
    });
  }, [onAnnotationsChange]);

  const clearAll = useCallback(() => {
    setAnnotations([]);
    onAnnotationsChange?.([]);
  }, [onAnnotationsChange]);

  const exportAnnotated = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !imgLoaded) return null;
    return canvas.toDataURL('image/png', 0.95);
  }, [imgLoaded]);

  useImperativeHandle(ref, () => ({
    getAnnotations: () => annotations,
    clearAnnotations: () => { setAnnotations([]); onAnnotationsChange?.([]); },
    exportAnnotated,
    undo,
  }), [annotations, exportAnnotated, undo, onAnnotationsChange]);

  const activeToolConfig = TOOL_CONFIG.find(t => t.id === tool);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Toolbar */}
      {showToolbar && !readOnly && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Tools */}
          <div className="flex gap-0.5 bg-[var(--af-bg3)] rounded-lg p-0.5">
            {TOOL_CONFIG.map(t => (
              <button
                key={t.id}
                className={`flex items-center justify-center w-8 h-8 rounded-md cursor-pointer transition-all ${
                  tool === t.id
                    ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--af-bg4)]'
                }`}
                onClick={() => setTool(t.id)}
                title={t.label}
              >
                {t.icon}
              </button>
            ))}
          </div>

          {/* Colors */}
          <div className="flex items-center gap-0.5">
            <Palette size={13} className="text-[var(--muted-foreground)] mr-0.5" />
            {COLORS.map(c => (
              <button
                key={c}
                className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all ${
                  color === c ? 'border-[var(--af-accent)] scale-110' : 'border-[var(--border)]'
                }`}
                style={{ backgroundColor: c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : undefined }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          {/* Line width */}
          <div className="flex items-center gap-1 ml-1">
            <select
              className="text-[11px] bg-[var(--af-bg4)] border border-[var(--border)] rounded-md px-1.5 py-1 text-[var(--foreground)] outline-none cursor-pointer"
              value={lineWidth}
              onChange={e => setLineWidth(Number(e.target.value))}
            >
              <option value={1}>1px</option>
              <option value={2}>2px</option>
              <option value={3}>3px</option>
              <option value={5}>5px</option>
            </select>
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <button className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--af-bg4)] hover:text-[var(--foreground)] cursor-pointer transition-colors" onClick={undo} title="Deshacer">
            <Undo2 size={14} />
          </button>
          <button className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors" onClick={clearAll} title="Borrar todo">
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Active tool label */}
      {showToolbar && !readOnly && (
        <div className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
          {activeToolConfig?.icon}
          <span>{activeToolConfig?.label}</span>
          {tool === 'text' && <span className="text-[var(--af-accent)]">— Haz clic donde quieras escribir</span>}
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-black/5"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ height: canvasSize.h }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {textInput && (
          <div
            className="absolute z-10"
            style={{ left: textInput.x, top: textInput.y }}
          >
            <input
              className="bg-white/90 backdrop-blur-sm border border-[var(--af-accent)]/50 rounded px-2 py-1 text-sm text-[var(--foreground)] outline-none min-w-[120px]"
              placeholder="Escribe..."
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleTextSubmit();
                if (e.key === 'Escape') setTextInput(null);
              }}
              autoFocus
              onBlur={handleTextSubmit}
            />
          </div>
        )}
      </div>

      {/* Export button */}
      {!readOnly && annotations.length > 0 && (
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--af-bg4)] text-[12px] text-[var(--muted-foreground)] cursor-pointer hover:bg-[var(--af-bg3)] hover:text-[var(--foreground)] transition-colors self-start"
          onClick={() => {
            const url = exportAnnotated();
            if (url) {
              const a = document.createElement('a');
              a.href = url;
              a.download = `anotacion-${Date.now()}.png`;
              a.click();
            }
          }}
        >
          <Download size={13} /> Exportar imagen anotada
        </button>
      )}
    </div>
  );
});

PhotoAnnotator.displayName = 'PhotoAnnotator';

export default PhotoAnnotator;
