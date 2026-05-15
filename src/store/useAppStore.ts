import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Hospital {
  name: string;
  copay: number;
  distance: string;
  inNetwork: boolean;
  rating: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'hospital_comparison';
  data?: Hospital[];
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
}

interface AppState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isDarkMode: boolean;
  isAuthenticated: boolean;
  user: {
    name: string;
    plan: string;
    email: string;
  };
  
  // Actions
  logout: () => void;
  toggleDarkMode: () => void;
  setCurrentSession: (id: string) => void;
  createNewSession: () => void;
  addMessage: (sessionId: string, message: Message) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  deleteSession: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sessions: [],
      currentSessionId: null,
      isDarkMode: false,
      isAuthenticated: false,
      user: {
        name: 'Juan Delgado',
        plan: 'Salud Total Platinum',
        email: 'juan.delgado@email.com',
      },

      logout: () => set({ isAuthenticated: false, currentSessionId: null }),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      
      setCurrentSession: (id) => set({ currentSessionId: id }),
      
      createNewSession: () => {
        const newId = Date.now().toString();
        const newSession: ChatSession = {
          id: newId,
          title: 'Nueva Consulta',
          messages: [
            {
              id: 'init-' + newId,
              role: 'assistant',
              content: 'Hola Juan, soy tu asistente de salud. ¿Qué síntomas estás experimentando hoy?',
              timestamp: Date.now(),
            }
          ],
          lastUpdated: Date.now(),
        };
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newId,
        }));
      },

      addMessage: (sessionId, message) => set((state) => ({
        sessions: state.sessions.map((s) => 
          s.id === sessionId 
            ? { ...s, messages: [...s.messages, message], lastUpdated: Date.now() } 
            : s
        )
      })),

      updateSessionTitle: (sessionId, title) => set((state) => ({
        sessions: state.sessions.map((s) => 
          s.id === sessionId ? { ...s, title } : s
        )
      })),

      deleteSession: (id) => set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        currentSessionId: state.currentSessionId === id ? null : state.currentSessionId
      })),
    }),
    {
      name: 'estimador-storage',
    }
  )
);
