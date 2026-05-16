import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Hospital as HospitalIcon, Menu, MapPin, Check, Loader2, Phone, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import type { Message, SelectedHospital, Hospital as ChatHospitalCard } from '../store/useAppStore';
import { chatApi, type ChatProgressEvent } from '../lib/api';
import { buildGoogleDirectionsUrl, coordsFromHospitalLike, normalizeCoordinates } from '../lib/geo';

/** Misma leyenda que devuelve el backend en businessData.estimationLegalNotice */
const COPAY_LEGAL_NOTICE =
  'Los montos son estimaciones informativas según los datos del plan en el sistema; no constituyen garantía de cobro. El copago y la cobertura definitivos los confirman la aseguradora y el prestador al momento del servicio.';

/** Cuántas tarjetas de hospital se muestran en el chat; el resto se indica con enlace al mapa. */
const CHAT_HOSPITAL_PREVIEW = 4;

function formatHospitalRating(score: number | undefined): number {
  const n = typeof score === 'number' && Number.isFinite(score) ? score : 4.5;
  return Math.round(n * 10) / 10;
}

/** Teléfono usable como enlace (datos OSM / Notion). */
function phoneTelLink(raw: string | undefined): { href: string; label: string } | null {
  if (!raw?.trim()) return null;
  const label = raw.trim();
  const digits = label.replace(/\D/g, '');
  if (digits.length < 7) return null;
  const href = label.startsWith('+') ? `tel:${label.replace(/\s/g, '')}` : `tel:${digits}`;
  return { href, label };
}

function normEsp(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** Veredicto breve desde fragmentos web: sí parece / no claro / no seguro (sin textos largos). */
function evaluateWebSpecialtyHint(fragments: Array<{ texto?: string }>, needle: string | undefined): string {
  const raw = fragments
    .map((f) => (typeof f.texto === 'string' ? f.texto : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return '';

  const r = normEsp(raw);
  const n = needle?.trim();
  const mentionsNeedle =
    !!n && n.length >= 2 && specialtyNeedleVariants(n).some((v) => v.length >= 3 && r.includes(v));

  if (mentionsNeedle && n) {
    return `Por lo que muestra la búsqueda pública: parece que sí ofrecen «${n}». No es una confirmación del centro; conviene llamar para validar.`;
  }

  const commas = (raw.match(/,/g) ?? []).length;
  const bullets = (raw.match(/\s[–-]\s/g) ?? []).length;
  const bigCatalog = commas >= 5 || bullets >= 4 || raw.length > 240;

  if (bigCatalog && n) {
    return `Por lo público en internet hay un listado amplio de servicios y no destaca claro «${n}» en lo que vimos. No estoy seguro; llama al hospital.`;
  }

  if (bigCatalog && !n) {
    return 'Por lo público en internet hay muchos servicios listados; no puedo concluir sobre tu caso sin hablar con el centro.';
  }

  if (n && raw.length < 220 && !mentionsNeedle) {
    return `Por lo encontrado en internet no queda claro si tienen «${n}». No estoy seguro; confirma por teléfono.`;
  }

  const clip = raw.slice(0, 95).trim().replace(/\s+\S*$/, '');
  return n
    ? `Lo público en internet (${clip}…) no permite asegurar «${n}». No estoy seguro; confirma con el hospital.`
    : `Información pública muy breve (${clip}…). Confirma con el hospital.`;
}

/** Variantes comunes (ES/EN) para detectar la misma especialidad en textos de cartera/red. */
function specialtyNeedleVariants(needle: string): string[] {
  const n = normEsp(needle);
  const out = new Set<string>();
  if (n.length >= 3) out.add(n);

  const groups = [
    ['neurology', 'neurologia', 'neuro'],
    ['cardiology', 'cardiologia', 'cardio'],
    ['dermatology', 'dermatologia'],
    ['gynecology', 'ginecologia', 'obstetricia'],
    ['pediatrics', 'pediatria'],
    ['orthopedics', 'ortopedia', 'traumatologia'],
    ['psychiatry', 'psiquiatria'],
    ['ophthalmology', 'oftalmologia'],
    ['urology', 'urologia'],
    ['endocrinology', 'endocrinologia'],
    ['gastroenterology', 'gastroenterologia'],
    ['pulmonology', 'neumologia', 'pulmonologia'],
    ['nephrology', 'nefrologia'],
    ['rheumatology', 'reumatologia'],
    ['oncology', 'oncologia'],
    ['general', 'medicina general', 'medicina familiar'],
  ];

  for (const g of groups) {
    const gn = g.map((x) => normEsp(x)).filter((x) => x.length >= 3);
    if (gn.some((x) => n.includes(x) || x.includes(n))) gn.forEach((x) => out.add(x));
  }
  return [...out];
}

/** ¿Alguna lista textual menciona la especialidad buscada? */
function portfolioMentionsSpecialty(portfolio: string[], needle: string | undefined): boolean {
  if (!needle?.trim()) return false;
  const needles = specialtyNeedleVariants(needle);
  if (needles.length === 0) return false;
  return portfolio.some((p) => {
    const x = normEsp(p);
    if (x.length < 3) return false;
    return needles.some((n) => x.includes(n) || n.includes(x));
  });
}

/** Une especialidades en red + cartera y comprueba si aparece la especialidad (p. ej. cardiología). */
function hospitalListsMentionSpecialty(especialidadesRed: string[], portfolio: string[], needle: string | undefined): boolean {
  const merged = [...new Set([...(especialidadesRed ?? []), ...(portfolio ?? [])])];
  return portfolioMentionsSpecialty(merged, needle);
}

interface ChatInterfaceProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenHospitals: () => void;
}

export function ChatInterface({ isSidebarOpen, setIsSidebarOpen, onOpenHospitals }: ChatInterfaceProps) {
  const {
    currentSessionId,
    sessions,
    addMessage,
    updateSessionTitle,
    customerId,
    setConversationId,
    setSelectedHospital,
    setMapCenter,
    setUserLocation,
    userLocation,
  } = useAppStore();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  /** Pasos reales emitidos por el backend (NDJSON) mientras se procesa el mensaje. */
  const [progressSteps, setProgressSteps] = useState<ChatProgressEvent[]>([]);
  const [geo, setGeo] = useState<{ latitude: number; longitude: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const n = normalizeCoordinates(pos.coords.latitude, pos.coords.longitude);
        if (!n) return;
        setGeo({ latitude: n.latitude, longitude: n.longitude });
        setUserLocation({ latitude: n.latitude, longitude: n.longitude });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 120_000, timeout: 25_000 },
    );
  }, [setUserLocation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, progressSteps]);

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
    setProgressSteps([]);

    try {
      const response = await chatApi.sendMessage(
        currentInput,
        customerId || undefined,
        currentSession?.conversationId || undefined,
        geo ? { latitude: geo.latitude, longitude: geo.longitude } : undefined,
        (event) => setProgressSteps((prev) => [...prev, event]),
      );
      if (response.success) {
        const { assistantMessage, businessData, conversationId } = response.data;
        const analysis = response.data.analysis;
        
        // Guardar el conversationId para futuras peticiones
        if (conversationId && currentSessionId) {
          setConversationId(currentSessionId, conversationId);
        }
        
        let hospitalsData: ChatHospitalCard[] = [];
        let specialtyBanner: string | undefined;
        let hospitalsTotalCount = 0;

        const suggestedSpecialty =
          businessData.symptomSuggestedSpecialty?.nombre ?? analysis?.specialty ?? '';
        const coverageSpecialty =
          businessData.specialty?.nombre ?? businessData.specialty?.idEspecialidad ?? '';
        const primaryCareFirst = businessData.primaryCareFirst;

        const apiHospitalList = Array.isArray(businessData.hospitals) ? businessData.hospitals : [];
        hospitalsTotalCount = apiHospitalList.length;

        const recommendedHospital = businessData.recommendedHospital || apiHospitalList[0];
        if (recommendedHospital || hospitalsTotalCount > 0) {
          if (coverageSpecialty) {
            if (
              primaryCareFirst &&
              suggestedSpecialty &&
              normEsp(suggestedSpecialty) !== normEsp(coverageSpecialty)
            ) {
              specialtyBanner = `Tu consulta apunta a «${suggestedSpecialty}»; la red mostrada prioriza ${coverageSpecialty} (valoración inicial). En cada tarjeta verás primero si ese hospital declara la especialidad que buscas en datos; después, si tu cobertura en red aplica.`;
            } else {
              specialtyBanner = `Especialidad buscada: ${coverageSpecialty}${suggestedSpecialty && normEsp(suggestedSpecialty) !== normEsp(coverageSpecialty) ? ` (también relacionamos «${suggestedSpecialty}» con tu mensaje)` : ''}. Primero fíjate si el centro la tiene en datos; la parte de cobertura y copago va aparte.`;
            }
          } else if (suggestedSpecialty) {
            specialtyBanner = `Especialidad orientadora: ${suggestedSpecialty}. Cada tarjeta indica si consta en datos del centro; luego el detalle de red y copago.`;
          }

          if (businessData.mixedNearbyWithOsm) {
            specialtyBanner = specialtyBanner
              ? `${specialtyBanner} Incluimos centros cercanos fuera de red (mapa abierto); el copago del plan solo cuenta donde dice «En red».`
              : 'Lista por cercanía: red y otros centros. Primero revisa la especialidad en datos; el copago del plan solo aplica en «En red».';
          }

          if (businessData.recommendedMatchesUserSpecialtyRequest && businessData.recommendedHospital?.nombre) {
            const lead = `Te recomendamos «${businessData.recommendedHospital.nombre}»: está en tu red y en datos coincide con lo que buscas. `;
            specialtyBanner = specialtyBanner ? `${lead}${specialtyBanner}` : lead.trim();
          }

          const recKey =
            businessData.recommendedHospital?.pageId || businessData.recommendedHospital?.idHospital;

          const hospitalsSlice =
            hospitalsTotalCount > 0
              ? apiHospitalList.slice(0, CHAT_HOSPITAL_PREVIEW)
              : recommendedHospital
                ? [recommendedHospital]
                : [];

          hospitalsData = hospitalsSlice.map((h: any, idx: number) => {
            const inNetwork = h.inNetwork !== false;
            const redList = Array.isArray(h.especialidadesRed) ? h.especialidadesRed : [];
            const portfolio = Array.isArray(h.portfolioForPlan) ? h.portfolioForPlan.slice(0, 12) : [];
            const hasListsInSystem = redList.length > 0 || portfolio.length > 0;

            const needle = suggestedSpecialty?.trim() ? suggestedSpecialty : coverageSpecialty;
            const hasSpecialtyInData = needle ? hospitalListsMentionSpecialty(redList, portfolio, needle) : false;

            const hKey = h.pageId || h.idHospital;
            const isRecommendedRedSpecialty = Boolean(
              businessData.recommendedMatchesUserSpecialtyRequest && recKey && hKey === recKey,
            );

            let specialtyDataStatus: 'declared' | 'not_listed' | 'unknown';
            let specialtyFocus: string | undefined;
            let specialtyCoverageNote: string | undefined;

            if (!needle?.trim()) {
              specialtyDataStatus = 'unknown';
              specialtyFocus =
                'No tengo una especialidad concreta para contrastar aquí; si la indicas, puedo orientarte mejor.';
              specialtyCoverageNote = inNetwork
                ? 'Centro en tu red según este turno; la cobertura del servicio la confirma tu aseguradora.'
                : 'Fuera de red en esta vista; el copago del plan no aplica en esta tarjeta.';
            } else if (hasSpecialtyInData) {
              specialtyDataStatus = 'declared';
              specialtyFocus = `Sí: entre lo que tenemos registrado aparece algo compatible con «${needle}».`;
              if (inNetwork) {
                specialtyCoverageNote =
                  primaryCareFirst && suggestedSpecialty && coverageSpecialty && normEsp(suggestedSpecialty) !== normEsp(coverageSpecialty)
                    ? `En tu red (contexto ${coverageSpecialty}). Si tu caso es «${suggestedSpecialty}», suele convenir canalización con el centro y el plan. El copago orientativo depende de tu póliza.`
                    : `En red para este contexto. Si el servicio está cubierto, el copago estimado es referencia (confirma con aseguradora y hospital).`;
              } else {
                specialtyCoverageNote =
                  'Fuera de red: aquí no aplica el copago del seguro en esta vista; confirma aranceles en el centro.';
              }
            } else if (hasListsInSystem) {
              specialtyDataStatus = 'not_listed';
              specialtyFocus = `«${needle}» no aparece entre lo que tenemos registrado de este centro; puede que igual la ofrezcan.`;
              specialtyCoverageNote = inNetwork
                ? primaryCareFirst && suggestedSpecialty && coverageSpecialty
                  ? `Centro en red (${coverageSpecialty}). Pregunta por «${needle}» y canalización; el copago aplica si tu plan cubre ese servicio aquí.`
                  : `En red para este contexto. Verifica en el hospital si atienden «${needle}» y cómo lo cubre tu plan.`
                : 'Fuera de red; sin copago estimado del plan en esta tarjeta.';
            } else {
              specialtyDataStatus = 'unknown';
              specialtyFocus = `No tengo información confirmada sobre si este centro atiende «${needle}».`;
              specialtyCoverageNote = inNetwork
                ? `En red: conviene llamar y preguntar si atienden «${needle}».`
                : 'Fuera de red. Llama para servicios y precios.';
            }

            const specialtyAligned = hasSpecialtyInData;

            const copayNum =
              inNetwork && typeof h.estimatedCopay === 'number' ? h.estimatedCopay : undefined;

            let specialtyFocusEffective = specialtyFocus;
            if (isRecommendedRedSpecialty && specialtyFocusEffective) {
              specialtyFocusEffective = `${specialtyFocusEffective} Prioridad: red + coincidencia en lo registrado.`;
            }

            let specialtyWebHint: string | undefined;
            const osmWeb = h.webEnrichment?.fragmentos;
            if (!hasListsInSystem && Array.isArray(osmWeb) && osmWeb.length > 0) {
              specialtyWebHint = evaluateWebSpecialtyHint(osmWeb, needle);
            }

            const row: ChatHospitalCard = {
              name: h.nombre || 'Hospital',
              distance:
                typeof h.distanceKm === 'number'
                  ? `${Math.round(h.distanceKm)} km`
                  : h.ciudad || 'N/A',
              inNetwork,
              rating: formatHospitalRating(typeof h.score === 'number' ? h.score : undefined),
              latitude: h.latitude ?? h.latitud ?? h.lat,
              longitude: h.longitude ?? h.longitud ?? h.lng,
              isBestValue: idx === 0,
              isRecommendedRedSpecialty,
              portfolio,
              distanceKm: typeof h.distanceKm === 'number' ? h.distanceKm : undefined,
              specialtyAligned,
              specialtyDataStatus,
              specialtyFocus: specialtyFocusEffective,
              specialtyWebHint,
              specialtyCoverageNote,
              phone:
                typeof h.contacto === 'string' && h.contacto.trim()
                  ? h.contacto.trim()
                  : typeof h.telefono === 'string' && h.telefono.trim()
                    ? h.telefono.trim()
                    : undefined,
              ciudad: typeof h.ciudad === 'string' ? h.ciudad : undefined,
            };
            if (copayNum !== undefined) row.copay = copayNum;
            return row;
          });

          const hospitalCoords = coordsFromHospitalLike(recommendedHospital);
          const selectedHospital: SelectedHospital = {
            id: recommendedHospital?.id || recommendedHospital?.idHospital || recommendedHospital?.nombre,
            nombre: recommendedHospital?.nombre || hospitalsData[0]?.name || 'Hospital recomendado',
            ciudad: recommendedHospital?.ciudad,
            direccion: recommendedHospital?.direccion,
            telefono: recommendedHospital?.telefono,
            score: recommendedHospital?.score,
            copay: typeof recommendedHospital?.estimatedCopay === 'number'
              ? recommendedHospital.estimatedCopay
              : businessData.coverage?.estimatedCopay,
            specialty: suggestedSpecialty || coverageSpecialty,
            reason: analysis?.summary || assistantMessage,
            portfolio:
              Array.isArray(recommendedHospital?.portfolioForPlan) && recommendedHospital.portfolioForPlan.length > 0
                ? recommendedHospital.portfolioForPlan.slice(0, 20)
                : Array.isArray(businessData.recommendedHospitalPortfolio)
                  ? businessData.recommendedHospitalPortfolio.slice(0, 20)
                  : [],
            ...(hospitalCoords ? { latitude: hospitalCoords.latitude, longitude: hospitalCoords.longitude } : {}),
          };

          setSelectedHospital(selectedHospital);
          setMapCenter(hospitalCoords ? { latitude: hospitalCoords.latitude, longitude: hospitalCoords.longitude } : null);
        }

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: assistantMessage,
          timestamp: Date.now(),
          type: hospitalsData.length > 0 ? 'hospital_comparison' : 'text',
          data: hospitalsData.length > 0 ? hospitalsData : undefined,
          webSearchDisclaimer: businessData.hospitalWebEnrichment?.avisoLegal,
          webSearchProvider: businessData.hospitalWebEnrichment?.proveedor,
          hospitalsSortedBy: businessData.hospitalsSortedBy,
          specialtyBanner,
          hospitalsTotalCount: hospitalsData.length > 0 ? hospitalsTotalCount : undefined,
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
      setProgressSteps([]);
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

                  {m.role === 'assistant' && (m.webSearchDisclaimer || m.webSearchProvider) && (
                    <div className="text-[10px] md:text-[11px] text-amber-800 dark:text-amber-300/95 leading-snug rounded-xl px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 space-y-1.5">
                      {m.webSearchProvider && (
                        <p className="font-semibold text-amber-900 dark:text-amber-200">
                          Búsqueda web con{' '}
                          <span className="tracking-wide">
                            {m.webSearchProvider === 'tavily'
                              ? 'Tavily'
                              : m.webSearchProvider === 'serper'
                                ? 'Serper (Google)'
                                : m.webSearchProvider === 'tavily_serper'
                                  ? 'Tavily + Serper (Google)'
                                  : m.webSearchProvider}
                          </span>
                          {' '}(cartera/servicios públicos del hospital recomendado; la IA usa esos fragmentos solo como apoyo).
                        </p>
                      )}
                      {m.webSearchDisclaimer ? <p>{m.webSearchDisclaimer}</p> : null}
                    </div>
                  )}

                  {m.type === 'hospital_comparison' && (
                    <div className="space-y-3 mt-2">
                      {m.specialtyBanner && (
                        <div className="rounded-xl border border-teal-200/80 dark:border-teal-900/50 bg-teal-50/60 dark:bg-teal-950/25 px-3 py-2.5 text-[11px] md:text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {m.specialtyBanner}
                        </div>
                      )}
                      {m.hospitalsTotalCount != null && m.hospitalsTotalCount > CHAT_HOSPITAL_PREVIEW && (
                        <div className="rounded-xl border border-slate-200/90 dark:border-slate-600 bg-slate-50/90 dark:bg-slate-900/50 px-3 py-2.5 text-[11px] md:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          Hay{' '}
                          <strong className="text-slate-800 dark:text-slate-100">
                            {m.hospitalsTotalCount - CHAT_HOSPITAL_PREVIEW}
                          </strong>{' '}
                          centro{m.hospitalsTotalCount - CHAT_HOSPITAL_PREVIEW === 1 ? '' : 's'} más en tu zona (red u otros). Ábrelos en el mapa con el botón inferior.
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-4">
                        {m.data?.map((hospital, idx) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:border-teal-400 dark:hover:border-teal-500 transition-all shadow-sm hover:shadow-md group flex flex-col gap-4"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-bold text-slate-900 dark:text-white break-words">{hospital.name}</h4>
                                  {hospital.inNetwork ? (
                                    <span className="text-[9px] bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                                      En red
                                    </span>
                                  ) : (
                                    <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                                      Fuera de red
                                    </span>
                                  )}
                                  {hospital.isRecommendedRedSpecialty && (
                                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/45 text-violet-900 dark:text-violet-200 border border-violet-200/80 dark:border-violet-800 shrink-0">
                                      Te recomendamos
                                    </span>
                                  )}
                                  {hospital.specialtyDataStatus === 'declared' && (
                                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/35 text-emerald-800 dark:text-emerald-300 shrink-0">
                                      Especialidad en datos
                                    </span>
                                  )}
                                  {hospital.specialtyDataStatus === 'not_listed' && (
                                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 shrink-0">
                                      No listada en datos
                                    </span>
                                  )}
                                  {hospital.specialtyDataStatus === 'unknown' && (
                                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                      Sin info confirmada
                                    </span>
                                  )}
                                  {hospital.isBestValue && (
                                    <span className="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                                      {m.hospitalsSortedBy === 'distance' ? 'Más cercano' : 'Mejor copago en red'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0 w-[5.5rem] sm:w-28 text-right border-l border-slate-100 dark:border-slate-600 pl-3 self-stretch flex flex-col justify-start">
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide mb-0.5 leading-tight">
                                  {hospital.inNetwork ? 'Copago est.' : 'Tu plan'}
                                </p>
                                {typeof hospital.copay === 'number' ? (
                                  <p className="text-lg font-extrabold text-teal-600 dark:text-teal-400 leading-none">
                                    ${hospital.copay.toLocaleString()}
                                  </p>
                                ) : (
                                  <>
                                    <p className="text-lg font-extrabold text-slate-400 dark:text-slate-500 leading-none">—</p>
                                    <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-1 leading-tight">
                                      Sin copago en esta vista
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                              <HospitalIcon size={14} className="text-slate-400 shrink-0" /> {hospital.distance} • ⭐{' '}
                              {typeof hospital.rating === 'number'
                                ? hospital.rating.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
                                : hospital.rating}
                            </p>

                            {(hospital.specialtyFocus || hospital.specialtyWebHint) && (
                              <div className="w-full rounded-xl border border-teal-200/70 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/20 px-3 py-2.5 space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-400">
                                  Especialidad buscada
                                </p>
                                {hospital.specialtyFocus ? (
                                  <p className="text-[11px] md:text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                                    {hospital.specialtyFocus}
                                  </p>
                                ) : null}
                                {hospital.specialtyWebHint ? (
                                  <p className="text-[11px] text-slate-800 dark:text-slate-200 leading-snug rounded-lg bg-white/70 dark:bg-slate-900/50 px-2.5 py-2 border border-teal-100/90 dark:border-teal-900/50">
                                    <span className="font-semibold text-teal-800 dark:text-teal-300">Desde la web: </span>
                                    {hospital.specialtyWebHint}
                                  </p>
                                ) : null}
                                {hospital.specialtyCoverageNote ? (
                                  <p className="text-[10px] md:text-[11px] text-slate-600 dark:text-slate-400 leading-snug pt-1 border-t border-teal-100/80 dark:border-teal-900/30">
                                    <span className="font-semibold text-slate-500 dark:text-slate-500">Cobertura: </span>
                                    {hospital.specialtyCoverageNote.replace(/^\s*Cobertura:\s*/i, '')}
                                  </p>
                                ) : null}
                              </div>
                            )}

                            {(hospital.portfolio?.length ?? 0) > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {hospital.portfolio!.slice(0, 6).map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-[9px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {hospital.portfolio!.length > 6 && (
                                  <span className="text-[9px] text-slate-400">+{hospital.portfolio!.length - 6}</span>
                                )}
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                              {(() => {
                                const tel = phoneTelLink(hospital.phone);
                                const userForDirections = geo ?? userLocation;
                                const mapsUrl = buildGoogleDirectionsUrl(hospital, userForDirections);
                                return (
                                  <>
                                    {tel ? (
                                      <a
                                        href={tel.href}
                                        className="flex-1 py-3 bg-slate-50 dark:bg-slate-900/50 group-hover:bg-teal-600 group-hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 group-hover:border-teal-600 no-underline"
                                      >
                                        <Phone size={16} className="shrink-0" aria-hidden />
                                        <span className="truncate">{tel.label}</span>
                                      </a>
                                    ) : null}
                                    <a
                                      href={mapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        'flex-1 py-3 bg-slate-50 dark:bg-slate-900/50 group-hover:bg-teal-600 group-hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 group-hover:border-teal-600 no-underline',
                                        !tel && 'w-full',
                                      )}
                                    >
                                      Ir
                                      <ExternalLink size={16} className="shrink-0" aria-hidden />
                                    </a>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenHospitals()}
                        className="w-full py-2.5 px-4 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/80 dark:bg-teal-950/30 text-teal-800 dark:text-teal-200 text-xs font-bold flex items-center justify-center gap-2 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
                      >
                        <MapPin size={16} className="shrink-0" />
                        Ver todos en el mapa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex gap-4 max-w-[90%] md:max-w-[min(100%,42rem)]">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Bot size={20} />
                </div>
                <div className="min-w-0 flex-1 rounded-2xl px-4 py-3 border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">
                    La IA está trabajando
                  </p>
                  {progressSteps.length > 0 ? (
                    <ul className="space-y-3">
                      {progressSteps.map((step, i) => {
                        const isLast = i === progressSteps.length - 1;
                        return (
                          <li key={`${step.phase}-${i}-${step.label.slice(0, 24)}`} className="flex gap-3">
                            <div
                              className={cn(
                                'mt-0.5 w-7 h-7 rounded-full shrink-0 flex items-center justify-center border',
                                isLast
                                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400'
                                  : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400',
                              )}
                              aria-hidden
                            >
                              {isLast ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Check size={15} strokeWidth={2.5} />
                              )}
                            </div>
                            <div className="min-w-0 pt-0.5">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">{step.label}</p>
                              {step.detail ? (
                                <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{step.detail}</p>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="flex gap-1.5 items-center h-9">
                      <span className="w-1.5 h-1.5 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
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
        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-3 max-w-xl mx-auto leading-relaxed font-normal normal-case tracking-normal">
          {COPAY_LEGAL_NOTICE}
        </p>
      </div>
    </div>
  );
}
