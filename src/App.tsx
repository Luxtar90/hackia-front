import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatInterface } from './components/ChatInterface'
import { InsuranceView } from './components/InsuranceView'
import { SettingsView } from './components/SettingsView'
import { HospitalsView } from './components/HospitalsView'
import { ProfileView } from './components/ProfileView'
import { AuthView } from './components/AuthView'
import { useAppStore } from './store/useAppStore'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('chat');
  const { isDarkMode, createNewSession, isAuthenticated, fetchSessions, setCurrentSession } = useAppStore();

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
            onOpenHospitals={() => setActiveView('hospitals')}
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
            onOpenProfile={() => setActiveView('profile')}
          />
        );
      case 'profile':
        return <ProfileView isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} onBack={() => setActiveView('settings')} />;
      default:
        return (
          <ChatInterface
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            onOpenHospitals={() => setActiveView('hospitals')}
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
        setActiveView={setActiveView}
      />
      <main className="flex-1 h-full overflow-hidden relative flex flex-col">
        {renderActiveView()}
      </main>
    </div>
  )
}

export default App
