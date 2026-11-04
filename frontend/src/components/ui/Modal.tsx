import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-5 overflow-y-auto"
      style={{
        paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
        paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
      }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Panel - Toujours flottant et centré, aucun risque de chevauchement avec la barre de navigation Android */}
      <div
        className={`relative z-10 transform bg-white text-left shadow-2xl transition-all w-full ${maxWidthStyles[maxWidth]} border border-neutral-200 font-serif
          rounded-2xl sm:rounded-xl
          flex flex-col
          max-h-[86dvh] sm:max-h-[85vh]
          my-auto
          animate-in fade-in zoom-in-95 duration-150`}
      >
        {/* Header sticky */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 sm:px-5 py-3.5 bg-neutral-50/70 shrink-0 rounded-t-2xl sm:rounded-t-xl">
          <h3 className="text-sm sm:text-base font-bold font-serif text-neutral-900 tracking-wide">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 active:scale-95 transition-all"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content scrollable avec marge inférieure confortable */}
        <div className="p-4 sm:p-5 pb-6 sm:pb-5 overflow-y-auto flex-1 overscroll-contain">{children}</div>
      </div>
    </div>
  );
};
