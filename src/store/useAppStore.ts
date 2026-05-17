import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations } from '../lib/translations';
import { chatApi, authApi } from '../lib/api';

export interface Hospital {
  name: string;
  /** Copago estimado del plan; ausente si el centro está fuera de red (OSM u otros). */
  copay?: number;
  distance: string;
  inNetwork: boolean;
  rating: number;
  isBestValue?: boolean;
  /** Recomendación prioritaria: en red + la especialidad pedida aparece en datos (backend). */
  isRecommendedRedSpecialty?: boolean;
  /** Ítems de cartera desde backend (Notion), para tarjetas del chat */
  portfolio?: string[];
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
  /** Si en datos (red + cartera) aparece algo compatible con la especialidad buscada */
  specialtyAligned?: boolean;
  /** Declarada en datos | no listada | sin datos en sistema */
  specialtyDataStatus?: 'declared' | 'not_listed' | 'unknown';
  /** Prioridad 1: ¿tiene la especialidad en los datos? */
  specialtyFocus?: string;
  /** Teléfono del centro si viene del maestro/OSM (contacto). */
  phone?: string;
  ciudad?: string;
  /** Resumen muy breve de Tavily/Serper en la tarjeta (si aplica). */
  specialtyWebHint?: string;
  /** Texto breve de cobertura / siguiente paso junto a la especialidad buscada. */
  specialtyCoverageNote?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'hospital_comparison';
  data?: Hospital[];
  timestamp: number | string;
  /** Aviso legal del backend cuando hubo enriquecimiento web (fragmentos de búsqueda). */
  webSearchDisclaimer?: string;
  /** Proveedor(es) de búsqueda web cuando hubo enriquecimiento del hospital recomendado. */
  webSearchProvider?: 'tavily' | 'serper' | 'tavily_serper';
  /** Cómo se ordenó la lista de hospitales en ese turno (para etiquetas en UI). */
  hospitalsSortedBy?: 'distance' | 'copay';
  /** Contexto de especialidad (red vs síntomas) para mostrar sobre las tarjetas */
  specialtyBanner?: string;
  /** Total de centros en la lista del backend (el chat muestra solo algunos). */
  hospitalsTotalCount?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number | string;
  conversationId?: string | null;
  loaded?: boolean;
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
  /** Especialidades RED + servicios maestro (solo si el chat mandó businessData). */
  portfolio?: string[];
}

interface AppState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  selectedHospital: SelectedHospital | null;
  mapCenter: MapCenter | null;
  /** Ubicación del usuario (GPS); no usar para centrar el mapa del hospital salvo que se quiera vista “mi ubicación”. */
  userLocation: MapCenter | null;
  isDarkMode: boolean;
  language: 'Español' | 'Inglés';
  isAuthenticated: boolean;
  accessToken: string | null;
  customerId: string | null;
  user: {
    name: string;
    plan: string;
    email: string;
  };
  
  // Actions
  login: (token: string, user: any) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<AppState['user']>) => void;
  setLanguage: (lang: 'Español' | 'Inglés') => void;
  toggleDarkMode: () => void;
  setCurrentSession: (id: string) => Promise<void>;
  createNewSession: () => void;
  addMessage: (sessionId: string, message: Message) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  deleteSession: (id: string) => Promise<void>;
  setConversationId: (sessionId: string, conversationId: string) => void;
  setSelectedHospital: (hospital: SelectedHospital | null) => void;
  setMapCenter: (center: MapCenter | null) => void;
  setUserLocation: (center: MapCenter | null) => void;
  fetchSessions: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      selectedHospital: null,
      mapCenter: null,
      userLocation: null,
      isDarkMode: false,
      language: 'Español',
      isAuthenticated: false,
      accessToken: null,
      customerId: null,
      user: {
        name: 'Juan Delgado',
        plan: 'Salud Total Platinum',
        email: 'juan.delgado@email.com',
      },

      fetchSessions: async () => {
        const { customerId, isAuthenticated } = get();
        if (!isAuthenticated || !customerId) return;

        try {
          const response = await chatApi.getHistory(customerId);
          if (response.success && response.data.sessions) {
            // Mantenemos los mensajes de las sesiones que ya estaban cargadas localmente
            const currentSessionsMap = new Map(get().sessions.map(s => [s.id, s]));
            
            const remoteSessions = response.data.sessions.map((s: any) => {
              const existing = currentSessionsMap.get(s.id);
              return {
                id: s.id,
                title: s.title,
                messages: existing?.messages || [],
                lastUpdated: s.lastUpdated,
                conversationId: s.id,
                loaded: existing?.loaded || false
              };
            });
            
            set({ sessions: remoteSessions });
          }
        } catch (error) {
          console.error('Error fetching sessions from Notion:', error);
        }
      },

      login: async (token, user) => {
        localStorage.setItem('accessToken', token);
        const lang = get().language;
        const defaultPlan = lang === 'Español' ? 'Plan Estándar' : 'Standard Plan';
        
        set({ 
          isAuthenticated: true, 
          accessToken: token, 
          customerId: user.patientId || user.id,
          user: { ...user, name: user.name || (lang === 'Español' ? 'Usuario' : 'User'), plan: user.plan || defaultPlan }
        });

        await get().fetchSessions();
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
          userLocation: null,
          sessions: [],
        });
      },

      updateUser: (data) => set((state) => ({
        user: { ...state.user, ...data }
      })),

      setLanguage: (lang) => {
        set({ language: lang });
        get().fetchSessions();
      },

      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      setCurrentSession: async (id) => {
        set({ currentSessionId: id });
        
        const state = get();
        const customerId = state.customerId;
        const session = state.sessions.find(s => s.id === id);

        if (session && !session.loaded && customerId && !id.startsWith('new-')) {
          try {
            const response = await chatApi.getHistory(customerId, id);
            if (response.success && response.data.messages) {
              const mappedMessages = response.data.messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
                type: (m.metadata && Object.keys(m.metadata).length > 0) ? 'hospital_comparison' : 'text',
                data: m.metadata?.businessData?.hospitals?.map((h: any) => ({
                  name: h.nombre || h.name,
                  inNetwork: h.inNetwork !== false,
                  copay: h.estimatedCopay || h.copay,
                  distance: h.distanceKm ? `${Math.round(h.distanceKm)} km` : 'N/A'
                }))
              }));

              set((state) => ({
                sessions: state.sessions.map(s => 
                  s.id === id ? { ...s, messages: mappedMessages, loaded: true } : s
                )
              }));
            }
          } catch (error) {
            console.error('Error loading session history:', error);
          }
        }
      },

      createNewSession: () => {
        const state = get();
        const t = translations[state.language].sidebar;
        const userName = state.user.name.split(' ')[0];
        const newId = 'new-' + Date.now().toString();
        const newSession: ChatSession = {
          id: newId,
          title: t.newChat,
          messages: [
            {
              id: 'init-' + newId,
              role: 'assistant',
              content: state.language === 'Español' 
                ? `Hola ${userName}, soy tu asistente de salud. ¿Qué síntomas estás experimentando hoy?`
                : `Hello ${userName}, I am your health assistant. What symptoms are you experiencing today?`,
              timestamp: Date.now(),
            }
          ],
          lastUpdated: Date.now(),
          loaded: true
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

      deleteSession: async (id) => {
        const { customerId } = get();
        if (customerId && !id.startsWith('new-')) {
          try {
            await chatApi.deleteSession(customerId, id);
          } catch (error) {
            console.error('Error deleting session from Notion:', error);
          }
        }
        
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          currentSessionId: state.currentSessionId === id ? null : state.currentSessionId
        }));
      },

      setConversationId: (sessionId, conversationId) => set((state) => ({
        sessions: state.sessions.map((s) => 
          s.id === sessionId ? { ...s, id: conversationId, conversationId, loaded: true } : s
        ),
        currentSessionId: state.currentSessionId === sessionId ? conversationId : state.currentSessionId
      })),

      setSelectedHospital: (hospital) => set({ selectedHospital: hospital }),

      setMapCenter: (center) => set({ mapCenter: center }),

      setUserLocation: (center) => set({ userLocation: center }),

      deleteAccount: async () => {
        try {
          await authApi.deleteAccount();
          get().logout();
        } catch (error) {
          console.error('Error deleting account:', error);
          throw error;
        }
      }
    }),
    {
      name: 'estimador-storage',
      partialize: (state) => ({
        // Hybrid: Persistimos sesiones para carga instantánea, pero se sincronizan con Notion
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        /** Evita modo catálogo tras F5: sin coords persistidas el primer fetch iba sin GPS → solo maestro Notion (“todos en red”). */
        userLocation: state.userLocation,
        isDarkMode: state.isDarkMode,
        language: state.language,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        customerId: state.customerId,
        user: state.user,
      }),
    }
  )
);
