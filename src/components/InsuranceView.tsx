import { Shield, CreditCard, CheckCircle, Info, Download, Menu } from 'lucide-react';

interface InsuranceViewProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export function InsuranceView({ isSidebarOpen, setIsSidebarOpen }: InsuranceViewProps) {
  const coverages = [
    { category: 'Consultas Médicas', inNetwork: '90%', outNetwork: '60%', limit: 'Ilimitado' },
    { category: 'Urgencias', inNetwork: '100%', outNetwork: '70%', limit: 'Ilimitado' },
    { category: 'Exámenes Lab', inNetwork: '80%', outNetwork: '50%', limit: '$2,000,000 anual' },
    { category: 'Hospitalización', inNetwork: '90%', outNetwork: '60%', limit: 'Ilimitado' },
  ];

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
        <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">Mi Seguro & Copagos</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
          {/* Header Card */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
            <Shield className="absolute right-[-20px] top-[-20px] w-48 h-48 opacity-10 rotate-12" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Salud Total Platinum</h2>
              <p className="text-teal-100 mb-6">Póliza: #8829-3310-992</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-teal-200">Estado</p>
                  <p className="text-sm font-bold flex items-center gap-1"><CheckCircle size={14} /> Activo</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-teal-200">Vigencia</p>
                  <p className="text-sm font-bold">31 Dic 2026</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-teal-200">Titular</p>
                  <p className="text-sm font-bold">Juan Delgado</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-teal-200">Deducible</p>
                  <p className="text-sm font-bold">$0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Table */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <CreditCard className="text-teal-600" size={20} /> Detalle de Coberturas
              </h3>
              <button className="text-xs font-bold text-teal-600 flex items-center gap-1 hover:underline">
                <Download size={14} /> Descargar PDF
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoría</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">En Red</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fuera de Red</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Límites</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {coverages.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 text-sm">{row.category}</td>
                      <td className="px-6 py-4 text-teal-600 dark:text-teal-400 font-bold text-sm">{row.inNetwork}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{row.outNetwork}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{row.limit}</td>
                    </tr>
                  ))}
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
              <p className="text-sm font-bold text-blue-900 dark:text-blue-300">¿Cómo funcionan los copagos?</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                El copago es el monto fijo que pagas por cada servicio médico. El estimador agéntico calcula este valor automáticamente basándose en tu red Platinum. Los valores fuera de red están sujetos a reembolso.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
