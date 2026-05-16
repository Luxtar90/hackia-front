import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Hospital, ArrowRight, Menu } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore, type Message, type SelectedHospital } from '../store/useAppStore';
import { chatApi } from '../lib/api';

interface ChatInterfaceProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenHospitals: () => void;
}

function extractCoordinates(hospital: any): { latitude?: number; longitude?: number } {
  const latitude = hospital?.latitude ?? hospital?.latitud ?? hospital?.lat ?? hospital?.coords?.latitude;
  const longitude = hospital?.longitude ?? hospital?.longitud ?? hospital?.lng ?? hospital?.coords?.longitude;

  const parsedLatitude = typeof latitude === 'string' ? Number(latitude) : latitude;
  const parsedLongitude = typeof longitude === 'string' ? Number(longitude) : longitude;

  return {
    latitude: Number.isFinite(parsedLatitude) ? parsedLatitude : undefined,
    longitude: Number.isFinite(parsedLongitude) ? parsedLongitude : undefined,
  };
}

export function ChatInterface({ isSidebarOpen, setIsSidebarOpen, onOpenHospitals }: ChatInterfaceProps) {
  const { currentSessionId, sessions, addMessage, updateSessionTitle, customerId, setConversationId, setSelectedHospital, setMapCenter } = useAppStore();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !currentSessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    addMessage(currentSessionId, userMessage);
    
    if (messages.length === 1) {
      updateSessionTitle(currentSessionId, input.slice(0, 30) + (input.length > 30 ? '...' : ''));
    }

    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const response = await chatApi.sendMessage(currentInput, customerId || undefined, currentSession?.conversationId || undefined);
      if (response.success) {
        const { assistantMessage, businessData, conversationId } = response.data;
        const analysis = response.data.analysis;
        
        // Guardar el conversationId para futuras peticiones
        if (conversationId && currentSessionId) {
          setConversationId(currentSessionId, conversationId);
        }
        
        let hospitalsData = [];
        const recommendedHospital = businessData.recommendedHospital || businessData.hospitals?.[0];
        if (recommendedHospital || businessData.hospitals.length > 0) {
          const hospitals = businessData.hospitals.length > 0 ? businessData.hospitals : [recommendedHospital];
          hospitalsData = hospitals.map((h: any) => ({
            name: h.nombre || 'Hospital',
            copay: businessData.coverage.estimatedCopay || 0,
            distance: h.ciudad || 'N/A',
            inNetwork: true,
            rating: h.score || 4.5,
            latitude: h.latitude ?? h.latitud ?? h.lat,
            longitude: h.longitude ?? h.longitud ?? h.lng,
          }));

          const selectedHospital: SelectedHospital = {
            id: recommendedHospital?.id || recommendedHospital?.idHospital || recommendedHospital?.nombre,
            nombre: recommendedHospital?.nombre || hospitalsData[0]?.name || 'Hospital recomendado',
            ciudad: recommendedHospital?.ciudad,
            direccion: recommendedHospital?.direccion,
            telefono: recommendedHospital?.telefono,
            score: recommendedHospital?.score,
            copay: businessData.coverage?.estimatedCopay,
            specialty: analysis?.specialty,
            reason: analysis?.summary || assistantMessage,
            ...extractCoordinates(recommendedHospital),
          };

          setSelectedHospital(selectedHospital);
          if (selectedHospital.latitude !== undefined && selectedHospital.longitude !== undefined) {
            setMapCenter({ latitude: selectedHospital.latitude, longitude: selectedHospital.longitude });
          } else {
            setMapCenter(null);
          }

          onOpenHospitals();
        }

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: assistantMessage,
          timestamp: Date.now(),
          type: hospitalsData.length > 0 ? 'hospital_comparison' : 'text',
          data: hospitalsData.length > 0 ? hospitalsData : undefined
        };
        addMessage(currentSessionId, botMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.',
        timestamp: Date.now(),
      };
      addMessage(currentSessionId, errorMessage);
    } finally {
      setIsTyping(false);
    }
  };

  if (!currentSessionId || !currentSession) {
    return (
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900">
        <header className="h-[65px] px-4 md:px-6 flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 shrink-0">
          {!isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu size={20} />
            </button>
          )}
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">Asistente de Salud</h2>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center text-teal-600 mb-6">
            <Bot size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Bienvenido de nuevo</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs leading-relaxed">
            Selecciona una consulta anterior o inicia una nueva para estimar tus costos médicos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 overflow-hidden relative">
      {/* Integrated Header */}
      <header className="h-[65px] px-4 md:px-6 flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20 shrink-0">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu size={20} />
          </button>
        )}
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">{currentSession.title}</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">IA Activa</span>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth custom-scrollbar">
        <div className="max-w-3xl mx-auto w-full space-y-8">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", m.role === 'user' ? "justify-end" : "justify-start")}>
              <div className={cn("flex gap-4 max-w-[90%] md:max-w-[80%]", m.role === 'user' && "flex-row-reverse")}>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm", m.role === 'assistant' ? "bg-teal-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400")}>
                  {m.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                </div>
                <div className="space-y-4">
                  <div className={cn("rounded-2xl px-5 py-3.5 shadow-sm border", m.role === 'assistant' ? "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border-slate-100 dark:border-slate-700" : "bg-teal-600 text-white rounded-tr-none border-teal-500")}>
                    <p className="text-sm md:text-[15px] leading-relaxed font-medium">{m.content}</p>
                  </div>

                  {m.type === 'hospital_comparison' && (
                    <div className="grid grid-cols-1 gap-4 mt-2">
                      {m.data?.map((hospital: any, idx: number) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:border-teal-400 dark:hover:border-teal-500 transition-all shadow-sm hover:shadow-md group">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-slate-900 dark:text-white">{hospital.name}</h4>
                                {hospital.inNetwork && (
                                  <span className="text-[9px] bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">En Red</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                                <Hospital size={14} className="text-slate-400" /> {hospital.distance} • ⭐ {hospital.rating}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest mb-1">Copago Estimado</p>
                              <p className="text-xl font-extrabold text-teal-600 dark:text-teal-400">${hospital.copay.toLocaleString()}</p>
                            </div>
                          </div>
                          <button className="w-full py-3 bg-slate-50 dark:bg-slate-900/50 group-hover:bg-teal-600 group-hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 group-hover:border-teal-600">
                            Reservar Cita <ArrowRight size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex gap-4">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
                  <Bot size={20} />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-3.5 border border-slate-100 dark:border-slate-700 flex gap-1.5 items-center h-11">
                  <div className="w-1.5 h-1.5 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800 shrink-0">
        <div className="max-w-3xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribe tus síntomas aquí..."
            className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl pl-5 pr-14 py-4 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 resize-none text-sm md:text-base min-h-[60px] max-h-32 shadow-sm transition-all bg-slate-50/30 dark:bg-slate-800/30 dark:text-white"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={cn(
              "absolute right-2.5 bottom-2.5 w-11 h-11 rounded-xl flex items-center justify-center transition-all", 
              input.trim() ? "bg-teal-600 text-white shadow-lg shadow-teal-200 hover:scale-105 active:scale-95" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            )}
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-4 uppercase tracking-[0.2em] font-bold">
          Asistente de Copagos IA • Seguro y Privado
        </p>
      </div>
    </div>
  );
}
