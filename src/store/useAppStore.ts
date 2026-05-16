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
  conversationId?: string | null;
}

export interface MapCenter {
  latitude: number;
  longitude: number;
}

export interface SelectedHospital {
  id?: string;
  nombre: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  latitude?: number;
  longitude?: number;
  score?: number;
  copay?: number;
  specialty?: string;
  reason?: string;
}

interface AppState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  selectedHospital: SelectedHospital | null;
  mapCenter: MapCenter | null;
  isDarkMode: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  customerId: string | null;
  user: {
    name: string;
    plan: string;
    email: string;
  };
  
  // Actions
  login: (token: string, user: any) => void;
  logout: () => void;
  updateUser: (data: Partial<AppState['user']>) => void;
  toggleDarkMode: () => void;
  setCurrentSession: (id: string) => void;
  createNewSession: () => void;
  addMessage: (sessionId: string, message: Message) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  deleteSession: (id: string) => void;
  setConversationId: (sessionId: string, conversationId: string) => void;
  setSelectedHospital: (hospital: SelectedHospital | null) => void;
  setMapCenter: (center: MapCenter | null) => void;
  }

  export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sessions: [],
      currentSessionId: null,
      selectedHospital: null,
      mapCenter: null,
      isDarkMode: false,
      isAuthenticated: false,
      accessToken: null,
      customerId: null,
      user: {
        name: 'Juan Delgado',
        plan: 'Salud Total Platinum',
        email: 'juan.delgado@email.com',
      },

      login: (token, user) => {
        localStorage.setItem('accessToken', token);
        set({ 
          isAuthenticated: true, 
          accessToken: token, 
          customerId: user.id,
          user: { ...user, name: user.name || 'Usuario', plan: user.plan || 'Plan Estándar' }
        });
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        set({
          isAuthenticated: false,
          accessToken: null,
          customerId: null,
          currentSessionId: null,
          selectedHospital: null,
          mapCenter: null,
        });
      },

      updateUser: (data) => set((state) => ({
        user: { ...state.user, ...data }
      })),

      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      setCurrentSession: (id) => set({ currentSessionId: id }),

      createNewSession: () => {
        const state = useAppStore.getState();
        const userName = state.user.name.split(' ')[0]; // Use first name
        const newId = Date.now().toString();
        const newSession: ChatSession = {
          id: newId,
          title: 'Nueva Consulta',
          messages: [
            {
              id: 'init-' + newId,
              role: 'assistant',
              content: `Hola ${userName}, soy tu asistente de salud. ¿Qué síntomas estás experimentando hoy?`,
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

      setConversationId: (sessionId, conversationId) => set((state) => ({
        sessions: state.sessions.map((s) => 
          s.id === sessionId ? { ...s, conversationId } : s
        )
      })),

      setSelectedHospital: (hospital) => set({ selectedHospital: hospital }),

      setMapCenter: (center) => set({ mapCenter: center }),
    }),
    {
      name: 'estimador-storage',
    }
  )
);
