'use client';
import { confirm } from '@/hooks/useConfirmDialog';
import { useUI } from '@/hooks/useDomain';
import { Check, Download, Info, RefreshCw, Trash2 } from 'lucide-react';

export default function InstallScreen() {
  const ui = useUI();
  const {
    handleInstall, installPrompt, isStandalone, platform, setIsInstalled,
    setShowInstallBanner, showToast,
  } = ui;

  return (
<div className="animate-fadeIn space-y-5">
            {/* Status Banner */}
            {isStandalone ? (
              <div className="card-elevated rounded-xl p-4 flex items-center gap-3 border-emerald-500/20">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 stroke-emerald-400" strokeWidth={2} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-emerald-400">App instalada correctamente</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">ArchiFlow se está ejecutando como aplicación instalada. Puedes cerrar esta guía.</div>
                </div>
              </div>
            ) : installPrompt ? (
              <div className="card-elevated rounded-xl p-4 flex items-center gap-3 border-[var(--af-accent)]/20">
                <div className="w-10 h-10 bg-[var(--af-accent)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5 stroke-[var(--af-accent)]" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">Listo para instalar</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">Tu navegador soporta la instalación directa</div>
                </div>
                <button className="skeuo-btn px-4 py-2 bg-[var(--af-accent)] text-background text-[13px] font-semibold cursor-pointer" onClick={handleInstall}>
                  Instalar ahora
                </button>
              </div>
            ) : (
              <div className="card-elevated rounded-xl p-4 flex items-center gap-3 border-[var(--af-accent)]/20">
                <div className="w-10 h-10 bg-[var(--af-accent)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 stroke-[var(--af-accent)]" strokeWidth={2} />
                </div>
                <div>
                  <div className="text-sm font-semibold">Instalación manual</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">Sigue las instrucciones de abajo según tu dispositivo</div>
                </div>
              </div>
            )}

            {/* Quick Install Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card-elevated rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 skeuo-well rounded-lg flex items-center justify-center">
                    <span className="text-xl">📱</span>
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold">En tu teléfono</div>
                    <div className="text-[11px] text-[var(--muted-foreground)]">Acceso rápido como app nativa</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${platform === 'android' ? 'bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20' : 'skeuo-well'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">🤖</span>
                      <span className="text-[13px] font-semibold">Android (Chrome)</span>
                      {platform === 'android' && <span className="skeuo-badge text-[10px] bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/20 px-1.5 py-0.5">Tu dispositivo</span>}
                    </div>
                    <ol className="text-[12px] text-[var(--muted-foreground)] space-y-1 pl-4 list-decimal">
                      <li>Abre ArchiFlow en Chrome</li>
                      <li>Toca el menú (⋮) arriba a la derecha</li>
                      <li>Selecciona <strong>"Instalar app"</strong> o <strong>"Agregar a pantalla de inicio"</strong></li>
                      <li>Confirma tocando <strong>"Instalar"</strong></li>
                    </ol>
                  </div>
                  <div className={`p-3 rounded-lg ${platform === 'ios' ? 'bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20' : 'skeuo-well'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">🍎</span>
                      <span className="text-[13px] font-semibold">iPhone / iPad (Safari)</span>
                      {platform === 'ios' && <span className="skeuo-badge text-[10px] bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/20 px-1.5 py-0.5">Tu dispositivo</span>}
                    </div>
                    <ol className="text-[12px] text-[var(--muted-foreground)] space-y-1 pl-4 list-decimal">
                      <li>Abre ArchiFlow en <strong>Safari</strong> (no funciona en Chrome)</li>
                      <li>Toca el botón <strong>Compartir</strong> (cuadro con flecha ↑)</li>
                      <li>Desliza y selecciona <strong>"Agregar a pantalla de inicio"</strong></li>
                      <li>Toca <strong>"Agregar"</strong> en la esquina superior derecha</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="card-elevated rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 skeuo-well rounded-lg flex items-center justify-center">
                    <span className="text-xl">💻</span>
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold">En tu computador</div>
                    <div className="text-[11px] text-[var(--muted-foreground)]">Widget de escritorio / App independiente</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${platform === 'windows' ? 'bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20' : 'skeuo-well'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">🪟</span>
                      <span className="text-[13px] font-semibold">Windows (Chrome / Edge)</span>
                      {platform === 'windows' && <span className="skeuo-badge text-[10px] bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/20 px-1.5 py-0.5">Tu equipo</span>}
                    </div>
                    <ol className="text-[12px] text-[var(--muted-foreground)] space-y-1 pl-4 list-decimal">
                      <li>Abre ArchiFlow en Chrome o Edge</li>
                      <li>Haz clic en el <strong>ícono de instalar</strong> en la barra de direcciones ( junto al candado), o menú ⋮ → <strong>"Instalar ArchiFlow"</strong></li>
                      <li>Confirma la instalación</li>
                      <li>Se crea un acceso directo en escritorio y menú inicio</li>
                    </ol>
                  </div>
                  <div className={`p-3 rounded-lg ${platform === 'mac' ? 'bg-[var(--af-accent)]/10 border border-[var(--af-accent)]/20' : 'skeuo-well'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">🍏</span>
                      <span className="text-[13px] font-semibold">Mac (Chrome / Safari)</span>
                      {platform === 'mac' && <span className="skeuo-badge text-[10px] bg-[var(--af-accent)]/10 text-[var(--af-accent)] border-[var(--af-accent)]/20 px-1.5 py-0.5">Tu equipo</span>}
                    </div>
                    <ol className="text-[12px] text-[var(--muted-foreground)] space-y-1 pl-4 list-decimal">
                      <li><strong>Chrome:</strong> Menú ⋮ → <strong>"Instalar ArchiFlow"</strong> → Crear acceso directo</li>
                      <li><strong>Safari:</strong> Archivo → <strong>"Agregar al Dock"</strong></li>
                      <li>Se abre como ventana independiente sin barra de navegación</li>
                      <li>Funciona offline para datos en caché</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="card-elevated rounded-xl p-5">
              <div className="text-[14px] font-semibold mb-4">¿Qué obtienes al instalar?</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: '⚡', title: 'Acceso rápido', desc: 'Icono en pantalla de inicio o escritorio' },
                  { icon: '📱', title: 'App nativa', desc: 'Sin barra de navegador, pantalla completa' },
                  { icon: '📴', title: 'Funciona offline', desc: 'Accede a tus datos sin conexión a internet' },
                  { icon: '🔔', title: 'Notificaciones', desc: 'Recibe alertas de tareas y mensajes nuevos' },
                ].map((f, i) => (
                  <div key={i} className="skeuo-well rounded-lg p-3 text-center">
                    <div className="text-2xl mb-2">{f.icon}</div>
                    <div className="text-[12px] font-semibold mb-0.5">{f.title}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] leading-tight">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual clear cache */}
            <div className="card-elevated rounded-xl p-5">
              <div className="text-[14px] font-semibold mb-3">Herramientas de instalación</div>
              <div className="flex flex-wrap gap-2">
                <button className="skeuo-btn px-4 py-2 text-[13px] text-[var(--foreground)] cursor-pointer flex items-center gap-2" onClick={() => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistration().then(reg => {
                      if (reg) reg.update();
                      showToast('Service Worker actualizado');
                    });
                  }
                }}>
                  <RefreshCw className="w-4 h-4" />
                  Actualizar cache
                </button>
                <button className="skeuo-btn px-4 py-2 text-[13px] text-[var(--foreground)] cursor-pointer flex items-center gap-2" onClick={() => {
                  localStorage.removeItem('archiflow-install-dismissed');
                  localStorage.removeItem('archiflow-installed');
                  setIsInstalled(false);
                  setShowInstallBanner(true);
                  showToast('Recordatorio de instalación restablecido');
                }}>
                  <Download className="w-4 h-4" />
                  Mostrar prompt
                </button>
                <button className="skeuo-btn px-4 py-2 text-[13px] text-red-400 bg-red-500/10 border-red-500/20 cursor-pointer flex items-center gap-2" onClick={async () => {
                  if (await confirm({ title: 'Borrar caché', description: '¿Borrar todo el caché offline? Esto recargará la app completamente.' })) {
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' });
                    }
                    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
                    showToast('Caché borrado, recargando...');
                    setTimeout(() => window.location.reload(), 1000);
                  }
                }}>
                  <Trash2 className="w-4 h-4" />
                  Borrar caché
                </button>
              </div>
            </div>
          </div>
  );
}
