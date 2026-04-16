/**
 * date-utils.ts
 * Utilidades centralizadas para conversiones seguras de fecha.
 * Elimina bugs de NaN, Invalid Date y dead-code en todo el proyecto.
 */

/**
 * Convierte cualquier tipo de valor a un objeto Date seguro.
 * Soporta: string ISO, Date nativo, Firestore Timestamp ({toDate, seconds}),
 * number (milisegundos), null, undefined.
 *
 * Si el valor no es parseable, retorna Date(0) (epoch) en vez de Invalid Date.
 */
/** Shape of a Firestore Timestamp with a toDate() method. */
interface FirestoreTimestampWithToDate {
  toDate(): Date;
}

/** Shape of a serialized Firestore Timestamp (e.g. from JSON). */
interface FirestoreTimestampSerialized {
  seconds: number;
  nanoseconds?: number;
}

export function toSafeDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (!value) return new Date(0);
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
  if (typeof value === 'object' && value !== null) {
    // Firestore Timestamp — tiene .toDate()
    if ('toDate' in value && typeof (value as FirestoreTimestampWithToDate).toDate === 'function') {
      try { return (value as FirestoreTimestampWithToDate).toDate(); } catch (_) { /* fall through */ }
    }
    // Firestore Timestamp parcial/serializado — tiene .seconds
    if ('seconds' in value && typeof (value as FirestoreTimestampSerialized).seconds === 'number') {
      return new Date((value as FirestoreTimestampSerialized).seconds * 1000 + ((value as FirestoreTimestampSerialized).nanoseconds || 0) / 1e6);
    }
  }
  const d = new Date(value as string | number);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

/**
 * Convierte cualquier valor de fecha a milisegundos (number).
 * Retorna null si no se puede determinar un valor válido.
 */
export function toMs(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  const d = toSafeDate(value);
  return d.getTime() === 0 && value != null && value !== 0 ? null : d.getTime();
}
