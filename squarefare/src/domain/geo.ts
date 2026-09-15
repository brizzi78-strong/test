/** Geodesic helpers: haversine distance, travel-time estimates, and interpolation. */

import type { LatLng } from './types.ts';

const EARTH_RADIUS_KM = 6371;

export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Average urban door-to-door speed used for ETAs and trip simulation. */
export const CITY_SPEED_KMH = 28;

export function travelMinutes(a: LatLng, b: LatLng): number {
  return (distanceKm(a, b) / CITY_SPEED_KMH) * 60;
}

/** Point `fraction` (0..1) of the way from a to b. Fine at city scale. */
export function interpolate(a: LatLng, b: LatLng, fraction: number): LatLng {
  const f = Math.min(1, Math.max(0, fraction));
  return {
    lat: a.lat + (b.lat - a.lat) * f,
    lng: a.lng + (b.lng - a.lng) * f,
  };
}
