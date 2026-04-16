/**
 * geolocation-service.ts
 * Utility library for GPS geolocation: tracking, geofencing, distance calculations,
 * and reverse geocoding using the browser Geolocation API + Nominatim.
 */

/* ===== TYPES ===== */

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;      // meters
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;  // degrees from true north
  speed: number | null;    // meters per second
  timestamp: number;       // epoch ms
}

export interface GeoFence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  color?: string;
}

export interface LocationHistoryEntry {
  id: string;
  uid: string;
  userName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  timestamp: number;   // epoch ms
  heading?: number | null;
  speed?: number | null;
}

export interface ReverseGeocodeResult {
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

/* ===== POSITION HELPERS ===== */

/**
 * Get the current GPS position with high accuracy.
 * Prompts the user for permission if not already granted.
 */
export function getCurrentPosition(options?: PositionOptions): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator || !navigator.geolocation) {
      reject(new Error('La geolocalización no está disponible en este navegador.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.',
          2: 'No se pudo determinar la ubicación. Verifica que GPS esté activado.',
          3: 'La solicitud de ubicación expiró. Intenta de nuevo.',
        };
        reject(new Error(messages[err.code] || `Error de geolocalización: ${err.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
        ...options,
      }
    );
  });
}

/**
 * Watch position changes. Returns a watcher ID that can be passed to clearWatchPosition.
 */
export function watchPosition(
  onSuccess: (pos: GeoPosition) => void,
  onError: (err: Error) => void,
  options?: PositionOptions
): number {
  if (!navigator || !navigator.geolocation) {
    onError(new Error('La geolocalización no está disponible en este navegador.'));
    return 0;
  }
  return navigator.geolocation.watchPosition(
    (pos) => {
      onSuccess({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        timestamp: pos.timestamp,
      });
    },
    (err) => {
      const messages: Record<number, string> = {
        1: 'Permiso de ubicación denegado.',
        2: 'No se pudo determinar la ubicación.',
        3: 'La solicitud de ubicación expiró.',
      };
      onError(new Error(messages[err.code] || `Error: ${err.message}`));
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
      ...options,
    }
  );
}

/** Clear a position watcher by its ID. */
export function clearWatchPosition(watchId: number): void {
  if (navigator?.geolocation && watchId !== 0) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/* ===== DISTANCE CALCULATIONS ===== */

/** Earth radius in meters */
const EARTH_RADIUS_M = 6_371_000;

/**
 * Calculate the distance between two GPS coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Check if a point (lat, lon) is within a geofence circle.
 * Returns true if inside, false if outside.
 */
export function isWithinGeofence(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): boolean {
  const dist = calculateDistance(lat, lon, centerLat, centerLon);
  return dist <= radiusMeters;
}

/** Format a distance in meters to a human-readable string. */
export function formatDistance(meters: number): string {
  if (meters < 0) return '—';
  if (meters < 1000) return `${Math.round(meters)}m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters / 1000)}km`;
}

/* ===== REVERSE GEOCODING ===== */

/** Nominatim base URL (free, no API key required) */
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse';

/**
 * Reverse geocode coordinates to an address using Nominatim (OpenStreetMap).
 * Returns a short address string. Returns empty string on error.
 *
 * Note: Nominatim has a usage policy of max 1 request per second.
 */
let _lastReverseCall = 0;
const REVERSE_THROTTLE_MS = 1100;

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    // Throttle to respect Nominatim usage policy
    const now = Date.now();
    const elapsed = now - _lastReverseCall;
    if (elapsed < REVERSE_THROTTLE_MS) {
      await new Promise((r) => setTimeout(r, REVERSE_THROTTLE_MS - elapsed));
    }
    _lastReverseCall = Date.now();

    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json',
      'accept-language': 'es',
      zoom: '18',
      addressdetails: '1',
    });

    const resp = await fetch(`${NOMINATIM_BASE}?${params}`, {
      headers: { 'User-Agent': 'Archiflow-Construction-App/1.0' },
    });

    if (!resp.ok) return '';

    const data: ReverseGeocodeResult = await resp.json();
    if (!data?.display_name) return '';

    // Build a concise address
    const addr = data.address;
    const parts: string[] = [];
    if (addr.road) {
      parts.push(addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road);
    }
    if (addr.city || addr.town || addr.village) {
      parts.push(addr.city || addr.town || addr.village!);
    }
    if (addr.state) parts.push(addr.state);

    return parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(',');
  } catch {
    console.warn('[ArchiFlow] Reverse geocode failed');
    return '';
  }
}

/* ===== PERMISSION HELPERS ===== */

/** Check if geolocation permission has been granted (modern API). */
export async function checkPermission(): Promise<PermissionState> {
  try {
    if (!navigator?.permissions) return 'prompt';
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch {
    return 'prompt';
  }
}

/** Build a GeoFence object for a project given its location string. */
export function createProjectGeofence(
  projectId: string,
  projectName: string,
  centerLat: number,
  centerLon: number,
  radiusMeters: number = 500
): GeoFence {
  return {
    id: projectId,
    name: projectName,
    latitude: centerLat,
    longitude: centerLon,
    radiusMeters,
  };
}
