import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatInterface } from './components/ChatInterface'
import { InsuranceView } from './components/InsuranceView'
import { SettingsView } from './components/SettingsView'
import { HospitalsView } from './components/HospitalsView'
import { AuthView } from './components/AuthView'
import { useAppStore } from './store/useAppStore'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('chat');
  const { isDarkMode, createNewSession, sessions, isAuthenticated } = useAppStore();

  // Initialize first session if empty
  useEffect(() => {
    if (sessions.length === 0 && isAuthenticated) {
      createNewSession();
    }
  }, [isAuthenticated, sessions.length]);

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
        return <ChatInterface isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />;
      case 'hospitals':
        return <HospitalsView isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />;
      case 'insurance':
        return <InsuranceView isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />;
      case 'settings':
        return <SettingsView isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />;
      default:
        return <ChatInterface isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />;
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
