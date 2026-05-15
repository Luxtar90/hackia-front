import { AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export function Modal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = 'Continuar', 
  cancelText = 'Cancelar',
  variant = 'primary'
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
        "relative w-full max-w-[360px] rounded-[28px] overflow-hidden shadow-2xl animate-modal-pop glass",
        "border border-white/50 dark:border-white/5"
      )}>
        <div className="p-8 pb-6 text-center">
          {/* Icon Header (Very Minimal) */}
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-5",
            variant === 'danger' 
              ? "bg-red-500/5 text-red-500" 
              : "bg-teal-500/5 text-teal-600 dark:text-teal-400"
          )}>
            <AlertCircle size={20} strokeWidth={2.5} />
          </div>

          <h3 className="text-[19px] font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            {title}
          </h3>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium px-2">
            {description}
          </p>
        </div>

        {/* Buttons Section (Cleaner Layout) */}
        <div className="px-6 pb-6 flex flex-col gap-1.5">
          <button
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
            className={cn(
              "w-full py-3.5 rounded-2xl font-bold text-[14px] transition-all active:scale-[0.96]",
              variant === 'danger' 
                ? "bg-transparent text-red-500 hover:bg-red-500/5" 
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
