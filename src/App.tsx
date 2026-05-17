import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatInterface } from './components/ChatInterface'
import { InsuranceView } from './components/InsuranceView'
import { SettingsView } from './components/SettingsView'
import { HospitalsView } from './components/HospitalsView'
import { ProfileView } from './components/ProfileView'
import { UsersView } from './components/UsersView'
import { AuthView } from './components/AuthView'
import { useAppStore } from './store/useAppStore'

const APP_VIEWS = ['chat', 'hospitals', 'insurance', 'settings', 'profile', 'users'] as const
type AppView = (typeof APP_VIEWS)[number]

function coerceAppView(view: string): AppView {
  return (APP_VIEWS as readonly string[]).includes(view) ? (view as AppView) : 'chat'
}

function viewFromHash(hash: string): AppView {
  const segment = hash.replace(/^#\/?/, '').split('/')[0]?.trim() ?? ''
  return coerceAppView(segment || 'chat')
}

function hashForView(view: AppView): string {
  return `#/${view}`
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<AppView>(() =>
    typeof window !== 'undefined' ? viewFromHash(window.location.hash) : 'chat',
  );
  const { isDarkMode, createNewSession, isAuthenticated, fetchSessions, setCurrentSession } = useAppStore();

  const navigateView = useCallback((view: string) => {
    const next = coerceAppView(view)
    setActiveView(next)
    const h = hashForView(next)
    if (window.location.hash !== h) {
      window.location.hash = h
    }
  }, [])

  useEffect(() => {
    const onHashChange = () => setActiveView(viewFromHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Initialize and fetch remote history sequentially
  useEffect(() => {
    const initApp = async () => {
      if (isAuthenticated) {
        // 1. Cargamos el historial de la nube
        await fetchSessions();
        
        // 2. Comprobamos el estado después de la carga
        const updatedState = useAppStore.getState();
        if (updatedState.sessions.length === 0) {
          createNewSession();
        } else if (!updatedState.currentSessionId) {
          // Si hay sesiones pero ninguna activa, seleccionamos la más reciente
          await setCurrentSession(updatedState.sessions[0].id);
        }
      }
    };
    
    initApp();
  }, [isAuthenticated]);

  // Sync dark mode class with HTML element
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (!isAuthenticated) {
    return <AuthView />;
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'chat':
        return (
          <ChatInterface
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            onOpenHospitals={() => navigateView('hospitals')}
          />
        );
      case 'hospitals':
        return <HospitalsView isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />;
      case 'insurance':
        return <InsuranceView isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />;
      case 'settings':
        return (
          <SettingsView 
            isSidebarOpen={isSidebarOpen} 
            setIsSidebarOpen={setIsSidebarOpen} 
            onOpenProfile={() => navigateView('profile')}
          />
        );
      case 'profile':
        return <ProfileView isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} onBack={() => navigateView('settings')} />;
      case 'users':
        return <UsersView isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />;
      default:
        return (
          <ChatInterface
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            onOpenHospitals={() => navigateView('hospitals')}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden transition-colors duration-300">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        activeView={activeView}
        setActiveView={navigateView}
      />
      <main className="flex-1 h-full min-h-0 overflow-hidden relative flex flex-col">
        {renderActiveView()}
      </main>
    </div>
  )
}

export default App
