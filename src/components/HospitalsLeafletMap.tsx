import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Hospital } from './HospitalsView';

/** Icono hospital (trazo), sobre fondo teal/gris */
const HOSPITAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6v4"/><path d="M14 8h-4"/><path d="M18 22v-8"/><path d="M6 22v-8"/><path d="M2 14h20"/><path d="M6 10h4"/><path d="M14 10h4"/><path d="M18 6h-4"/><path d="M10 6H6"/></svg>`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** HTML seguro para tooltip (Leaflet usa innerHTML); el inner fija el ancho y evita una letra por línea. */
function hospitalTooltipHtml(name: string, detail: string): string {
  return `<div class="hackia-leaflet-tip-inner">${escapeHtml(name)} · ${escapeHtml(detail)}</div>`;
}

/** Texto corto en el pin (evita repetir “Sin cob.” en todas las pastillas). */
function formatCopayPinLabel(h: Hospital): string {
  if (h.tieneCobertura === false) return '×';
  if (typeof h.copay === 'number' && Number.isFinite(h.copay)) {
    return `$${h.copay.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
  }
  return '~';
}

function formatCopayTooltipLabel(h: Hospital): string {
  if (h.tieneCobertura === false) return 'Sin cobertura del plan en esta vista';
  if (typeof h.copay === 'number' && Number.isFinite(h.copay)) {
    return `Copago ref. $${h.copay.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
  }
  return 'Copago no disponible en datos';
}

/**
 * Desktop: dos líneas (nombre + copago) — legible con espacio.
 * Móvil/tablet (<lg): una sola línea más baja para que al solaparse no “coma” el nombre del vecino; el nombre completo va en el tooltip.
 */
function hospitalMarkerIcon(
  selected: boolean,
  covered: boolean,
  copayLabel: string,
  hospitalName: string,
  compact: boolean,
): L.DivIcon {
  const ring = selected ? '0 0 0 2px rgba(13,148,136,0.75)' : 'none';
  const accent = covered !== false ? '#0d9488' : '#64748b';
  const safeLabel = escapeHtml(copayLabel);
  const safeName = escapeHtml(hospitalName.trim() || 'Hospital');

  if (compact) {
    const html = `
<div style="width:164px;height:34px;position:relative;cursor:pointer;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);display:flex;align-items:center;gap:5px;max-width:164px;box-sizing:border-box;background:#fff;border:2px solid ${accent};border-radius:999px;padding:3px 8px 3px 4px;box-shadow:${ring},0 2px 10px rgba(15,23,42,.18);">
    <span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:${accent};display:inline-flex;align-items:center;justify-content:center;line-height:0;">${HOSPITAL_SVG}</span>
    <span style="flex:1;min-width:0;font-size:9px;font-weight:800;color:#0f172a;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeName}</span>
    <span style="flex-shrink:0;font-size:10px;font-weight:900;color:#0f172a;letter-spacing:-0.02em;">${safeLabel}</span>
  </div>
</div>`;

    return L.divIcon({
      className: 'hospitals-leaflet-marker',
      html,
      iconSize: [164, 34],
      iconAnchor: [82, 34],
    });
  }

  const html = `
<div style="width:168px;min-height:52px;position:relative;cursor:pointer;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:max-content;max-width:168px;box-sizing:border-box;display:flex;flex-direction:column;gap:4px;background:#fff;border:2px solid ${accent};border-radius:14px;padding:5px 8px 6px;box-shadow:${ring},0 3px 14px rgba(15,23,42,.2);">
    <div style="font-size:10px;font-weight:800;color:#0f172a;line-height:1.25;max-width:152px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;line-clamp:2;">${safeName}</div>
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:${accent};display:inline-flex;align-items:center;justify-content:center;line-height:0;">${HOSPITAL_SVG}</span>
      <span style="font-size:11px;font-weight:900;color:#0f172a;line-height:1;letter-spacing:-0.02em;">${safeLabel}</span>
    </div>
  </div>
</div>`;

  return L.divIcon({
    className: 'hospitals-leaflet-marker',
    html,
    iconSize: [168, 62],
    iconAnchor: [84, 62],
  });
}

function clusterIconCreate(cluster: L.MarkerCluster): L.DivIcon {
  const n = cluster.getChildCount();
  const html = `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(145deg,#14b8a6,#0d9488);color:#fff;font-weight:900;font-size:13px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 3px 14px rgba(13,148,136,.45),0 2px 6px rgba(0,0,0,.2);cursor:pointer;">${n}</div>`;
  return L.divIcon({
    className: 'hospitals-cluster-marker',
    html,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function userMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'hospitals-leaflet-marker',
    html:
      '<div aria-hidden="true" style="width:12px;height:12px;border-radius:9999px;background:#2563eb;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.28)"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

type Props = {
  userCenter: { latitude: number; longitude: number } | null;
  hospitals: Hospital[];
  selectedId?: string;
  selectedNombre?: string;
  onSelectHospital: (h: Hospital) => void;
  /** Cambia cuando cambia layout (sidebar) para que Leaflet recalcule tamaño */
  layoutRevision: number;
};

/** Mapa OSM + clusters: en zonas densas agrupa y al hacer clic expande (spiderfy) para elegir hospital. */
export function HospitalsLeafletMap({
  userCenter,
  hospitals,
  selectedId,
  selectedNombre,
  onSelectHospital,
  layoutRevision,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const listSigRef = useRef<string>('');

  const [compactMarkers, setCompactMarkers] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const apply = () => setCompactMarkers(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const onSelectHospitalStable = useCallback(
    (h: Hospital) => {
      onSelectHospital(h);
    },
    [onSelectHospital],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
    }).setView([20, -100], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const userLayer = L.layerGroup().addTo(map);

    const cluster = L.markerClusterGroup({
      /** Primer clic en un grupo: “abanico” de marcadores (mejor que solo acercar zoom). */
      spiderfyOnEveryZoom: true,
      spiderfyOnMaxZoom: true,
      /** Separa más los pins al expandir (menos solapes en móvil). */
      spiderfyDistanceMultiplier: 1.45,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: false,
      maxClusterRadius: (zoom: number) => (zoom >= 14 ? 40 : zoom >= 12 ? 50 : 64),
      disableClusteringAtZoom: 17,
      spiderLegPolylineOptions: { weight: 2, color: '#0d9488', opacity: 0.55 },
      iconCreateFunction: clusterIconCreate,
    });
    cluster.addTo(map);

    userLayerRef.current = userLayer;
    clusterRef.current = cluster;
    mapRef.current = map;

    const resize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', resize);

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      window.removeEventListener('resize', resize);
      map.remove();
      mapRef.current = null;
      userLayerRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = window.setTimeout(() => map.invalidateSize(), 280);
    return () => window.clearTimeout(t);
  }, [layoutRevision]);

  useEffect(() => {
    const map = mapRef.current;
    const userLayer = userLayerRef.current;
    const cluster = clusterRef.current;
    if (!map || !userLayer || !cluster) return;

    userLayer.clearLayers();
    cluster.clearLayers();

    const points: L.LatLngTuple[] = [];

    if (userCenter) {
      L.marker([userCenter.latitude, userCenter.longitude], {
        icon: userMarkerIcon(),
        zIndexOffset: 400,
      })
        .bindTooltip('Tu ubicación', { direction: 'top' })
        .addTo(userLayer);
      points.push([userCenter.latitude, userCenter.longitude]);
    }

    for (const h of hospitals) {
      if (typeof h.latitude !== 'number' || typeof h.longitude !== 'number') continue;
      const latlng: L.LatLngTuple = [h.latitude, h.longitude];
      const selected =
        Boolean(selectedId && h.id && h.id === selectedId) ||
        Boolean(selectedNombre && h.nombre === selectedNombre);

      const pinLabel = formatCopayPinLabel(h);
      const tipDetail = formatCopayTooltipLabel(h);

      const marker = L.marker(latlng, {
        icon: hospitalMarkerIcon(selected, h.tieneCobertura !== false, pinLabel, h.nombre, compactMarkers),
        /** El seleccionado siempre encima para que no lo tape otro pin. */
        zIndexOffset: selected ? 3500 : compactMarkers ? 100 : 0,
      });
      marker.bindTooltip(hospitalTooltipHtml(h.nombre, tipDetail), {
        direction: 'top',
        sticky: !compactMarkers,
        opacity: 0.98,
        className: 'hospitals-leaflet-tooltip',
      });
      marker.on('click', () => {
        onSelectHospitalStable(h);
      });
      cluster.addLayer(marker);
      points.push(latlng);
    }

    const listSig = [
      userCenter ? `${userCenter.latitude},${userCenter.longitude}` : '',
      hospitals.map((h) => [h.id ?? '', h.nombre, h.latitude ?? '', h.longitude ?? ''].join(':')).join('|'),
    ].join('||');

    const shouldRefit = listSigRef.current !== listSig;
    listSigRef.current = listSig;

    if (points.length === 0) {
      map.setView([20, -100], 5);
      return;
    }

    if (points.length === 1) {
      const p = points[0];
      if (shouldRefit) {
        map.setView(p, 13);
      }
      return;
    }

    const bounds = L.latLngBounds(points);
    if (shouldRefit && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [72, 72], maxZoom: 15 });
    }
  }, [userCenter, hospitals, selectedId, selectedNombre, onSelectHospitalStable, compactMarkers]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 h-full w-full [&_.leaflet-container]:absolute [&_.leaflet-container]:inset-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-div-icon]:border-0 [&_.leaflet-div-icon]:bg-transparent [&_.marker-cluster]:bg-transparent [&_.marker-cluster]:border-none [&_.leaflet-control-attribution]:text-[10px]"
      role="application"
      aria-label="Mapa de hospitales; los números agrupan varios centros: haz clic para expandir y elegir."
    />
  );
}
