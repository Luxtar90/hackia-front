import { useEffect, useState } from 'react';
import { Shield, CreditCard, CheckCircle, Info, Download, Menu, Loader } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { customerApi } from '../lib/api';
import { translations } from '../lib/translations';

interface InsuranceViewProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

interface CoverageDetail {
  idCobertura: string;
  especialidad: string;
  copagoFijo?: number;
  coaseguroOverride?: number;
  cubierto: boolean;
}

interface CoverageData {
  customerId: string;
  numeroPoliza: string;
  nombreCompleto?: string;
  plan: {
    nombrePlan: string;
    aseguradora: string;
    tipoPlan: string;
    deducibleAnual?: number;
    coaseguroPct?: number;
    maxBolsilloAnual?: number;
  };
  coberturas: CoverageDetail[];
}

export function InsuranceView({ isSidebarOpen, setIsSidebarOpen }: InsuranceViewProps) {
  const { customerId, language } = useAppStore();
  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = translations[language].insurance;

  useEffect(() => {
    const fetchCoverage = async () => {
      if (!customerId) {
        setError(language === 'Español' ? 'No se encontró ID del cliente' : 'Customer ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await customerApi.getCoverage(customerId);
        if (response.success && response.data) {
          setCoverageData(response.data);
        } else {
          setError(language === 'Español' ? 'No se pudieron cargar las coberturas' : 'Could not load coverages');
        }
      } catch (err) {
        console.error('Error fetching coverage:', err);
        setError(t.errorLoading);
      } finally {
        setLoading(false);
      }
    };

    fetchCoverage();
  }, [customerId, language]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
        <header className="h-[65px] px-4 md:px-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 shrink-0">
          {!isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu size={20} />
            </button>
          )}
          <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">{t.title}</h2>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader className="animate-spin text-teal-600 mx-auto mb-2" size={32} />
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !coverageData) {
    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
        <header className="h-[65px] px-4 md:px-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 shrink-0">
          {!isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu size={20} />
            </button>
          )}
          <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">{t.title}</h2>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error || translations[language].common.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const coverages = coverageData.coberturas || [];

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
        <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">{t.title}</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
          {/* Header Card */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
            <Shield className="absolute right-[-20px] top-[-20px] w-48 h-48 opacity-10 rotate-12" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">{coverageData.plan.nombrePlan}</h2>
              <p className="text-teal-100 mb-6">{t.policy}: #{coverageData.numeroPoliza}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-teal-200">{t.status}</p>
                  <p className="text-sm font-bold flex items-center gap-1"><CheckCircle size={14} /> {t.active}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-teal-200">{t.validUntil}</p>
                  <p className="text-sm font-bold">31 Dic 2026</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-teal-200">{t.holder}</p>
                  <p className="text-sm font-bold">{coverageData.nombreCompleto || 'N/A'}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-teal-200">{t.deducible}</p>
                  <p className="text-sm font-bold">${coverageData.plan.deducibleAnual || '0'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Table */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <CreditCard className="text-teal-600" size={20} /> {t.benefitsDetail}
              </h3>
              <button className="text-xs font-bold text-teal-600 flex items-center gap-1 hover:underline">
                <Download size={14} /> {t.downloadPDF}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.specialty}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.fixedCopay}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.coinsurance}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {coverages.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                        {t.noCoverages}
                      </td>
                    </tr>
                  ) : (
                    coverages.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 text-sm">{row.especialidad}</td>
                        <td className="px-6 py-4 text-teal-600 dark:text-teal-400 font-bold text-sm">${row.copagoFijo || '0'}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{row.coaseguroOverride ? `${row.coaseguroOverride}%` : t.standard}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${row.cubierto ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                            {row.cubierto ? t.covered : t.notCovered}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 flex gap-4 border border-blue-100 dark:border-blue-800">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center shrink-0">
              <Info className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900 dark:text-blue-300">{t.howItWorks}</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                {t.howItWorksDesc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
