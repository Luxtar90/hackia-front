/** Convierte y valida lat/lng. Rechaza null island (0,0) y valores fuera de rango. */
export function normalizeCoordinates(lat: unknown, lng: unknown): { latitude: number; longitude: number } | null {
  const latitude = typeof lat === 'string' ? Number(lat) : typeof lat === 'number' ? lat : NaN;
  const longitude = typeof lng === 'string' ? Number(lng) : typeof lng === 'number' ? lng : NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) <= 1e-5 && Math.abs(longitude) <= 1e-5) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export function coordsFromHospitalLike(h: unknown): { latitude: number; longitude: number } | null {
  if (!h || typeof h !== 'object') return null;
  const o = h as Record<string, unknown>;
  const lat = o.latitude ?? o.latitud ?? o.lat ?? (o.coords as Record<string, unknown>)?.latitude;
  const lng = o.longitude ?? o.longitud ?? o.lng ?? (o.coords as Record<string, unknown>)?.longitude;
  return normalizeCoordinates(lat, lng);
}

/** Destino para Google Maps: coordenadas válidas o texto nombre+dirección+ciudad. */
export function hospitalDestinationForMaps(hospital: unknown): string | null {
  const c = coordsFromHospitalLike(hospital);
  if (c) return `${c.latitude},${c.longitude}`;
  if (!hospital || typeof hospital !== 'object') return null;
  const o = hospital as Record<string, unknown>;
  const title =
    typeof o.nombre === 'string' && o.nombre.trim()
      ? o.nombre.trim()
      : typeof o.name === 'string' && o.name.trim()
        ? o.name.trim()
        : '';
  const parts = [title, o.direccion, o.ciudad]
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
  if (parts.length === 0) return null;
  return parts.join(', ');
}

/**
 * Ruta hacia el hospital: destino = hospital (obligatorio), origen = usuario si hay coords válidas.
 * No usar la ubicación del usuario como destino.
 */
export function buildGoogleDirectionsUrl(
  hospital: unknown,
  user: { latitude: number; longitude: number } | null | undefined,
): string {
  const dest = hospitalDestinationForMaps(hospital);
  if (!dest) return 'https://www.google.com/maps';

  const params = new URLSearchParams({ api: '1', destination: dest });
  const u = user ? normalizeCoordinates(user.latitude, user.longitude) : null;
  if (u) params.set('origin', `${u.latitude},${u.longitude}`);

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Solo ver el lugar del hospital (sin panel de rutas). */
export function buildGoogleHospitalSearchUrl(hospital: unknown): string {
  const dest = hospitalDestinationForMaps(hospital);
  if (!dest) return 'https://www.google.com/maps';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`;
}

/** iframe embed centrado en el hospital (coords o búsqueda por texto). */
export function buildGoogleEmbedHospitalUrl(hospital: unknown): string | null {
  const c = coordsFromHospitalLike(hospital);
  if (c) return `https://maps.google.com/maps?q=${c.latitude},${c.longitude}&z=16&output=embed`;
  const label = hospitalDestinationForMaps(hospital);
  if (!label) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(label)}&z=16&output=embed`;
}
