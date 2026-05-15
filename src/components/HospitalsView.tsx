import { MapPin, Navigation, Phone, Star, Search, Menu } from 'lucide-react';
import { cn } from '../lib/utils';

interface HospitalsViewProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export function HospitalsView({ isSidebarOpen, setIsSidebarOpen }: HospitalsViewProps) {
  const nearbyHospitals = [
    { 
      name: 'Clínica Alemana', 
      address: 'Vitacura 5951, Santiago', 
      distance: '2.5 km', 
      rating: 4.8, 
      open: true,
      inNetwork: true,
      phone: '+56 2 2210 1111'
    },
    { 
      name: 'Hospital Clínico UC', 
      address: 'Marcoleta 367, Santiago', 
      distance: '4.1 km', 
      rating: 4.6, 
      open: true,
      inNetwork: true,
      phone: '+56 2 2354 3000'
    },
    { 
      name: 'Clínica Las Condes', 
      address: 'Estoril 450, Las Condes', 
      distance: '6.8 km', 
      rating: 4.9, 
      open: false,
      inNetwork: false,
      phone: '+56 2 2610 8000'
    },
  ];

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
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white transition-all shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {nearbyHospitals.map((hospital, idx) => (
              <div 
                key={idx} 
                className="bg-white dark:bg-slate-800 p-4 rounded-[24px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-teal-300 dark:hover:border-teal-500 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {hospital.name}
                  </h4>
                  {hospital.inNetwork && (
                    <span className="text-[9px] bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full font-bold uppercase">En Red</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-3">
                  <MapPin size={12} /> {hospital.address}
                </p>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" /> {hospital.rating}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400">
                    {hospital.distance}
                  </div>
                  <div className={cn(
                    "text-[11px] font-bold uppercase tracking-wider",
                    hospital.open ? "text-green-500" : "text-red-500"
                  )}>
                    {hospital.open ? 'Abierto' : 'Cerrado'}
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
            ))}
          </div>
        </div>

        {/* Main Area: Google Map */}
        <div className="flex-1 relative bg-slate-100 dark:bg-slate-950">
          {/* Iframe for Google Maps (Mocking current location) */}
          <iframe
            title="Google Maps"
            className="w-full h-full grayscale-[0.2] dark:invert-[0.9] dark:hue-rotate-180 opacity-90"
            frameBorder="0"
            scrolling="no"
            marginHeight={0}
            marginWidth={0}
            src="https://maps.google.com/maps?width=100%25&height=600&hl=es&q=hospitales%20cercanos&t=&z=14&ie=UTF8&iwloc=B&output=embed"
          />
          
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
