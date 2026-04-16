'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CloudSun, CloudOff, Thermometer, Wind } from 'lucide-react';
import { fetchWeatherForCity, mapWeatherToFormOption, type WeatherData } from '@/lib/weather-service';

interface WeatherAutoFillProps {
  /** Project location string (city name) */
  location: string;
  /** Callback when weather is auto-filled */
  onWeatherFilled: (weather: string, temperature: number) => void;
  /** Whether to auto-fetch on mount when location is available */
  autoFetch?: boolean;
  /** Optional className for the container */
  className?: string;
}

export default function WeatherAutoFill({
  location,
  onWeatherFilled,
  autoFetch = true,
  className = '',
}: WeatherAutoFillProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedLocation, setFetchedLocation] = useState<string>('');

  const doFetch = useCallback(async (cityName: string) => {
    const trimmed = cityName.trim();
    if (trimmed.length < 2) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchWeatherForCity(trimmed);
      setWeather(data);
      setFetchedLocation(trimmed);

      const { weather: formWeather, temperature } = mapWeatherToFormOption(data);
      onWeatherFilled(formWeather, temperature);
    } catch (err) {
      console.warn('[ArchiFlow] WeatherAutoFill: fetch error:', err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err.message : 'Error al obtener clima');
    } finally {
      setLoading(false);
    }
  }, [onWeatherFilled]);

  // Auto-fetch on mount or when location changes
  useEffect(() => {
    if (autoFetch && location && location.trim().length >= 2 && location !== fetchedLocation) {
      doFetch(location);
    }
  }, [autoFetch, location, doFetch, fetchedLocation]);

  const handleRefresh = () => {
    if (location) {
      setFetchedLocation(''); // force re-fetch
      doFetch(location);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`card-glass-subtle rounded-xl p-3 flex items-center gap-3 ${className}`}>
        <div className="w-10 h-10 rounded-lg bg-[var(--skeuo-raised)] animate-pulse flex items-center justify-center">
          <CloudSun size={20} className="text-[var(--muted-foreground)] animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-3.5 w-32 bg-[var(--skeuo-raised)] rounded animate-pulse" />
          <div className="h-2.5 w-48 bg-[var(--skeuo-raised)] rounded animate-pulse mt-1.5" />
        </div>
      </div>
    );
  }

  // Error state — show fallback
  if (error) {
    return (
      <div className={`card-glass-subtle rounded-xl p-3 flex items-center gap-3 ${className}`}>
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <CloudOff size={18} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-[var(--foreground)] font-medium truncate">Clima no disponible</div>
          <div className="text-[10px] text-[var(--muted-foreground)] truncate">{error}</div>
        </div>
        {location && location.trim().length >= 2 && (
          <button
            className="w-7 h-7 rounded-lg bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] flex items-center justify-center text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--af-accent)] hover:border-[var(--af-accent)]/30 transition-colors shrink-0"
            onClick={handleRefresh}
            title="Reintentar"
          >
            <RefreshCw size={13} />
          </button>
        )}
      </div>
    );
  }

  // No location yet
  if (!location || location.trim().length < 2) {
    return (
      <div className={`card-glass-subtle rounded-xl p-3 flex items-center gap-3 ${className}`}>
        <div className="w-10 h-10 rounded-lg bg-[var(--skeuo-raised)] flex items-center justify-center shrink-0">
          <CloudSun size={18} className="text-[var(--muted-foreground)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-[var(--muted-foreground)]">
            Selecciona un proyecto con ubicación para obtener el clima automáticamente
          </div>
        </div>
      </div>
    );
  }

  // Weather card
  if (weather) {
    return (
      <div className={`card-glass-subtle rounded-xl p-3 flex items-center gap-3 ${className}`}>
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-400/20 flex items-center justify-center shrink-0 text-xl">
          {weather.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-[var(--foreground)] font-medium flex items-center gap-1.5 truncate">
            <Thermometer size={12} className="text-amber-400" />
            {weather.temp}°C — {weather.description}
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1.5 mt-0.5">
            <Wind size={10} />
            Viento: {weather.windSpeed} km/h
            <span className="mx-1 text-[var(--border)]">|</span>
            Ubicación: {fetchedLocation}
          </div>
        </div>
        <button
          className="w-7 h-7 rounded-lg bg-[var(--skeuo-raised)] border border-[var(--skeuo-edge-light)] flex items-center justify-center text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--af-accent)] hover:border-[var(--af-accent)]/30 transition-colors shrink-0"
          onClick={handleRefresh}
          title="Actualizar clima"
        >
          <RefreshCw size={13} />
        </button>
      </div>
    );
  }

  return null;
}
