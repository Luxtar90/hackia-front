import { useState } from 'react';
import { User, Mail, CreditCard, ChevronLeft, Edit2, Menu } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { authApi } from '../lib/api';
import { Modal } from './Modal';
import { translations } from '../lib/translations';

interface ProfileViewProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onBack: () => void;
}

export function ProfileView({ isSidebarOpen, setIsSidebarOpen, onBack }: ProfileViewProps) {
  const { user, updateUser, language } = useAppStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
  });

  const handleSave = async () => {
    try {
      await authApi.updateProfile(formData);
      updateUser(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const t = translations[language].profile;

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
        <button 
          onClick={onBack}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">{t.title}</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-8 pb-12">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
            </div>
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-teal-600/20"
            >
              <Edit2 size={16} />
              <span className="hidden sm:inline">{t.edit}</span>
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.basicInfo}</h3>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700">
                <div className="flex items-center gap-4 p-5">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.fullName}</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user.name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <h3 className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.contact}</h3>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700">
                <div className="flex items-center gap-4 p-5">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.email}</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Insurance Info */}
            <div className="space-y-3">
              <h3 className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.insurance}</h3>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700">
                <div className="flex items-center gap-4 p-5">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.insurancePlan}</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {user.plan === 'Salud Total Platinum' && language === 'Inglés' ? 'Salud Total Platinum' : (user.plan === 'Plan Estándar' && language === 'Inglés' ? 'Standard Plan' : user.plan)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onConfirm={handleSave}
        title={t.edit}
      >
        <div className="grid grid-cols-1 gap-4 py-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.fullName}</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-teal-500/20 dark:text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.email}</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-teal-500/20 dark:text-white"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
