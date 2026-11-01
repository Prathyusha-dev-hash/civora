import { Loader2 } from 'lucide-react';

/**
 * Reusable Button component aligned with the Civora Senior-Friendly design system.
 * Option 9 – Dusty Blue Palette.
 * Minimum interactive target: 44-48px.
 * Typography: 18-20px for clear readability.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  type = 'button',
  className = '',
  onClick,
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer whitespace-nowrap';

  const variantClasses = {
    primary: 'bg-[#7C97B0] hover:bg-[#69849E] active:bg-[#58738D] text-white dark:bg-[#8FAFCB] dark:hover:bg-[#A1BDD6] dark:text-[#202C38] focus-visible:ring-[#7C97B0] shadow-xs',
    secondary: 'bg-[#D6E3EF] hover:bg-[#C5D5E4] active:bg-[#B4CCE0] text-[#2E4A62] dark:bg-[#263746] dark:hover:bg-[#354756] dark:text-[#F2F5F8] focus-visible:ring-[#7C97B0] shadow-xs',
    outline: 'border-2 border-[#7C97B0] dark:border-[#8FAFCB] text-[#2E4A62] dark:text-[#F2F5F8] hover:bg-[#E7EEF5] dark:hover:bg-[#263746] focus-visible:ring-[#7C97B0]',
    ghost: 'text-[#2E4A62] dark:text-[#F2F5F8] hover:bg-[#E7EEF5] dark:hover:bg-[#263746] focus-visible:ring-[#7C97B0]',
    danger: 'bg-[#C74949] hover:bg-[#B33E3E] text-white focus-visible:ring-[#C74949] shadow-xs',
    subtle: 'bg-[#E7EEF5] dark:bg-[#263746] text-[#2E4A62] dark:text-[#8FAFCB] hover:bg-[#D6E3EF] dark:hover:bg-[#354756] focus-visible:ring-[#7C97B0]',
  };

  const sizeClasses = {
    sm: 'min-h-[44px] text-base px-4 py-2.5 gap-2',
    md: 'min-h-[48px] text-base sm:text-lg px-5 py-3 gap-2.5',
    lg: 'min-h-[52px] text-lg sm:text-xl px-6 py-3.5 gap-3',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-current shrink-0" />
      ) : (
        icon && iconPosition === 'left' && <span className="inline-flex shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="inline-flex shrink-0">{icon}</span>
      )}
    </button>
  );
}

export default Button;
