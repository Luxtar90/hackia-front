import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Phone, Star, Search, Menu, Loader, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import { hospitalApi } from '../lib/api';
import { useAppStore, type SelectedHospital } from '../store/useAppStore';
import {
  buildGoogleDirectionsUrl,
  buildGoogleEmbedHospitalUrl,
  coordsFromHospitalLike,
  normalizeCoordinates,
} from '../lib/geo';
import { HospitalsLeafletMap } from './HospitalsLeafletMap';
import { translations } from '../lib/translations';

interface HospitalsViewProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export interface Hospital {
  id?: string;
  nombre: string;
  ciudad: string;
  nivelAtencion?: string;
  activo?: boolean;
  rating?: number;
  distancia?: number;
  direccion?: string;
  telefono?: string;
  latitude?: number;
  longitude?: number;
  copay?: number;
  reason?: string;
  /** Maestro Notion HOSPITALES = prestador con cobertura en el modelo del prototipo */
  tieneCobertura?: boolean;
  carteraServicios?: string[];
}

function hospitalFromStoreSelected(s: SelectedHospital): Hospital {
  const c = coordsFromHospitalLike(s);
  return {
    id: s.id,
    nombre: s.nombre,
    ciudad: s.ciudad ?? '',
    direccion: s.direccion,
    telefono: s.telefono,
    latitude: c?.latitude ?? s.latitude,
    longitude: c?.longitude ?? s.longitude,
    rating: s.score,
    copay: s.copay,
    reason: s.reason,
    tieneCobertura: true,
    carteraServicios: s.portfolio,
  };
}

function hospitalLocationLine(h: Pick<Hospital, 'direccion' | 'ciudad'>): string {
  const d = h.direccion?.trim();
  const c = h.ciudad?.trim();
  if (d && c) return `${d} · ${c}`;
  return d || c || 'Ubicación';
}

function normalizeHospitalRow(h: Record<string, unknown>): Hospital {
  const c = coordsFromHospitalLike(h);
  const dist = h.distancia;
  const distancia =
    typeof dist === 'number' && Number.isFinite(dist) ? dist : undefined;
  const idStr = typeof h.id === 'string' ? h.id : '';
  const fromOsm =
    h.fuente === 'openstreetmap' || idStr.startsWith('osm-');
  /** API envía false explícito para OSM; true para Notion; si falta el campo, maestro Notion = en red. */
  const tieneCobertura = fromOsm
    ? false
    : h.tieneCobertura === false || h.tieneCobertura === 'false'
      ? false
      : true;

  const rawCartera = h.carteraServicios;
  const carteraServicios = Array.isArray(rawCartera)
    ? rawCartera.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];

  return {
    id: h.id as string | undefined,
    nombre: (h.nombre as string) || 'Hospital',
    ciudad: (h.ciudad as string) || '',
    nivelAtencion: h.nivelAtencion as string | undefined,
    activo: h.activo as boolean | undefined,
    rating: typeof h.rating === 'number' ? h.rating : undefined,
    distancia,
    direccion: h.direccion as string | undefined,
    telefono: h.telefono as string | undefined,
    latitude: c?.latitude,
    longitude: c?.longitude,
    copay: typeof h.copay === 'number' ? h.copay : undefined,
    tieneCobertura,
    carteraServicios,
  };
}

const DEFAULT_RADIUS_KM = 50;
const MIN_RADIUS_KM = 5;
const MAX_RADIUS_KM = 150;
const LIST_PAGE_SIZE_MOBILE = 10;
/** En escritorio menos ítems por página + tarjetas compactas = columna menos alta. */
const LIST_PAGE_SIZE_DESKTOP = 5;

type CoverageFilter = 'all' | 'covered' | 'uncovered';

const GENERIC_MAP_EMBED =
  'https://maps.google.com/maps?width=100%25&height=600&hl=es&q=hospitales%20cercanos&t=&z=14&ie=UTF8&iwloc=B&output=embed';

const MAP_OVERLAY_CARD =
  'glass rounded-2xl border border-white/50 dark:border-white/10 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.04] dark:ring-white/[0.08] backdrop-blur-xl';

/** Espacio inferior reservado para logo / datos del mapa / términos del iframe de Google */
const MAP_CHROME_BOTTOM =
  'pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] md:pb-[calc(env(safe-area-inset-bottom,0px)+7rem)]';

/** Lista vs mapa en escritorio: valor guardado en localStorage; por defecto el mapa ocupa más que la lista. */
const SPLIT_STORAGE_KEY = 'hackia-hospitals-list-fraction';
const SPLIT_DEFAULT_FRAC = 0.36;
const SPLIT_MIN_FRAC = 0.26;
const SPLIT_MAX_FRAC = 0.56;

function readStoredListFraction(): number {
  if (typeof window === 'undefined') return SPLIT_DEFAULT_FRAC;
  try {
    const raw = localStorage.getItem(SPLIT_STORAGE_KEY);
    const n = raw ? Number.parseFloat(raw) : NaN;
    if (Number.isFinite(n)) {
      return Math.min(SPLIT_MAX_FRAC, Math.max(SPLIT_MIN_FRAC, n));
    }
  } catch {
    /* ignore */
  }
  return SPLIT_DEFAULT_FRAC;
}

function embedMapUrl(activeHospital: Hospital | null, userCenter: { latitude: number; longitude: number } | null): string {
  if (activeHospital) {
    const hospitalEmbed = buildGoogleEmbedHospitalUrl(activeHospital);
    if (hospitalEmbed) return hospitalEmbed;
  }
  if (userCenter) {
    return `https://maps.google.com/maps?q=${userCenter.latitude},${userCenter.longitude}&z=11&output=embed`;
  }
  return GENERIC_MAP_EMBED;
}

export function HospitalsView({ isSidebarOpen, setIsSidebarOpen }: HospitalsViewProps) {
  const [nearbyHospitals, setNearbyHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [storageReady, setStorageReady] = useState(() => useAppStore.persist.hasHydrated());
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>('all');
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [radiusInput, setRadiusInput] = useState(DEFAULT_RADIUS_KM);
  const [listPage, setListPage] = useState(1);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const splitDragRef = useRef(false);
  const listFracRef = useRef(readStoredListFraction());
  const [listPanelFraction, setListPanelFraction] = useState(() => readStoredListFraction());
  const [listPageSize, setListPageSize] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
      ? LIST_PAGE_SIZE_DESKTOP
      : LIST_PAGE_SIZE_MOBILE,
  );
  const [isDesktopSplitLayout, setIsDesktopSplitLayout] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  const { selectedHospital, setSelectedHospital, setMapCenter, userLocation, customerId, language } = useAppStore();

  const t = translations[language].hospitals;

  useEffect(() => {
    const id = window.setTimeout(() => setRadiusKm(radiusInput), 400);
    return () => window.clearTimeout(id);
  }, [radiusInput]);

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setStorageReady(true));
    if (useAppStore.persist.hasHydrated()) setStorageReady(true);
    return unsub;
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => {
      const desktop = mq.matches;
      setIsDesktopSplitLayout(desktop);
      setListPageSize(desktop ? LIST_PAGE_SIZE_DESKTOP : LIST_PAGE_SIZE_MOBILE);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const applyListFraction = useCallback((frac: number) => {
    const clamped = Math.min(SPLIT_MAX_FRAC, Math.max(SPLIT_MIN_FRAC, frac));
    listFracRef.current = clamped;
    setListPanelFraction(clamped);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!splitDragRef.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const x = e.clientX - rect.left;
      applyListFraction(x / rect.width);
    };
    const endDrag = () => {
      if (!splitDragRef.current) return;
      splitDragRef.current = false;
      try {
        localStorage.setItem(SPLIT_STORAGE_KEY, String(listFracRef.current));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [applyListFraction]);

  useEffect(() => {
    setListPage(1);
  }, [searchTerm, coverageFilter, nearbyHospitals, listPageSize]);

  useEffect(() => {
    if (!storageReady) return;

    let cancelled = false;

    const load = async () => {
      /** Guardamos GPS aquí y persistimos en el store al terminar la carga (evita setUserLocation a mitad del efecto → re-ejecución → cancelación). */
      let pendingPersistGeo: { latitude: number; longitude: number } | null = null;
      try {
        setLoading(true);
        setError(null);

        let lat: number | undefined;
        let lng: number | undefined;

        const stored = useAppStore.getState().userLocation;
        const storedOk = stored ? normalizeCoordinates(stored.latitude, stored.longitude) : null;
        if (storedOk) {
          lat = storedOk.latitude;
          lng = storedOk.longitude;
        } else if (navigator.geolocation) {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const n = normalizeCoordinates(pos.coords.latitude, pos.coords.longitude);
                if (n) {
                  lat = n.latitude;
                  lng = n.longitude;
                  pendingPersistGeo = n;
                }
                resolve();
              },
              () => resolve(),
              { enableHighAccuracy: true, maximumAge: 60_000, timeout: 25_000 },
            );
          });
        }

        if (cancelled) return;

        const hasGeo = lat !== undefined && lng !== undefined;
        const response = await hospitalApi.getNearbyHospitals(lat, lng, radiusKm, {
          catalog: !hasGeo,
          numeroPoliza: customerId,
        });
        if (cancelled) return;

        if (response.success && response.data.hospitales) {
          const rows = response.data.hospitales as Record<string, unknown>[];
          setNearbyHospitals(rows.map(normalizeHospitalRow));
          if (rows.length === 0) {
            setError(null);
          }
        } else {
          setError(language === 'Español' ? 'No se pudieron cargar los hospitales' : 'Could not load hospitals');
        }
      } catch (err) {
        console.error('Error fetching hospitals:', err);
        if (!cancelled) setError(t.loadingHospitals);
      } finally {
        if (!cancelled && pendingPersistGeo) {
          useAppStore.getState().setUserLocation(pendingPersistGeo);
        }
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // Radio, póliza (copago en mapa) y modo catálogo.
  }, [storageReady, radiusKm, customerId, language]);

  const showSpinner = !storageReady || loading;

  const filteredHospitals = nearbyHospitals.filter((h) => {
    const q = searchTerm.toLowerCase();
    return (
      h.nombre.toLowerCase().includes(q) ||
      h.ciudad.toLowerCase().includes(q) ||
      (h.direccion?.toLowerCase().includes(q) ?? false)
    );
  });

  const listHospitals = filteredHospitals.filter((h) => {
    if (coverageFilter === 'all') return true;
    if (coverageFilter === 'covered') return h.tieneCobertura !== false;
    return h.tieneCobertura === false;
  });

  const totalListCount = listHospitals.length;
  const totalListPages = Math.max(1, Math.ceil(totalListCount / listPageSize));
  const effectiveListPage = Math.min(Math.max(1, listPage), totalListPages);
  const listPageStart = (effectiveListPage - 1) * listPageSize;
  const paginatedListHospitals = listHospitals.slice(listPageStart, listPageStart + listPageSize);
  const listRangeFrom = totalListCount === 0 ? 0 : listPageStart + 1;
  const listRangeTo = Math.min(listPageStart + listPageSize, totalListCount);

  useEffect(() => {
    listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [effectiveListPage, listPageSize]);

  const selectedHospitalFromList = selectedHospital
    ? listHospitals.find((hospital) => hospital.id === selectedHospital.id || hospital.nombre === selectedHospital.nombre) || null
    : null;

  const activeHospital: Hospital | null =
    selectedHospitalFromList ||
    (selectedHospital ? hospitalFromStoreSelected(selectedHospital) : null) ||
    listHospitals[0] ||
    null;
  const userMapCenter = userLocation ? normalizeCoordinates(userLocation.latitude, userLocation.longitude) : null;
  const mapUrl = embedMapUrl(activeHospital, userMapCenter);

  const canInteractiveMap =
    userMapCenter != null ||
    listHospitals.some(
      (h) => typeof h.latitude === 'number' && typeof h.longitude === 'number' && Number.isFinite(h.latitude) && Number.isFinite(h.longitude),
    );
  /** Destino siempre el hospital; origen tu ubicación si está disponible (evita abrir solo “tu posición”). */
  const directionsUrl = activeHospital
    ? buildGoogleDirectionsUrl(activeHospital, userLocation)
    : 'https://www.google.com/maps';

  const handleSelectHospital = useCallback(
    (hospital: Hospital) => {
      const c = coordsFromHospitalLike(hospital);
      setSelectedHospital({
        id: hospital.id,
        nombre: hospital.nombre,
        ciudad: hospital.ciudad,
        direccion: hospital.direccion,
        telefono: hospital.telefono,
        latitude: c?.latitude,
        longitude: c?.longitude,
        score: hospital.rating,
        reason: language === 'Español' ? `Seleccionado en el mapa o la lista · ${hospital.ciudad}` : `Selected on map or list · ${hospital.ciudad}`,
      });

      setMapCenter(c ? { latitude: c.latitude, longitude: c.longitude } : null);
    },
    [setMapCenter, setSelectedHospital, language],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full bg-white dark:bg-slate-900 overflow-y-auto overscroll-y-contain lg:overflow-hidden">
      {/* Header */}
      <header className="h-[65px] px-4 md:px-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 shrink-0">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">{t.title}</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
            {userMapCenter
              ? t.radiusInfo(radiusKm)
              : t.noGeoInfo}
          </p>
        </div>
      </header>

      <div
        ref={splitContainerRef}
        className="flex flex-col-reverse lg:flex-row lg:flex-1 lg:min-h-0 lg:overflow-hidden w-full shrink-0 lg:shrink"
      >
        {/* Sidebar: filtros + lista (en móvil va debajo del mapa por flex-col-reverse) */}
        <div
          className={cn(
            'w-full border-t border-slate-100 dark:border-slate-800 lg:border-t-0 lg:border-r lg:border-slate-100 lg:dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 lg:min-h-0 lg:overflow-hidden shrink-0',
            !isDesktopSplitLayout && 'lg:flex-1',
          )}
          style={
            isDesktopSplitLayout
              ? {
                  flex: `0 0 ${listPanelFraction * 100}%`,
                  minWidth: 260,
                  maxWidth: `${SPLIT_MAX_FRAC * 100}%`,
                }
              : undefined
          }
        >
          <div className="shrink-0 p-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white transition-all shadow-sm"
              />
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">{t.coverage}</p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all' as const, label: t.all },
                    { id: 'covered' as const, label: t.withCoverage },
                    { id: 'uncovered' as const, label: t.withoutCoverage },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCoverageFilter(opt.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors border',
                      coverageFilter === opt.id
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={cn(!userMapCenter && 'opacity-60')}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {t.searchRadius}
                </p>
                <span className="text-xs font-black text-teal-600 dark:text-teal-400 tabular-nums">{radiusInput} km</span>
              </div>
              <input
                type="range"
                min={MIN_RADIUS_KM}
                max={MAX_RADIUS_KM}
                step={1}
                value={radiusInput}
                disabled={!userMapCenter}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  setRadiusInput(Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, v)));
                }}
                className="w-full h-2 accent-teal-600 rounded-lg disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                <span>{MIN_RADIUS_KM} km</span>
                <span>{MAX_RADIUS_KM} km</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">{t.exact}</label>
                <input
                  type="number"
                  min={MIN_RADIUS_KM}
                  max={MAX_RADIUS_KM}
                  value={radiusInput}
                  disabled={!userMapCenter}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    if (!Number.isFinite(raw)) return;
                    setRadiusInput(Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, Math.round(raw))));
                  }}
                  className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-white disabled:opacity-50"
                />
              </div>
              {!userMapCenter && (
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  {t.activateGeo}
                </p>
              )}
            </div>
          </div>

          {!showSpinner && !error && totalListCount > 0 && (
            <p className="shrink-0 border-b border-slate-100 dark:border-slate-800 px-4 py-2 text-[10px] font-semibold leading-snug text-slate-500 dark:text-slate-400">
              {t.listTotalHint(totalListCount)}
            </p>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:w-full">
          <div
            ref={listScrollRef}
            className={cn(
              'custom-scrollbar space-y-4 overflow-x-hidden touch-pan-y overscroll-y-contain px-4 py-3 lg:space-y-2 lg:p-3',
              'max-lg:overflow-visible max-lg:flex-none',
              'min-h-0 lg:flex-1 lg:overflow-y-scroll lg:overscroll-y-contain',
            )}
          >
            {showSpinner ? (
              <div className="flex items-center justify-center min-h-[200px] lg:h-full py-12">
                <div className="text-center">
                  <Loader className="animate-spin text-teal-600 mx-auto mb-2" size={32} />
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t.loadingHospitals}</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center p-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            ) : nearbyHospitals.length === 0 ? (
              <div className="text-center p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t.noActiveHospitals}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t.noActiveDesc}
                </p>
              </div>
            ) : listHospitals.length === 0 ? (
              <div className="text-center p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t.noMatches}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t.noMatchesDesc}
                </p>
              </div>
            ) : (
              paginatedListHospitals.map((hospital, idx) => (
                <div 
                  key={hospital.id ?? `${listPageStart + idx}-${hospital.nombre}`} 
                  onClick={() => handleSelectHospital(hospital)}
                  className={cn(
                    'bg-white dark:bg-slate-800 p-4 rounded-[24px] border shadow-sm hover:shadow-md transition-all cursor-pointer group',
                    'lg:p-3 lg:rounded-xl lg:shadow-sm',
                    (selectedHospital?.id && hospital.id === selectedHospital.id) || selectedHospital?.nombre === hospital.nombre
                      ? "border-teal-400 ring-2 ring-teal-500/20"
                      : "border-slate-100 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500"
                  )}
                >
                  <div className="flex justify-between items-start gap-2 mb-2 lg:mb-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm lg:text-[13px] leading-snug min-w-0 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {hospital.nombre}
                    </h4>
                    {hospital.tieneCobertura !== false ? (
                      <span className="text-[9px] bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full font-bold uppercase">
                        {translations[language].chat.inNetwork}
                      </span>
                    ) : (
                      <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold uppercase">
                        {translations[language].chat.outNetwork}
                      </span>
                    )}
                  </div>
                  <p className="text-xs lg:text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5 mb-3 lg:mb-1.5 lg:line-clamp-2 leading-snug">
                    <MapPin size={12} className="shrink-0 mt-0.5 lg:scale-90" /> {hospitalLocationLine(hospital)}
                  </p>
                  {(hospital.carteraServicios?.length ?? 0) > 0 && (
                    <div className="mb-3 lg:hidden flex flex-wrap items-center gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400 w-full mb-0.5">
                        {t.portfolioTitle}
                      </span>
                      {hospital.carteraServicios!.slice(0, 8).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 font-semibold"
                        >
                          {tag}
                        </span>
                      ))}
                      {hospital.carteraServicios!.length > 8 && (
                        <span className="text-[9px] text-slate-400 font-medium">
                          +{hospital.carteraServicios!.length - 8}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-4 lg:gap-3 mb-4 lg:mb-2 flex-wrap">
                    <div className="flex items-center gap-1 text-[11px] lg:text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      <Star size={12} className="text-yellow-400 fill-yellow-400 lg:scale-90" />{' '}
                      {hospital.rating?.toFixed(1) || '4.5'}
                    </div>
                    <div className="text-[11px] lg:text-[10px] font-bold text-slate-400">
                      {hospital.distancia ? `${hospital.distancia.toFixed(1)} km` : 'Distancia N/A'}
                    </div>
                    <div className="text-[11px] lg:text-[10px] font-bold uppercase tracking-wider text-green-500">
                      {t.open}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 lg:gap-1.5">
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 lg:gap-1 py-2 lg:py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl lg:rounded-lg text-[11px] lg:text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-teal-600 hover:text-white transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(buildGoogleDirectionsUrl(hospital, userLocation), '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <Navigation size={12} className="lg:w-3 lg:h-3" /> {t.howToGet}
                    </button>
                    {hospital.telefono ? (
                      <a
                        href={`tel:${hospital.telefono}`}
                        className="flex items-center justify-center gap-2 lg:gap-1 py-2 lg:py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl lg:rounded-lg text-[11px] lg:text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone size={12} className="lg:w-3 lg:h-3" /> {t.call}
                      </a>
                    ) : (
                      <span className="flex items-center justify-center gap-2 lg:gap-1 py-2 lg:py-1.5 bg-slate-50 dark:bg-slate-700/30 rounded-xl lg:rounded-lg text-[11px] lg:text-[10px] font-bold text-slate-400 cursor-not-allowed">
                        <Phone size={12} className="lg:w-3 lg:h-3" /> {t.call}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {!showSpinner && !error && totalListCount > 0 && totalListPages > 1 && (
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 px-3 py-3 lg:py-2 space-y-2 lg:space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                <span>{t.listShowing(listRangeFrom, listRangeTo, totalListCount)}</span>
                <span className="truncate">{t.listPageStatus(effectiveListPage, totalListPages)}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={effectiveListPage <= 1}
                  onClick={() => setListPage(Math.max(1, effectiveListPage - 1))}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors border',
                    effectiveListPage <= 1
                      ? 'border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300',
                  )}
                >
                  <ChevronLeft size={14} /> {t.listPagePrev}
                </button>
                <button
                  type="button"
                  disabled={effectiveListPage >= totalListPages}
                  onClick={() => setListPage(Math.min(totalListPages, effectiveListPage + 1))}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors border',
                    effectiveListPage >= totalListPages
                      ? 'border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300',
                  )}
                >
                  {t.listPageNext} <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
          </div>
        </div>

        <button
          type="button"
          className={cn(
            'hidden lg:flex w-3 shrink-0 items-center justify-center self-stretch cursor-col-resize touch-none select-none',
            'border-r border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40',
            'hover:bg-teal-500/10 active:bg-teal-500/[0.18]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-inset',
          )}
          aria-label={t.splitResize}
          title={`${t.splitResize}. ${t.splitResetHint}`}
          onPointerDown={(e) => {
            e.preventDefault();
            splitDragRef.current = true;
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            applyListFraction(SPLIT_DEFAULT_FRAC);
            try {
              localStorage.setItem(SPLIT_STORAGE_KEY, String(listFracRef.current));
            } catch {
              /* ignore */
            }
          }}
        >
          <GripVertical className="h-8 w-4 text-slate-400 pointer-events-none" strokeWidth={2} aria-hidden />
        </button>

        {/* Mapa: en móvil altura fija + scroll de página; en lg ocupa el resto del viewport */}
        <div className="flex w-full shrink-0 flex-col h-[min(46vh,420px)] min-h-[260px] lg:min-h-0 lg:h-auto lg:flex-1 lg:min-w-0 bg-slate-200/80 dark:bg-slate-950">
          <div className="relative flex-1 min-h-[220px] m-1.5 md:m-2 rounded-xl md:rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-900 isolate touch-manipulation [&_.leaflet-container]:touch-pan-x [&_.leaflet-container]:touch-pan-y lg:min-h-[280px]">
            {canInteractiveMap ? (
              <HospitalsLeafletMap
                userCenter={userMapCenter}
                hospitals={listHospitals}
                selectedId={selectedHospital?.id}
                selectedNombre={selectedHospital?.nombre}
                onSelectHospital={handleSelectHospital}
                layoutRevision={isSidebarOpen ? 1 : 0}
              />
            ) : (
              <iframe
                title="Google Maps"
                className="absolute inset-0 block h-full w-full grayscale-[0.2] dark:invert-[0.9] dark:hue-rotate-180"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={mapUrl}
              />
            )}

            <div
              className={cn(
                'pointer-events-none absolute inset-0 z-10 hidden lg:flex lg:flex-col pt-2 px-2 md:pt-3 md:px-3',
                MAP_CHROME_BOTTOM,
              )}
            >
            {activeHospital && (
              <div
                className={cn(
                  MAP_OVERLAY_CARD,
                  'pointer-events-auto w-full max-w-md max-h-[min(42vh,320px)] overflow-y-auto custom-scrollbar p-4',
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">{t.recommended}</p>
                    {activeHospital.tieneCobertura !== false ? (
                      <span className="text-[9px] bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full font-bold uppercase">
                        {translations[language].chat.inNetwork}
                      </span>
                    ) : (
                      <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold uppercase">
                        {translations[language].chat.outNetwork}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{activeHospital.nombre}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin size={12} /> {hospitalLocationLine(activeHospital)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-yellow-500">
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    {activeHospital.rating?.toFixed(1) || '4.5'}
                  </div>
                  {typeof activeHospital.copay === 'number' && (
                    <p className="text-sm font-black text-teal-600 dark:text-teal-400 mt-1">
                      {`$${activeHospital.copay.toLocaleString()}`}
                    </p>
                  )}
                </div>
              </div>

              {activeHospital.reason && (
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 mb-3">
                  {activeHospital.reason}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-500 transition-colors shadow-md shadow-teal-900/20"
                >
                  <Navigation size={14} /> {t.openMaps}
                </a>
                {activeHospital.telefono && (
                  <a
                    href={`tel:${activeHospital.telefono}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-teal-300 transition-colors"
                  >
                    <Phone size={14} /> {t.call}
                  </a>
                )}
              </div>
            </div>
            )}

            <div className="flex-1 min-h-[1rem] shrink" aria-hidden />

            {/* Leyenda abajo-izquierda: suele chocar menos con “Datos del mapa” que suele ir abajo-derecha */}
            <div
              className={cn(
                MAP_OVERLAY_CARD,
                'pointer-events-auto mt-auto self-start max-w-[min(18rem,calc(100vw-2rem))] p-3 md:p-3.5',
              )}
            >
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                {t.legend}
              </p>
              {canInteractiveMap && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-snug">
                  {t.legendDesc}
                </p>
              )}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 w-3 h-3 bg-teal-600 rounded-full shrink-0" />
                  <span className="text-[11px] md:text-xs font-bold text-slate-700 dark:text-slate-300 leading-snug">
                    {t.inNetworkLegend}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 w-3 h-3 bg-slate-400 rounded-full shrink-0" />
                  <span className="text-[11px] md:text-xs font-bold text-slate-700 dark:text-slate-300 leading-snug">
                    {t.outNetworkLegend}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Móvil: leyenda y acciones fuera del mapa para no tapar tiles ni gestos */}
          <div className="lg:hidden shrink-0 space-y-2 px-2 pb-2 pt-1">
            {activeHospital && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 px-3 py-2 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide truncate">{t.recommended}</p>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{activeHospital.nombre}</p>
                </div>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  <Navigation size={12} /> {t.openMaps}
                </a>
              </div>
            )}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 px-3 py-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.legend}</p>
              {canInteractiveMap && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-snug">{t.legendDesc}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                    {t.inNetworkLegend}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                    {t.outNetworkLegend}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
