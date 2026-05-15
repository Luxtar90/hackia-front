import { User, Bell, Lock, Eye, Moon, Sun, Globe, Menu } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface SettingsViewProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export function SettingsView({ isSidebarOpen, setIsSidebarOpen }: SettingsViewProps) {
  const { isDarkMode, toggleDarkMode, user } = useAppStore();

  const sections = [
    {
      title: 'Perfil',
      items: [
        { icon: User, label: 'Información Personal', value: user.name, type: 'link' },
        { icon: Globe, label: 'Idioma', value: 'Español (ES)', type: 'link' },
      ]
    },
    {
      title: 'Preferencias',
      items: [
        { 
          icon: isDarkMode ? Moon : Sun, 
          label: 'Modo Oscuro', 
          value: isDarkMode ? 'Activado' : 'Desactivado', 
          type: 'toggle',
          action: toggleDarkMode 
        },
        { icon: Bell, label: 'Notificaciones', value: 'Activadas', type: 'link' },
      ]
    },
    {
      title: 'Seguridad',
      items: [
        { icon: Lock, label: 'Cambiar Contraseña', value: '********', type: 'link' },
        { icon: Eye, label: 'Privacidad de Datos', value: 'Protegido', type: 'link' },
      ]
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Integrated Header */}
      <header className="h-[65px] px-4 md:px-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 shrink-0">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu size={20} />
          </button>
        )}
        <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">Configuración</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-8 pb-12">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Configuración</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Administra tu cuenta y preferencias de la aplicación.</p>
          </div>

          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-3">
              <h3 className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{section.title}</h3>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700">
                {section.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/30 group-hover:text-teal-600 transition-colors">
                        <item.icon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.label}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.value}</p>
                      </div>
                    </div>
                    
                    {item.type === 'toggle' ? (
                      <button 
                        onClick={item.action}
                        className={`w-11 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDarkMode ? 'left-6' : 'left-1'}`} />
                      </button>
                    ) : (
                      <button className="text-slate-300 hover:text-teal-600 transition-colors">
                        <Globe size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-4">
            <button className="w-full py-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold text-sm rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all">
              Eliminar Cuenta
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4 font-medium uppercase tracking-widest">
              Estimador Agéntico v1.0.4
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
