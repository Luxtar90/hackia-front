import { useEffect, useState } from 'react';
import { MapPin, Navigation, Phone, Star, Search, Menu, Loader } from 'lucide-react';
import { cn } from '../lib/utils';
import { hospitalApi } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

interface HospitalsViewProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

interface Hospital {
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
}

function buildMapUrl(selectedHospital: any, center: { latitude: number; longitude: number } | null) {
  if (center) {
    return `https://maps.google.com/maps?q=${center.latitude},${center.longitude}&z=16&output=embed`;
  }

  if (!selectedHospital) {
    return 'https://maps.google.com/maps?width=100%25&height=600&hl=es&q=hospitales%20cercanos&t=&z=14&ie=UTF8&iwloc=B&output=embed';
  }

  const query = [selectedHospital.nombre, selectedHospital.direccion, selectedHospital.ciudad]
    .filter(Boolean)
    .join(', ');

  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

function buildMapsLink(selectedHospital: any, center: { latitude: number; longitude: number } | null) {
  if (center) {
    return `https://www.google.com/maps/search/?api=1&query=${center.latitude},${center.longitude}`;
  }

  if (!selectedHospital) {
    return 'https://www.google.com/maps/search/?api=1&query=hospitales+cercanos';
  }

  const query = [selectedHospital.nombre, selectedHospital.direccion, selectedHospital.ciudad]
    .filter(Boolean)
    .join(', ');

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function HospitalsView({ isSidebarOpen, setIsSidebarOpen }: HospitalsViewProps) {
  const [nearbyHospitals, setNearbyHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedHospital, mapCenter, setSelectedHospital, setMapCenter } = useAppStore();

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await hospitalApi.getNearbyHospitals(undefined, undefined, 50);
        if (response.success && response.data.hospitales) {
          setNearbyHospitals(response.data.hospitales);
        } else {
          setError('No se pudieron cargar los hospitales');
        }
      } catch (err) {
        console.error('Error fetching hospitals:', err);
        setError('Error al cargar los hospitales. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, []);

  const filteredHospitals = nearbyHospitals.filter(h => 
    h.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.ciudad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedHospitalFromList = selectedHospital
    ? filteredHospitals.find((hospital) => hospital.id === selectedHospital.id || hospital.nombre === selectedHospital.nombre) || null
    : null;

  const activeHospital: any = selectedHospitalFromList || selectedHospital || filteredHospitals[0] || null;
  const mapUrl = buildMapUrl(activeHospital, mapCenter);
  const mapsLink = buildMapsLink(activeHospital, mapCenter);

  const handleSelectHospital = (hospital: Hospital) => {
    setSelectedHospital({
      id: hospital.id,
      nombre: hospital.nombre,
      ciudad: hospital.ciudad,
      direccion: hospital.direccion,
      telefono: hospital.telefono,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      score: hospital.rating,
      reason: `Hospital seleccionado desde la lista en ${hospital.ciudad}`,
    });

    if (hospital.latitude !== undefined && hospital.longitude !== undefined) {
      setMapCenter({ latitude: hospital.latitude, longitude: hospital.longitude });
    } else {
      setMapCenter(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
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
        <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">Hospitales Cercanos</h2>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar: List of Hospitals */}
        <div className="w-full lg:w-96 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Buscar clínica u hospital..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white transition-all shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader className="animate-spin text-teal-600 mx-auto mb-2" size={32} />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Cargando hospitales...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center p-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            ) : filteredHospitals.length === 0 ? (
              <div className="text-center p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">No se encontraron hospitales</p>
              </div>
            ) : (
              filteredHospitals.map((hospital, idx) => (
                <div 
                  key={hospital.id || idx} 
                  onClick={() => handleSelectHospital(hospital)}
                  className={cn(
                    "bg-white dark:bg-slate-800 p-4 rounded-[24px] border shadow-sm hover:shadow-md transition-all cursor-pointer group",
                    (selectedHospital?.id && hospital.id === selectedHospital.id) || selectedHospital?.nombre === hospital.nombre
                      ? "border-teal-400 ring-2 ring-teal-500/20"
                      : "border-slate-100 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {hospital.nombre}
                    </h4>
                    <span className="text-[9px] bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full font-bold uppercase">En Red</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-3">
                    <MapPin size={12} /> {hospital.ciudad}
                  </p>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" /> {hospital.rating?.toFixed(1) || '4.5'}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400">
                      {hospital.distancia ? `${hospital.distancia.toFixed(1)} km` : 'Distancia N/A'}
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-green-500">
                      Abierto
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center justify-center gap-2 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-teal-600 hover:text-white transition-all">
                      <Navigation size={12} /> Cómo llegar
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                      <Phone size={12} /> Llamar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Area: Google Map */}
        <div className="flex-1 relative bg-slate-100 dark:bg-slate-950">
          {/* Iframe for Google Maps */}
          <iframe
            title="Google Maps"
            className="w-full h-full grayscale-[0.2] dark:invert-[0.9] dark:hue-rotate-180 opacity-90"
            frameBorder="0"
            scrolling="no"
            marginHeight={0}
            marginWidth={0}
            src={mapUrl}
          />

          {activeHospital && (
            <div className="absolute top-6 left-6 right-6 md:right-auto md:max-w-md glass p-4 rounded-2xl border border-white/20 shadow-2xl">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1">Hospital recomendado</p>
                  <h3 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{activeHospital.nombre}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin size={12} /> {activeHospital.direccion || activeHospital.ciudad || 'Dirección no disponible'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-yellow-500">
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    {activeHospital.rating?.toFixed(1) || '4.5'}
                  </div>
                  {typeof activeHospital.copay === 'number' && (
                    <p className="text-sm font-black text-teal-600 dark:text-teal-400 mt-1">${activeHospital.copay.toLocaleString()}</p>
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
                  href={mapsLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-500 transition-colors"
                >
                  <Navigation size={14} /> Abrir en Google Maps
                </a>
                {activeHospital.telefono && (
                  <a
                    href={`tel:${activeHospital.telefono}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-teal-300 transition-colors"
                  >
                    <Phone size={14} /> Llamar
                  </a>
                )}
              </div>
            </div>
          )}
          
          {/* Legend Overlay */}
          <div className="absolute bottom-6 right-6 glass p-4 rounded-2xl hidden md:block border border-white/20 shadow-2xl">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Leyenda</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-teal-600 rounded-full" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tu Red Platinum</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-400 rounded-full" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Fuera de Red</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
