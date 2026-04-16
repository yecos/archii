/**
 * TimeLapseScreen.tsx — Time-lapse video generator from project photos.
 * Creates videos from photo log entries showing construction progress.
 */
'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useFirestore, useUI, useGallery } from '@/hooks/useDomain';
import type { GalleryPhoto, PhotoLogEntry } from '@/lib/types';
import {
  Film, Play, Download, Calendar, Settings, Image, Clock,
  X, ChevronLeft, ChevronRight, Pause, CheckCircle, Loader2
} from 'lucide-react';

interface TimelinePhoto {
  id: string;
  url: string;
  date: string;
  label: string;
  type: 'gallery' | 'photolog';
}

export default function TimeLapseScreen() {
  const { projects } = useFirestore();
  const { galleryPhotos } = useGallery ? { galleryPhotos: (useGallery() as unknown as { galleryPhotos: GalleryPhoto[] }).galleryPhotos } : { galleryPhotos: [] };
  const { photoLogs } = useFirestore() as unknown as { photoLogs: PhotoLogEntry[] };
  const { showToast } = useUI();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [selectedProject, setSelectedProject] = useState('');
  const [fps, setFps] = useState(2);
  const [showDateOverlay, setShowDateOverlay] = useState(true);
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [resolution, setResolution] = useState('1280x720');
  const [photos, setPhotos] = useState<TimelinePhoto[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Gather photos from selected project
  const projectPhotos = useMemo(() => {
    if (!selectedProject) return [];
    const result: TimelinePhoto[] = [];

    // From gallery
    galleryPhotos
      .filter((p: GalleryPhoto) => p.data.projectId === selectedProject)
      .forEach((p: GalleryPhoto) => {
        result.push({
          id: p.id,
          url: p.data.imageData,
          date: p.data.createdAt ? (p.data.createdAt as unknown as { toDate: () => Date }).toDate?.().toISOString() || '' : '',
          label: p.data.caption || p.data.categoryName,
          type: 'gallery',
        });
      });

    // From photo log (beforePhoto and afterPhoto)
    photoLogs
      .filter((p: PhotoLogEntry) => p.data.projectId === selectedProject)
      .forEach((p: PhotoLogEntry) => {
        if (p.data.beforePhoto) {
          result.push({
            id: `${p.id}-before`,
            url: p.data.beforePhoto,
            date: p.data.date || '',
            label: `Antes: ${p.data.caption || p.data.space}`,
            type: 'photolog',
          });
        }
        if (p.data.afterPhoto) {
          result.push({
            id: `${p.id}-after`,
            url: p.data.afterPhoto,
            date: p.data.date || '',
            label: `Después: ${p.data.caption || p.data.space}`,
            type: 'photolog',
          });
        }
      });

    // Sort by date
    result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return result;
  }, [selectedProject, galleryPhotos, photoLogs]);

  const proj = projects.find((p: { id: string }) => p.id === selectedProject);
  const [width, height] = resolution.split('x').map(Number);
  const estimatedDuration = projectPhotos.length > 0 ? (projectPhotos.length / fps).toFixed(1) : '0';

  // Generate time-lapse
  const generateTimeLapse = useCallback(async () => {
    if (projectPhotos.length < 2) {
      showToast('Se necesitan al menos 2 fotos para generar el time-lapse', 'error');
      return;
    }

    setGenerating(true);
    setProgress(0);
    setVideoUrl(null);

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Setup MediaRecorder
      const stream = canvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000,
      });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const videoReady = new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
          resolve();
        };
      });

      mediaRecorder.start();

      // Render each frame
      const frameDuration = 1000 / fps;

      for (let i = 0; i < projectPhotos.length; i++) {
        const photo = projectPhotos[i];
        setCurrentFrame(i);
        setProgress(((i + 1) / projectPhotos.length) * 100);

        // Draw image on canvas
        await new Promise<void>((resolveDraw) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Fill background
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            // Calculate aspect ratio preserving dimensions
            const imgAspect = img.width / img.height;
            const canvasAspect = width / height;
            let drawWidth: number, drawHeight: number, drawX: number, drawY: number;

            if (imgAspect > canvasAspect) {
              drawWidth = width;
              drawHeight = width / imgAspect;
              drawX = 0;
              drawY = (height - drawHeight) / 2;
            } else {
              drawHeight = height;
              drawWidth = height * imgAspect;
              drawX = (width - drawWidth) / 2;
              drawY = 0;
            }

            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

            // Date overlay
            if (showDateOverlay && photo.date) {
              const dateStr = new Date(photo.date).toLocaleDateString('es-CO', {
                year: 'numeric', month: 'short', day: 'numeric',
              });
              ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
              ctx.fillRect(0, height - 40, width, 40);
              ctx.fillStyle = '#ffffff';
              ctx.font = '14px sans-serif';
              ctx.fillText(dateStr, 12, height - 15);
            }

            // Progress bar at bottom
            if (showProgressBar) {
              const barY = height - (showDateOverlay ? 44 : 4);
              const barHeight = 3;
              const progressPct = (i + 1) / projectPhotos.length;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
              ctx.fillRect(0, barY, width, barHeight);
              ctx.fillStyle = '#10b981';
              ctx.fillRect(0, barY, width * progressPct, barHeight);
            }

            // Wait frame duration
            setTimeout(resolveDraw, frameDuration);
          };
          img.onerror = () => {
            // Draw placeholder for failed images
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#666';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Image not available', width / 2, height / 2);
            ctx.textAlign = 'start';
            setTimeout(resolveDraw, frameDuration);
          };
          img.src = photo.url;
        });
      }

      // Hold last frame for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));

      mediaRecorder.stop();
      await videoReady;
      showToast('Time-lapse generado exitosamente');
    } catch (err) {
      console.error('[ArchiFlow] Time-lapse generation failed:', err);
      showToast('Error al generar el time-lapse', 'error');
    } finally {
      setGenerating(false);
      setCurrentFrame(0);
    }
  }, [projectPhotos, fps, showDateOverlay, showProgressBar, width, height, showToast]);

  const downloadVideo = useCallback(() => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `timelapse-${proj?.data?.name || 'project'}-${Date.now()}.webm`;
    a.click();
  }, [videoUrl, proj]);

  return (
    <div className="max-w-3xl mx-auto w-full animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[var(--af-accent)]/10 flex items-center justify-center">
            <Film size={18} className="stroke-[var(--af-accent)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Time-lapse Automático
          </h1>
        </div>
        <p className="text-[13px] text-[var(--muted-foreground)] ml-[42px]">
          Genera videos time-lapse desde las fotos del proyecto
        </p>
      </div>

      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Project selector */}
      <div className="card-elevated rounded-xl p-4 mb-4">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
          <Image size={15} /> Seleccionar Proyecto
        </h2>
        <select
          className="w-full text-[13px] skeuo-input px-3 py-2 cursor-pointer mb-3"
          value={selectedProject}
          onChange={e => { setSelectedProject(e.target.value); setVideoUrl(null); }}
        >
          <option value="">Seleccionar proyecto...</option>
          {projects.map((p: { id: string; data: { name: string } }) => (
            <option key={p.id} value={p.id}>{p.data.name}</option>
          ))}
        </select>

        {/* Project photo stats */}
        {selectedProject && (
          <div className="flex items-center gap-4 text-[12px] text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1"><Image size={12} /> {projectPhotos.length} fotos</span>
            {projectPhotos.length > 1 && (
              <span className="flex items-center gap-1"><Clock size={12} /> {projectPhotos[0].date ? new Date(projectPhotos[0].date).toLocaleDateString('es-CO') : '?'} — {projectPhotos[projectPhotos.length - 1].date ? new Date(projectPhotos[projectPhotos.length - 1].date).toLocaleDateString('es-CO') : '?'}</span>
            )}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="card-elevated rounded-xl p-4 mb-4">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
          <Settings size={15} /> Configuración
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* FPS */}
          <div>
            <label className="text-[12px] text-[var(--muted-foreground)] mb-1 block">
              Velocidad: {fps} FPS (duración: ~{estimatedDuration}s)
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={0.5}
              value={fps}
              onChange={e => setFps(Number(e.target.value))}
              className="w-full accent-[var(--af-accent)]"
            />
            <div className="flex justify-between text-[10px] text-[var(--af-text3)]">
              <span>Lento (1)</span><span>Rápido (5)</span>
            </div>
          </div>

          {/* Resolution */}
          <div>
            <label className="text-[12px] text-[var(--muted-foreground)] mb-1 block">Resolución</label>
            <div className="flex gap-1">
              {['1280x720', '1920x1080', '854x480'].map(res => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`flex-1 text-[11px] px-2 py-1.5 rounded-lg cursor-pointer border transition-all ${
                    resolution === res
                      ? 'bg-[var(--af-accent)] text-background border-[var(--af-accent)]'
                      : 'skeuo-btn text-[var(--muted-foreground)]'
                  }`}
                >
                  {res === '1280x720' ? '720p' : res === '1920x1080' ? '1080p' : '480p'}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-[12px] text-[var(--foreground)] cursor-pointer">
              <input type="checkbox" checked={showDateOverlay} onChange={e => setShowDateOverlay(e.target.checked)} className="w-4 h-4 rounded" />
              Mostrar fecha
            </label>
            <label className="flex items-center gap-2 text-[12px] text-[var(--foreground)] cursor-pointer">
              <input type="checkbox" checked={showProgressBar} onChange={e => setShowProgressBar(e.target.checked)} className="w-4 h-4 rounded" />
              Barra de progreso
            </label>
          </div>
        </div>
      </div>

      {/* Photo preview strip */}
      {projectPhotos.length > 0 && !videoUrl && (
        <div className="card-elevated rounded-xl p-4 mb-4">
          <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <Image size={15} /> Fotos seleccionadas ({projectPhotos.length})
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {projectPhotos.map((photo, i) => (
              <div key={photo.id} className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-transparent hover:border-[var(--af-accent)] transition-all">
                <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" crossOrigin="anonymous" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate button */}
      {projectPhotos.length >= 2 && !videoUrl && (
        <button
          onClick={generateTimeLapse}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl text-[15px] font-bold bg-gradient-to-r from-[var(--af-accent)] to-purple-500 text-background cursor-pointer border-none hover:opacity-90 transition-opacity disabled:opacity-50 mb-4"
        >
          {generating ? (
            <span><Loader2 size={20} className="animate-spin" /> Generando... {Math.round(progress)}%</span>
          ) : (
            <span><Film size={20} /> Generar Time-lapse ({estimatedDuration}s)</span>
          )}
        </button>
      )}

      {projectPhotos.length < 2 && selectedProject && (
        <div className="text-center py-8 text-[var(--af-text3)] text-[13px]">
          Se necesitan al menos 2 fotos para generar el time-lapse.
          Agrega fotos a la Galería o Bitácora Fotográfica del proyecto.
        </div>
      )}

      {/* Progress bar during generation */}
      {generating && (
        <div className="card-elevated rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-[var(--muted-foreground)]">
              Frame {currentFrame + 1} / {projectPhotos.length}
            </span>
            <span className="text-[12px] text-[var(--af-accent)] font-semibold">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[var(--af-bg4)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--af-accent)] to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Video player */}
      {videoUrl && (
        <div className="card-elevated rounded-xl overflow-hidden mb-4">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            loop
            className="w-full"
            playsInline
          />
          <div className="flex items-center gap-2 p-3">
            <CheckCircle size={16} className="text-emerald-400" />
            <span className="text-[13px] text-emerald-400 font-medium flex-1">
              Time-lapse generado ({projectPhotos.length} fotos, {estimatedDuration}s, {resolution})
            </span>
            <button
              onClick={downloadVideo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] bg-[var(--af-accent)] text-background font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
            >
              <Download size={13} /> Descargar
            </button>
            <button
              onClick={() => setVideoUrl(null)}
              className="px-3 py-1.5 rounded-lg text-[12px] skeuo-btn text-[var(--muted-foreground)] cursor-pointer"
            >
              Generar otro
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      {!selectedProject && (
        <div className="card-glass-subtle rounded-xl p-6 text-center">
          <Film size={48} className="mx-auto mb-3 text-[var(--af-text3)] opacity-30" />
          <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-2">¿Cómo funciona?</h3>
          <div className="text-[12px] text-[var(--muted-foreground)] space-y-1 text-left max-w-md mx-auto">
            <p>1. Selecciona un proyecto con fotos en la Galería o Bitácora Fotográfica</p>
            <p>2. Configura la velocidad (FPS), resolución y opciones de overlay</p>
            <p>3. Haz clic en &quot;Generar Time-lapse&quot; para crear el video</p>
            <p>4. Descarga el video en formato WebM para compartir</p>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-[var(--af-text3)]">
            <span>Formato: WebM</span>
            <span>Mínimo: 2 fotos</span>
            <span>Resolución: hasta 1080p</span>
          </div>
        </div>
      )}
    </div>
  );
}
