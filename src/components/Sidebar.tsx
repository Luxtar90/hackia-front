import { useState } from 'react';
import { Activity, MessageSquare, Settings, CreditCard, LogOut, Trash2, Plus, Menu, Map as MapIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import { Modal } from './Modal';
import { translations } from '../lib/translations';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export function Sidebar({ isOpen, setIsOpen, activeView, setActiveView }: SidebarProps) {
  const { sessions, currentSessionId, setCurrentSession, createNewSession, deleteSession, user, logout, language } = useAppStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const t = translations[language].sidebar;

  const handleNewChat = () => {
    createNewSession();
    setActiveView('chat');
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setCurrentSession(id);
    setActiveView('chat');
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  const handleViewChange = (view: string) => {
    setActiveView(view);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Hamburger - Only visible on mobile when sidebar is closed */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg text-slate-600 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-200"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar Container */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-[60] bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 flex flex-col transition-all duration-300 ease-in-out lg:relative",
          isOpen ? "w-72 translate-x-0" : "w-0 lg:w-20 -translate-x-full lg:translate-x-0 shadow-none"
        )}
      >
        {/* Header/Logo - Now the toggle trigger */}
        <div className={cn(
          "h-[65px] flex items-center border-b border-slate-50 dark:border-slate-700 transition-all shrink-0 overflow-hidden", 
          isOpen ? "px-6" : "px-0 justify-center"
        )}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex items-center gap-3 group transition-all duration-300",
              !isOpen && "hover:scale-110 active:scale-90"
            )}
            title={isOpen ? t.collapse : t.expand}
          >
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0 group-hover:bg-teal-500 transition-colors">
              <Activity className="text-white w-5 h-5" />
            </div>
            {isOpen && (
              <span className="font-bold text-slate-800 dark:text-white tracking-tight animate-in fade-in slide-in-from-left-2 duration-500 whitespace-nowrap">
                {t.appTitle}<span className="text-teal-600">{t.appSubtitle}</span>
              </span>
            )}
          </button>
        </div>

        {/* User Profile Quick View */}
        <div className={cn("p-4 border-b border-slate-50 dark:border-slate-700 overflow-hidden shrink-0", !isOpen && "lg:block hidden")}>
          <div className={cn("flex items-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 transition-all", isOpen ? "gap-3 p-3" : "p-2 justify-center")}>
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            {isOpen && (
              <div className="overflow-hidden animate-in fade-in duration-500">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider truncate">
                  {user.plan === 'Salud Total Platinum' && language === 'Inglés' ? 'Salud Total Platinum' : (user.plan === 'Plan Estándar' && language === 'Inglés' ? 'Standard Plan' : user.plan)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar overflow-x-hidden", !isOpen && "lg:block hidden")}>
          {/* Main Menu */}
          <div>
            {isOpen && <p className="px-2 mb-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] animate-in fade-in duration-500">{t.mainMenu}</p>}
            <div className="space-y-1">
              <button 
                onClick={handleNewChat}
                className={cn(
                  "w-full flex items-center text-sm font-bold text-white bg-teal-600 rounded-xl transition-all shadow-lg shadow-teal-500/20 hover:bg-teal-700 active:scale-95 mb-4",
                  isOpen ? "gap-3 px-3 py-2.5" : "px-0 py-2.5 justify-center"
                )}
                title={t.newChat}
              >
                <Plus size={18} className="shrink-0" /> 
                {isOpen && <span className="animate-in fade-in duration-500">{t.newChat}</span>}
              </button>

              <button 
                onClick={() => handleViewChange('hospitals')}
                className={cn(
                  "w-full flex items-center text-sm font-semibold rounded-xl transition-all group",
                  activeView === 'hospitals' ? "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50",
                  isOpen ? "gap-3 px-3 py-2.5" : "px-0 py-2.5 justify-center"
                )}
                title={t.hospitals}
              >
                <MapIcon size={18} className={cn("shrink-0", activeView === 'hospitals' ? "text-teal-600" : "text-slate-400 group-hover:text-teal-500")} /> 
                {isOpen && <span className="animate-in fade-in duration-500">{t.hospitals}</span>}
              </button>
              
              <button 
                onClick={() => handleViewChange('insurance')}
                className={cn(
                  "w-full flex items-center text-sm font-semibold rounded-xl transition-all group",
                  activeView === 'insurance' ? "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50",
                  isOpen ? "gap-3 px-3 py-2.5" : "px-0 py-2.5 justify-center"
                )}
                title={t.insurance}
              >
                <CreditCard size={18} className={cn("shrink-0", activeView === 'insurance' ? "text-teal-600" : "text-slate-400 group-hover:text-teal-500")} /> 
                {isOpen && <span className="animate-in fade-in duration-500 whitespace-nowrap">{t.insurance}</span>}
              </button>

              <button 
                onClick={() => handleViewChange('settings')}
                className={cn(
                  "w-full flex items-center text-sm font-semibold rounded-xl transition-all group",
                  activeView === 'settings' ? "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50",
                  isOpen ? "gap-3 px-3 py-2.5" : "px-0 py-2.5 justify-center"
                )}
                title={t.settings}
              >
                <Settings size={18} className={cn("shrink-0", activeView === 'settings' ? "text-teal-600" : "text-slate-400 group-hover:text-teal-500")} /> 
                {isOpen && <span className="animate-in fade-in duration-500">{t.settings}</span>}
              </button>
            </div>
          </div>

          {/* History */}
          {sessions.length > 0 && (
            <div>
              {isOpen && <p className="px-2 mb-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] animate-in fade-in duration-500">{t.history}</p>}
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div key={session.id} className="group relative">
                    <button 
                      onClick={() => handleSelectSession(session.id)}
                      className={cn(
                        "w-full flex items-center text-sm rounded-xl transition-all group overflow-hidden",
                        currentSessionId === session.id && activeView === 'chat' ? "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 font-bold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 font-medium",
                        isOpen ? "gap-3 px-3 py-2.5 pr-10" : "px-0 py-2.5 justify-center"
                      )}
                      title={session.title === 'Nueva Consulta' ? t.newChat : session.title}
                    >
                      <MessageSquare size={16} className={cn("shrink-0", currentSessionId === session.id ? "text-teal-500" : "text-slate-400 group-hover:text-teal-500")} />
                      {isOpen && (
                        <span className="truncate text-left animate-in fade-in duration-500">
                          {session.title === 'Nueva Consulta' ? t.newChat : session.title}
                        </span>
                      )}
                    </button>
                    {isOpen && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSessionToDelete(session.id); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Footer Actions */}
        <div className={cn("p-4 border-t border-slate-50 dark:border-slate-700 overflow-hidden shrink-0", !isOpen && "lg:block hidden")}>
          <button 
            onClick={() => setShowLogoutModal(true)}
            className={cn(
              "w-full flex items-center text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors",
              isOpen ? "gap-3 px-3 py-2.5" : "px-0 py-2.5 justify-center"
            )} 
            title={t.logout}
          >
            <LogOut size={18} className="shrink-0" /> 
            {isOpen && <span className="animate-in fade-in duration-500">{t.logout}</span>}
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile - When full menu is open */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Custom Modals */}
      <Modal 
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={logout}
        variant="danger"
        title={t.logoutTitle}
        description={t.logoutDesc}
        confirmText={t.logout}
      />

      <Modal 
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={() => sessionToDelete && deleteSession(sessionToDelete)}
        variant="danger"
        title={t.deleteChatTitle}
        description={t.deleteChatDesc}
        confirmText={translations[language].common.delete}
      />
    </>
  );
}
