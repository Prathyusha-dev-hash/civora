import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export function Alert({
  type = 'info',
  title,
  children,
  onClose,
  className = '',
}) {
  const config = {
    info: {
      container: 'bg-[#D6E3EF]/50 dark:bg-[#344656]/50 border-[#7C97B0]/40 dark:border-[#8FAFCB]/40 text-[#2E4A62] dark:text-[#F2F5F8]',
      icon: <Info className="w-6 h-6 text-[#7C97B0] dark:text-[#8FAFCB] shrink-0 mt-0.5" />,
    },
    warning: {
      container: 'bg-[#B7791F]/10 dark:bg-[#B7791F]/20 border-[#B7791F]/30 dark:border-[#E09E3E]/40 text-[#B7791F] dark:text-[#E09E3E]',
      icon: <AlertTriangle className="w-6 h-6 text-[#B7791F] dark:text-[#E09E3E] shrink-0 mt-0.5" />,
    },
    error: {
      container: 'bg-[#C74949]/10 dark:bg-[#C74949]/20 border-[#C74949]/30 dark:border-[#E56B6B]/40 text-[#C74949] dark:text-[#E56B6B]',
      icon: <AlertCircle className="w-6 h-6 text-[#C74949] dark:text-[#E56B6B] shrink-0 mt-0.5" />,
    },
    success: {
      container: 'bg-[#2E7D6B]/10 dark:bg-[#2E7D6B]/20 border-[#2E7D6B]/30 dark:border-[#4EAD97]/40 text-[#2E7D6B] dark:text-[#4EAD97]',
      icon: <CheckCircle2 className="w-6 h-6 text-[#2E7D6B] dark:text-[#4EAD97] shrink-0 mt-0.5" />,
    },
  };

  const current = config[type] || config.info;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl border ${current.container} ${className}`}
    >
      {current.icon}
      <div className="flex-1 text-sm sm:text-base">
        {title && <h5 className="font-bold text-base sm:text-lg mb-1 tracking-tight">{title}</h5>}
        <div className="leading-relaxed font-normal">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-current opacity-70 hover:opacity-100 transition-opacity rounded-lg cursor-pointer"
          aria-label="Dismiss alert"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export default Alert;
