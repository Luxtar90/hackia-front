import { useState } from 'react';
import { User, Moon, Sun, Globe, Menu, ChevronRight, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { authApi } from '../lib/api';
import { Modal } from './Modal';
import { translations } from '../lib/translations';

interface SettingsViewProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenProfile: () => void;
}

export function SettingsView({ isSidebarOpen, setIsSidebarOpen, onOpenProfile }: SettingsViewProps) {
  const { isDarkMode, toggleDarkMode, user, updateUser, language, setLanguage, deleteAccount } = useAppStore();
  
  const [editingProfile, setEditingProfile] = useState(false);
  const [newName, setNewName] = useState(user.name);
  const [newEmail, setNewEmail] = useState(user.email);
  
  const [changingLanguage, setChangingLanguage] = useState(false);
  const [selectedLang, setSelectedLang] = useState(language);

  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const t = translations[language].settings;
  const common = translations[language].common;

  const handleUpdateProfile = async () => {
    try {
      await authApi.updateProfile({ name: newName, email: newEmail });
      updateUser({ name: newName, email: newEmail });
      setEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleConfirmLanguage = () => {
    setLanguage(selectedLang);
    setChangingLanguage(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleting(false);
      alert(language === 'Español' ? 'No se pudo eliminar la cuenta' : 'Could not delete account');
    }
  };

  const sections = [
    {
      title: t.profile,
      items: [
        { 
          icon: User, 
          label: t.personalInfo, 
          value: user.name, 
          type: 'link', 
          onClick: onOpenProfile 
        },
        { 
          icon: Globe, 
          label: t.language, 
          value: language === 'Español' ? 'Español (ES)' : 'English (EN)', 
          type: 'link', 
          onClick: () => {
            setSelectedLang(language);
            setChangingLanguage(true);
          } 
        },
      ]
    },
    {
      title: t.preferences,
      items: [
        { 
          icon: isDarkMode ? Moon : Sun, 
          label: t.darkMode, 
          value: isDarkMode ? t.on : t.off, 
          type: 'toggle',
          onClick: toggleDarkMode,
        },
      ]
    }
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
        <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">
          {t.title}
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-8 pb-12">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              {t.title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t.subtitle}
            </p>
          </div>

          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-3">
              <h3 className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{section.title}</h3>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700">
                {section.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/30 group-hover:text-teal-600 transition-colors">
                        <item.icon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.label}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.value}</p>
                      </div>
                    </div>
                    
                    {item.type === 'toggle' ? (
                      <button 
                        onClick={item.action}
                        className={`w-11 h-6 rounded-full transition-all relative ${isDarkMode ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isDarkMode ? 'left-6' : 'left-1'}`} />
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={item.onClick}
                        className="p-2 text-slate-300 hover:text-teal-600 transition-colors"
                      >
                        <ChevronRight size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-4">
            <button 
              onClick={() => setShowDeleteAccountModal(true)}
              className="w-full py-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold text-sm rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              {t.deleteAccount}
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4 font-medium uppercase tracking-widest">
              Estimador Agéntico v1.0.4
            </p>
          </div>
        </div>
      </div>

      {/* Modals for settings */}
      <Modal
        isOpen={editingProfile}
        onClose={() => setEditingProfile(false)}
        onConfirm={handleUpdateProfile}
        title={t.editProfile}
        confirmText={common.save}
        cancelText={common.cancel}
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{translations[language].profile.fullName}</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-teal-500/20 dark:text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{translations[language].profile.email}</label>
            <input 
              type="email" 
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-teal-500/20 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={changingLanguage}
        onClose={() => setChangingLanguage(false)}
        onConfirm={handleConfirmLanguage}
        title={language === 'Español' ? 'Seleccionar Idioma' : 'Select Language'}
        confirmText={common.confirm}
        cancelText={common.cancel}
      >
        <div className="space-y-2 py-2">
          {['Español', 'Inglés'].map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang as 'Español' | 'Inglés')}
              className={`w-full text-left p-4 rounded-xl text-sm font-semibold transition-all ${selectedLang === lang ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 border border-teal-100 dark:border-teal-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent'}`}
            >
              {lang} {lang === 'Español' ? '(ES)' : '(EN)'}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleDeleteAccount}
        variant="danger"
        title={t.deleteAccount}
        confirmText={deleting ? common.loading : common.delete}
        cancelText={common.cancel}
        description={language === 'Español' 
          ? '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción borrará permanentemente todos tus datos de salud y conversaciones en la nube. No se puede deshacer.'
          : 'Are you sure you want to delete your account? This action will permanently erase all your health data and conversations in the cloud. It cannot be undone.'}
      />
    </div>
  );
}
