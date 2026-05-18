import { Activity } from 'lucide-react';

export function Header() {
  return (
    <header className="w-full h-[65px] px-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
          <Activity className="text-white w-5 h-5" />
        </div>
        <span className="font-bold text-slate-800 text-lg tracking-tight">
          Well<span className="text-teal-600">Way</span>
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors">
          Mi Seguro
        </button>
        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs">
          JD
        </div>
      </div>
    </header>
  );
}
