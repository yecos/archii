'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Navigation, Users, Clock, Shield, RefreshCw, LocateFixed,
  AlertTriangle, ChevronRight, Eye, EyeOff, Radio, History,
  Building2, User, ArrowDownUp, Crosshair, Wifi, WifiOff, Loader2,
} from 'lucide-react';
import { useGeolocationContext } from '@/contexts/GeolocationContext';
import { useFirestore } from '@/hooks/useDomain';
import { useAuth } from '@/hooks/useDomain';
import { useUI } from '@/hooks/useDomain';
import { formatDistance, calculateDistance, isWithinGeofence } from '@/lib/geolocation-service';
import type { LocationHistoryEntry } from '@/lib/geolocation-service';
import type { Project } from '@/lib/types';

type Tab = 'location' | 'team' | 'history' | 'settings';

export default function GeolocationScreen() {
  const {
    currentPosition,
    currentAddress,
    isTracking,
    locationError,
    permissionState,
    startTracking,
    stopTracking,
    requestPermission,
    refreshPosition,
    teamLocations,
    locationHistory,
    loadHistory,
    projectGeofences,
    geofenceAlerts,
    trackingEnabled,
    setTrackingEnabled,
  } = useGeolocationContext();

  const { projects } = useFirestore();
  const { authUser } = useAuth();
  const { showToast } = useUI();

  const [activeTab, setActiveTab] = useState<Tab>('location');
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load history when tab changes
  useEffect(() => {
    if (activeTab === 'history' && !historyLoaded) {
      loadHistory(50);
      setHistoryLoaded(true);
    }
  }, [activeTab, historyLoaded, loadHistory]);

  // Team members with distance from current position
  const teamWithDistance = useMemo(() => {
    if (!currentPosition) return teamLocations;
    return teamLocations
      .map(t => ({
        ...t,
        distance: calculateDistance(
          currentPosition.latitude, currentPosition.longitude,
          t.latitude, t.longitude
        ),
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [teamLocations, currentPosition]);

  // Projects with distance from current position
  const projectsWithDistance = useMemo(() => {
    if (!currentPosition) return [];
    return projects
      .filter(p => {
        // Only show projects that have coordinates in their geofences
        const fence = projectGeofences.find(f => f.id === p.id);
        return !!fence;
      })
      .map(p => {
        const fence = projectGeofences.find(f => f.id === p.id)!;
        const dist = calculateDistance(
          currentPosition.latitude, currentPosition.longitude,
          fence.latitude, fence.longitude
        );
        const inside = isWithinGeofence(
          currentPosition.latitude, currentPosition.longitude,
          fence.latitude, fence.longitude,
          fence.radiusMeters
        );
        return { project: p, distance: dist, inside, fence };
      })
      .sort((a, b) => a.distance - b.distance);
  }, [projects, currentPosition, projectGeofences]);

  const handleToggleTracking = async () => {
    if (!trackingEnabled) {
      await requestPermission();
      setTrackingEnabled(true);
      showToast('🗺️ Rastreo de ubicación activado');
    } else {
      setTrackingEnabled(false);
      stopTracking();
      showToast('Ubicación: rastreo desactivado');
    }
  };

  const formatTimestamp = (ts: number) => {
    if (!ts) return '—';
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--skeuo-text-primary)] flex items-center gap-2">
            <MapPin size={24} />
            Geolocalización GPS
          </h1>
          <p className="text-sm text-[var(--skeuo-text-secondary)] mt-1">
            Rastreo de ubicación y geofencing para sitios de proyecto
          </p>
        </div>
        <button
          onClick={refreshPosition}
          disabled={isTracking}
          className="w-10 h-10 rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] flex items-center justify-center cursor-pointer hover:bg-[var(--skeuo-sunken)] transition-colors disabled:opacity-40"
          title="Actualizar ubicación"
        >
          <RefreshCw size={18} className={`text-[var(--skeuo-text-secondary)] ${isTracking ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Current Location Card */}
      <CurrentLocationCard
        currentPosition={currentPosition}
        currentAddress={currentAddress}
        isTracking={isTracking}
        locationError={locationError}
        permissionState={permissionState}
        onEnable={requestPermission}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Users size={16} />}
          value={teamLocations.length}
          label="En línea"
          color="text-blue-500"
          bg="bg-blue-500/10"
        />
        <StatCard
          icon={<Building2 size={16} />}
          value={projectsWithDistance.filter(p => p.inside).length}
          label="En sitio"
          color="text-emerald-500"
          bg="bg-emerald-500/10"
        />
        <StatCard
          icon={<AlertTriangle size={16} />}
          value={geofenceAlerts.filter(a => Date.now() - a.timestamp < 86400000).length}
          label="Alertas hoy"
          color="text-amber-500"
          bg="bg-amber-500/10"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--skeuo-sunken)]">
        {([
          { id: 'location' as Tab, label: 'Ubicación', icon: <LocateFixed size={15} /> },
          { id: 'team' as Tab, label: 'Equipo', icon: <Users size={15} /> },
          { id: 'history' as Tab, label: 'Historial', icon: <History size={15} /> },
          { id: 'settings' as Tab, label: 'Ajustes', icon: <Shield size={15} /> },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer border-none ${
              activeTab === tab.id
                ? 'bg-[var(--skeuo-raised)] text-[var(--skeuo-text-primary)] shadow-sm'
                : 'text-[var(--skeuo-text-secondary)] hover:text-[var(--skeuo-text-primary)] bg-transparent'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'location' && (
        <LocationTab
          currentPosition={currentPosition}
          projectsWithDistance={projectsWithDistance}
          geofenceAlerts={geofenceAlerts}
          formatTimestamp={formatTimestamp}
          formatDistance={formatDistance}
        />
      )}

      {activeTab === 'team' && (
        <TeamTab
          teamWithDistance={teamWithDistance}
          hasPosition={!!currentPosition}
          formatTimestamp={formatTimestamp}
          formatDistance={formatDistance}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab
          locationHistory={locationHistory}
          formatTimestamp={formatTimestamp}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          trackingEnabled={trackingEnabled}
          isTracking={isTracking}
          permissionState={permissionState}
          onToggle={handleToggleTracking}
          authUser={authUser}
        />
      )}
    </div>
  );
}

/* ===== SUB-COMPONENTS ===== */

function CurrentLocationCard({
  currentPosition,
  currentAddress,
  isTracking,
  locationError,
  permissionState,
  onEnable,
}: {
  currentPosition: { latitude: number; longitude: number; accuracy: number } | null;
  currentAddress: string;
  isTracking: boolean;
  locationError: string | null;
  permissionState: string;
  onEnable: () => Promise<void>;
}) {
  if (permissionState === 'denied') {
    return (
      <div className="rounded-xl bg-[var(--skeuo-raised)] border border-red-500/20 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
            <WifiOff size={24} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--skeuo-text-primary)]">
              Permiso denegado
            </h2>
            <p className="text-xs text-[var(--skeuo-text-secondary)]">
              Activa la ubicación en la configuración del navegador
            </p>
          </div>
        </div>
        <p className="text-xs text-[var(--skeuo-text-secondary)] leading-relaxed">
          Para usar la geolocalización, ve a la configuración de tu navegador &gt; 
          Privacidad y seguridad &gt; Configuración del sitio &gt; Ubicación, y permite el acceso.
        </p>
      </div>
    );
  }

  if (locationError) {
    return (
      <div className="rounded-xl bg-[var(--skeuo-raised)] border border-amber-500/20 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle size={24} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--skeuo-text-primary)]">
              Sin ubicación
            </h2>
            <p className="text-xs text-[var(--skeuo-text-secondary)]">{locationError}</p>
          </div>
        </div>
        <button
          onClick={onEnable}
          className="w-full py-2.5 rounded-lg bg-[var(--af-accent)] text-background text-sm font-semibold cursor-pointer border-none hover:opacity-90 transition-opacity"
        >
          <Navigation size={16} className="inline mr-2" />
          Habilitar ubicación
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isTracking ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
            {isTracking ? (
              <Radio size={24} className="text-green-500" />
            ) : (
              <LocateFixed size={24} className="text-blue-500" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--skeuo-text-primary)]">
              {currentPosition ? 'Mi ubicación' : 'Obteniendo ubicación...'}
            </h2>
            <p className="text-xs text-[var(--skeuo-text-secondary)] truncate max-w-[200px] sm:max-w-[400px]">
              {currentAddress || (currentPosition ? 'Calculando dirección...' : 'Esperando GPS...')}
            </p>
          </div>
        </div>
        {isTracking && (
          <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Activo
          </span>
        )}
      </div>

      {currentPosition && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-[var(--skeuo-sunken)]">
            <div className="text-xs text-[var(--skeuo-text-secondary)] mb-1">Latitud</div>
            <div className="text-sm font-mono font-semibold text-[var(--skeuo-text-primary)]">
              {currentPosition.latitude.toFixed(6)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--skeuo-sunken)]">
            <div className="text-xs text-[var(--skeuo-text-secondary)] mb-1">Longitud</div>
            <div className="text-sm font-mono font-semibold text-[var(--skeuo-text-primary)]">
              {currentPosition.longitude.toFixed(6)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--skeuo-sunken)] col-span-2 sm:col-span-1">
            <div className="text-xs text-[var(--skeuo-text-secondary)] mb-1">Precisión</div>
            <div className="text-sm font-semibold text-[var(--skeuo-text-primary)]">
              ±{formatDistance(currentPosition.accuracy)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, color, bg }: {
  icon: React.ReactNode; value: number; label: string; color: string; bg: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-4 text-center">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mx-auto mb-2 ${color}`}>
        {icon}
      </div>
      <div className="text-xl font-bold text-[var(--skeuo-text-primary)]">{value}</div>
      <div className="text-xs text-[var(--skeuo-text-secondary)]">{label}</div>
    </div>
  );
}

function LocationTab({
  currentPosition,
  projectsWithDistance,
  geofenceAlerts,
  formatTimestamp,
  formatDistance,
}: {
  currentPosition: { latitude: number; longitude: number } | null;
  projectsWithDistance: { project: Project; distance: number; inside: boolean; fence: { radiusMeters: number } }[];
  geofenceAlerts: { fenceName: string; fenceId: string; type: 'enter' | 'exit'; timestamp: number }[];
  formatTimestamp: (ts: number) => string;
  formatDistance: (m: number) => string;
}) {
  const recentAlerts = geofenceAlerts.filter(a => Date.now() - a.timestamp < 86400000).slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Map placeholder */}
      <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] overflow-hidden">
        <div className="h-48 sm:h-64 bg-[var(--skeuo-sunken)] flex flex-col items-center justify-center gap-3 relative">
          {/* Grid pattern for map placeholder */}
          <div className="absolute inset-0 opacity-5">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {currentPosition ? (
            <>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-[var(--af-accent)]/20 flex items-center justify-center mb-2 animate-pulse-slow">
                  <div className="w-8 h-8 rounded-full bg-[var(--af-accent)] flex items-center justify-center shadow-lg">
                    <Crosshair size={18} className="text-white" />
                  </div>
                </div>
                <span className="text-sm font-medium text-[var(--skeuo-text-primary)]">
                  {currentPosition.latitude.toFixed(4)}, {currentPosition.longitude.toFixed(4)}
                </span>
              </div>

              {/* Team dots (decorative) */}
              {projectsWithDistance.slice(0, 3).map((p, i) => {
                const angle = (i * 120 - 90) * (Math.PI / 180);
                const x = 50 + Math.cos(angle) * (25 + i * 5);
                const y = 50 + Math.sin(angle) * (20 + i * 4);
                return (
                  <div
                    key={p.project.id}
                    className="absolute z-10 w-6 h-6 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center"
                    style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                    title={p.project.data.name}
                  >
                    <Building2 size={10} className="text-amber-500" />
                  </div>
                );
              })}
            </>
          ) : (
            <div className="relative z-10 text-center">
              <Navigation size={32} className="mx-auto text-[var(--skeuo-text-secondary)] mb-2" />
              <span className="text-sm text-[var(--skeuo-text-secondary)]">Esperando señal GPS...</span>
            </div>
          )}
        </div>
      </div>

      {/* Project Sites */}
      <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-4 space-y-3">
        <h3 className="font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
          <Building2 size={18} className="text-amber-500" />
          Sitios de proyecto
          <span className="text-xs font-normal text-[var(--skeuo-text-secondary)]">
            ({projectsWithDistance.length})
          </span>
        </h3>

        {projectsWithDistance.length === 0 ? (
          <div className="text-sm text-[var(--skeuo-text-secondary)] py-4 text-center">
            {currentPosition
              ? 'No hay proyectos con coordenadas configuradas.'
              : 'Activa tu ubicación para ver distancias.'}
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {projectsWithDistance.map(({ project, distance, inside, fence }) => (
              <div
                key={project.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  inside
                    ? 'bg-emerald-500/5 border border-emerald-500/20'
                    : 'bg-[var(--skeuo-sunken)]'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  inside ? 'bg-emerald-500/10' : 'bg-[var(--skeuo-raised)]'
                }`}>
                  <MapPin size={18} className={inside ? 'text-emerald-500' : 'text-[var(--skeuo-text-secondary)]'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--skeuo-text-primary)] truncate">
                    {project.data.name}
                  </div>
                  <div className="text-xs text-[var(--skeuo-text-secondary)]">
                    {inside ? (
                      <span className="text-emerald-500 font-medium">📍 En sitio</span>
                    ) : (
                      <span>{formatDistance(distance)} del sitio</span>
                    )}
                    <span className="mx-1.5">·</span>
                    <span>Radio {formatDistance(fence.radiusMeters)}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[var(--skeuo-text-secondary)] flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Geofence Alerts */}
      {recentAlerts.length > 0 && (
        <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-4 space-y-3">
          <h3 className="font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Alertas de geofence
            <span className="text-xs font-normal text-[var(--skeuo-text-secondary)]">
              (últimas 24h)
            </span>
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentAlerts.map((alert, i) => (
              <div
                key={`${alert.fenceId}-${alert.timestamp}-${i}`}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--skeuo-sunken)]"
              >
                <span className="text-sm">
                  {alert.type === 'enter' ? '🟢' : '🔴'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--skeuo-text-primary)]">
                    {alert.type === 'enter' ? 'Entraste a' : 'Saliste de'} {alert.fenceName}
                  </div>
                  <div className="text-xs text-[var(--skeuo-text-secondary)]">
                    {formatTimestamp(alert.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamTab({
  teamWithDistance,
  hasPosition,
  formatTimestamp,
  formatDistance,
}: {
  teamWithDistance: { uid: string; userName: string; userPhoto?: string; latitude: number; longitude: number; accuracy: number; address: string; timestamp: number; distance?: number }[];
  hasPosition: boolean;
  formatTimestamp: (ts: number) => string;
  formatDistance: (m: number) => string;
}) {
  return (
    <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-4 space-y-3">
      <h3 className="font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
        <Users size={18} className="text-blue-500" />
        Ubicación del equipo
        <span className="text-xs font-normal text-[var(--skeuo-text-secondary)]">
          ({teamWithDistance.length} activos)
        </span>
      </h3>

      {teamWithDistance.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Users size={40} className="mx-auto text-[var(--skeuo-text-secondary)] opacity-40" />
          <p className="text-sm text-[var(--skeuo-text-secondary)]">
            No hay miembros del equipo compartiendo su ubicación.
          </p>
          <p className="text-xs text-[var(--skeuo-text-secondary)] opacity-60">
            Los miembros deben activar el rastreo GPS en su perfil.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {teamWithDistance.map(member => {
            const isRecent = Date.now() - member.timestamp < 3600000; // Online in last hour
            return (
              <div
                key={member.uid}
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--skeuo-sunken)] hover:bg-[var(--skeuo-raised)] transition-colors"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {member.userPhoto ? (
                    <img
                      src={member.userPhoto}
                      alt={member.userName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--af-accent)]/10 flex items-center justify-center">
                      <User size={18} className="text-[var(--af-accent)]" />
                    </div>
                  )}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--skeuo-raised)] ${
                    isRecent ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--skeuo-text-primary)] truncate">
                    {member.userName}
                  </div>
                  <div className="text-xs text-[var(--skeuo-text-secondary)] truncate">
                    {member.address || `${member.latitude.toFixed(4)}, ${member.longitude.toFixed(4)}`}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  {hasPosition && member.distance !== undefined && (
                    <div className="text-sm font-semibold text-[var(--skeuo-text-primary)]">
                      {formatDistance(member.distance)}
                    </div>
                  )}
                  <div className="text-xs text-[var(--skeuo-text-secondary)]">
                    {formatTimestamp(member.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoryTab({
  locationHistory,
  formatTimestamp,
}: {
  locationHistory: LocationHistoryEntry[];
  formatTimestamp: (ts: number) => string;
}) {
  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: { date: string; entries: typeof locationHistory }[] = [];
    let currentDate = '';

    for (const entry of locationHistory) {
      const dateStr = new Date(entry.timestamp).toLocaleDateString('es', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ date: dateStr, entries: [entry] });
      } else {
        groups[groups.length - 1].entries.push(entry);
      }
    }
    return groups;
  }, [locationHistory]);

  return (
    <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-4 space-y-3">
      <h3 className="font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
        <History size={18} className="text-purple-500" />
        Historial de ubicación
        <span className="text-xs font-normal text-[var(--skeuo-text-secondary)]">
          ({locationHistory.length} registros)
        </span>
      </h3>

      {locationHistory.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Clock size={40} className="mx-auto text-[var(--skeuo-text-secondary)] opacity-40" />
          <p className="text-sm text-[var(--skeuo-text-secondary)]">
            Aún no hay registros de ubicación.
          </p>
          <p className="text-xs text-[var(--skeuo-text-secondary)] opacity-60">
            Activa el rastreo GPS para empezar a registrar tu historial.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {groupedByDate.map(group => (
            <div key={group.date}>
              <div className="text-xs font-semibold text-[var(--skeuo-text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-2">
                <div className="flex-1 h-px bg-[var(--skeuo-edge-light)]" />
                {group.date}
                <div className="flex-1 h-px bg-[var(--skeuo-edge-light)]" />
              </div>

              {/* Timeline */}
              <div className="space-y-1 relative">
                <div className="absolute left-[19px] top-3 bottom-3 w-px bg-[var(--skeuo-edge-light)]" />
                {group.entries.map((entry, i) => (
                  <div key={entry.id} className="flex items-start gap-3 relative">
                    <div className="w-10 h-10 rounded-lg bg-[var(--skeuo-sunken)] flex items-center justify-center flex-shrink-0 z-10 border border-[var(--skeuo-edge-light)]">
                      {i === 0 ? (
                        <MapPin size={16} className="text-[var(--af-accent)]" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--skeuo-text-secondary)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[var(--skeuo-text-secondary)] font-medium">
                          {new Date(entry.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs text-[var(--skeuo-text-secondary)]">
                          ±{formatDistance(entry.accuracy)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--skeuo-text-primary)] truncate">
                        {entry.address || `${entry.latitude.toFixed(5)}, ${entry.longitude.toFixed(5)}`}
                      </p>
                      {entry.speed !== null && entry.speed !== undefined && entry.speed > 0 && (
                        <span className="text-xs text-[var(--skeuo-text-secondary)]">
                          {Math.round(entry.speed * 3.6)} km/h
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({
  trackingEnabled,
  isTracking,
  permissionState,
  onToggle,
  authUser,
}: {
  trackingEnabled: boolean;
  isTracking: boolean;
  permissionState: string;
  onToggle: () => void;
  authUser: { uid: string; email: string | null; displayName: string | null } | null;
}) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await onToggle();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-5 space-y-4">
        <h3 className="font-semibold text-[var(--skeuo-text-primary)] flex items-center gap-2">
          <Shield size={18} className="text-[var(--af-accent)]" />
          Configuración de rastreo
        </h3>

        <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--skeuo-sunken)]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              trackingEnabled ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              {trackingEnabled ? (
                <Eye size={20} className="text-green-500" />
              ) : (
                <EyeOff size={20} className="text-red-500" />
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--skeuo-text-primary)]">
                Rastreo GPS
              </div>
              <div className="text-xs text-[var(--skeuo-text-secondary)]">
                {trackingEnabled
                  ? 'Tu ubicación se registra cada 5 minutos'
                  : 'Rastreo de ubicación desactivado'}
              </div>
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`relative w-12 h-7 rounded-full transition-colors duration-300 cursor-pointer border-none ${
              trackingEnabled ? 'bg-green-500' : 'bg-gray-400'
            } ${loading ? 'opacity-50' : ''}`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                trackingEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Status info */}
        <div className="grid grid-cols-2 gap-3">
          <StatusPill
            icon={<Navigation size={14} />}
            label="Estado"
            value={isTracking ? 'Activo' : 'Inactivo'}
            active={isTracking}
          />
          <StatusPill
            icon={<Shield size={14} />}
            label="Permiso"
            value={
              permissionState === 'granted' ? 'Concedido' :
              permissionState === 'denied' ? 'Denegado' : 'Pendiente'
            }
            active={permissionState === 'granted'}
          />
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] p-5 space-y-3">
        <h3 className="font-semibold text-[var(--skeuo-text-primary)]">
          ¿Cómo funciona?
        </h3>
        <div className="space-y-3">
          <InfoStep
            step="1"
            title="GPS en tiempo real"
            description="Usa el GPS de tu dispositivo para obtener la ubicación exacta con alta precisión."
          />
          <InfoStep
            step="2"
            title="Historial privado"
            description="Tu ubicación se registra en tu perfil cada 5 minutos. Solo los administradores del equipo pueden verla."
          />
          <InfoStep
            step="3"
            title="Geofencing"
            description="Recibirás alertas automáticas cuando entres o salgas del radio de un sitio de proyecto (500m por defecto)."
          />
          <InfoStep
            step="4"
            title="Privacidad"
            description="Puedes desactivar el rastreo en cualquier momento. Tu historial se mantiene privado y cifrado."
          />
        </div>
      </div>

      {/* Data info */}
      <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-4">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[var(--skeuo-text-secondary)] leading-relaxed space-y-1">
            <p>
              <strong className="text-blue-500">Datos almacenados:</strong> Latitud, longitud, precisión, dirección 
              y hora. No almacenamos datos de velocidad o altitud por defecto.
            </p>
            <p>
              <strong className="text-blue-500">Retención:</strong> Los datos de ubicación se conservan indefinidamente 
              en tu cuenta. Puedes solicitar su eliminación al administrador.
            </p>
            <p>
              <strong className="text-blue-500">Geocodificación:</strong> Usamos OpenStreetMap Nominatim para 
              convertir coordenadas a direcciones (gratuito, sin API key).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ icon, label, value, active }: {
  icon: React.ReactNode; label: string; value: string; active: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--skeuo-raised)]">
      <span className={active ? 'text-green-500' : 'text-[var(--skeuo-text-secondary)]'}>
        {icon}
      </span>
      <div>
        <div className="text-xs text-[var(--skeuo-text-secondary)]">{label}</div>
        <div className={`text-xs font-semibold ${active ? 'text-green-500' : 'text-[var(--skeuo-text-primary)]'}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function InfoStep({ step, title, description }: {
  step: string; title: string; description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-[var(--af-accent)]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[var(--af-accent)]">
        {step}
      </div>
      <div>
        <div className="text-sm font-medium text-[var(--skeuo-text-primary)]">{title}</div>
        <div className="text-xs text-[var(--skeuo-text-secondary)] leading-relaxed">{description}</div>
      </div>
    </div>
  );
}
