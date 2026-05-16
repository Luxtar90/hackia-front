import { useCallback, useEffect, useRef } from 'react';
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

/** Pastilla horizontal compacta (menos solapamiento que pin + chip apilados). */
function hospitalMarkerIcon(selected: boolean, covered: boolean, copayLabel: string): L.DivIcon {
  const ring = selected ? '0 0 0 2px rgba(13,148,136,0.75)' : 'none';
  const accent = covered !== false ? '#0d9488' : '#64748b';
  const safeLabel = escapeHtml(copayLabel);

  const html = `
<div style="width:118px;height:32px;position:relative;cursor:pointer;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);display:flex;align-items:center;gap:5px;background:#fff;border:2px solid ${accent};border-radius:999px;padding:2px 9px 2px 3px;box-shadow:${ring},0 2px 10px rgba(15,23,42,.18);white-space:nowrap;">
    <span style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:${accent};display:inline-flex;align-items:center;justify-content:center;line-height:0;">${HOSPITAL_SVG}</span>
    <span style="font-size:11px;font-weight:800;color:#0f172a;line-height:1;min-width:1.25rem;text-align:center;">${safeLabel}</span>
  </div>
</div>`;

  return L.divIcon({
    className: 'hospitals-leaflet-marker',
    html,
    iconSize: [118, 32],
    iconAnchor: [59, 32],
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
        icon: hospitalMarkerIcon(selected, h.tieneCobertura !== false, pinLabel),
        zIndexOffset: selected ? 900 : 0,
      });
      marker.bindTooltip(`${h.nombre} · ${tipDetail}`, { sticky: true, direction: 'top' });
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
  }, [userCenter, hospitals, selectedId, selectedNombre, onSelectHospitalStable]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 h-full w-full [&_.leaflet-container]:absolute [&_.leaflet-container]:inset-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-div-icon]:border-0 [&_.leaflet-div-icon]:bg-transparent [&_.marker-cluster]:bg-transparent [&_.marker-cluster]:border-none [&_.leaflet-control-attribution]:text-[10px]"
      role="application"
      aria-label="Mapa de hospitales; los números agrupan varios centros: haz clic para expandir y elegir."
    />
  );
}
