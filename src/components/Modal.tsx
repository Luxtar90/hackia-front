import { AlertCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  children?: React.ReactNode;
}

export function Modal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = 'Continuar', 
  cancelText = 'Cancelar',
  variant = 'primary',
  children
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      {/* Dynamic Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/20 dark:bg-slate-950/40 backdrop-blur-[2px] animate-fade-fast"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className={cn(
        "relative w-full max-w-[360px] rounded-[28px] overflow-hidden shadow-2xl animate-modal-pop glass flex flex-col",
        "border border-white/50 dark:border-white/5 bg-white dark:bg-slate-900"
      )}>
        {/* Header */}
        <div className="p-6 pb-2">
          <div className="flex justify-between items-start mb-4">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              variant === 'danger' 
                ? "bg-red-500/5 text-red-500" 
                : "bg-teal-500/5 text-teal-600 dark:text-teal-400"
            )}>
              <AlertCircle size={20} strokeWidth={2.5} />
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          <h3 className="text-[19px] font-bold text-slate-900 dark:text-white mb-2 tracking-tight text-center">
            {title}
          </h3>
          {description && (
            <p className="text-[13.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium px-2 text-center mb-4">
              {description}
            </p>
          )}
        </div>

        {/* Content Area (Children) */}
        {children && (
          <div className="px-6 py-2">
            {children}
          </div>
        )}

        {/* Buttons Section */}
        <div className="px-6 pb-6 pt-4 flex flex-col gap-1.5 mt-auto">
          <button
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
            className={cn(
              "w-full py-3.5 rounded-2xl font-bold text-[14px] transition-all active:scale-[0.96]",
              variant === 'danger' 
                ? "bg-transparent text-red-500 hover:bg-red-500/5 border border-red-500/20" 
                : "bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-500/10"
            )}
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl font-bold text-[14px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors active:scale-[0.96]"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
