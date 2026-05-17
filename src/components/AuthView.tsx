import { useState } from 'react';
import { Activity, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { authApi } from '../lib/api';
import { translations } from '../lib/translations';

export function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { language } = useAppStore();

  const t = translations[language].auth;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (isLogin) {
        const response = await authApi.login({ email, password });
        if (response.success) {
          useAppStore.getState().login(response.data.accessToken, response.data.user);
        }
      } else {
        const response = await authApi.register({
          email,
          password,
          role: 'patient',
          nombre: name,
          activo: true,
        });
        if (response.success) {
          setSuccessMessage(t.successCreated);
          setIsLogin(true);
          setPassword(''); // Clear password for safety
        }
      }
    } catch (err: any) {
      setError(err.message || (language === 'Español' ? 'Error al conectar con el servidor' : 'Error connecting to server'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-600/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center shadow-xl shadow-teal-500/20 mb-4">
            <Activity className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {translations[language].sidebar.appTitle}<span className="text-teal-600">{translations[language].sidebar.appSubtitle}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {language === 'Español' ? 'Tu asistente inteligente de salud' : 'Your intelligent health assistant'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {isLogin ? t.welcome : t.createAccount}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {isLogin ? t.loginSubtitle : t.registerSubtitle}
            </p>
            {successMessage && (
              <p className="text-xs text-green-600 font-bold mt-2 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg animate-in fade-in zoom-in-95">
                {successMessage}
              </p>
            )}
          </div>

          <form className="space-y-4" onSubmit={handleAuth}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-3 text-red-600 dark:text-red-400 text-xs font-medium animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.name}</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan Delgado"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-teal-500/20 dark:text-white transition-all"
                    required
                    minLength={1}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.email}</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-teal-500/20 dark:text-white transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.password}</label>
                {isLogin && <button type="button" className="text-[10px] font-bold text-teal-600 hover:underline tracking-tight">{t.forgotPassword}</button>}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-teal-500/20 dark:text-white transition-all"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 group mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? t.login : t.register} 
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {isLogin ? t.noAccount : t.hasAccount}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-teal-600 font-bold ml-1.5 hover:underline"
              >
                {isLogin ? t.registerFree : t.loginNow}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
