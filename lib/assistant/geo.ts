import type { AssistantPlace } from "@/lib/assistant-context";

const EARTH_RADIUS_KM = 6371;

/** Great-circle (straight-line) distance in kilometres. Not road distance. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export function makePlace(name: string, latitude: number, longitude: number, address?: string): AssistantPlace {
  const lat = Number(latitude.toFixed(6));
  const lon = Number(longitude.toFixed(6));
  return {
    name,
    ...(address ? { address } : {}),
    latitude: lat,
    longitude: lon,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    openStreetMapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=13/${lat}/${lon}`,
  };
}

export function directionsUrl(from: AssistantPlace, to: AssistantPlace): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.latitude},${from.longitude}&destination=${to.latitude},${to.longitude}`;
}

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[?::1\]?)$/i;

/** Accepts only public http(s) URLs; rejects credentials, private hosts and oversized input. */
export function parsePublicHttpUrl(value: string): URL | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (PRIVATE_HOST.test(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}
