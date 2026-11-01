/**
 * Reusable Badge component for civic status indicators, categories, and severity tiers.
 * Enhanced for senior readability: high-contrast colors and comfortable minimum 16px text.
 * Option 9 – Dusty Blue Palette.
 */
export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  icon = null,
  className = '',
  ...props
}) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full select-none';

  const variantClasses = {
    primary: 'bg-[#E7EEF5] dark:bg-[#263746] text-[#2E4A62] dark:text-[#8FAFCB] border border-[#7C97B0]/30 dark:border-[#8FAFCB]/30',
    secondary: 'bg-[#D6E3EF] dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] border border-[#9BAFC1]/30 dark:border-[#40515F]',
    forest: 'bg-[#E7EEF5] dark:bg-[#263746] text-[#2E4A62] dark:text-[#8FAFCB] border border-[#7C97B0]/30 dark:border-[#8FAFCB]/30',
    teal: 'bg-[#D6E3EF] dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] border border-[#9BAFC1]/30 dark:border-[#40515F]',
    critical: 'bg-[#FDEEEE] dark:bg-[#3E1E1E] text-[#C74949] dark:text-[#E56B6B] border border-[#C74949]/30 dark:border-[#E56B6B]/40',
    warning: 'bg-[#FDF6EC] dark:bg-[#3D2D16] text-[#B7791F] dark:text-[#E09E3E] border border-[#B7791F]/30 dark:border-[#E09E3E]/40',
    success: 'bg-[#E8F4F1] dark:bg-[#1B3530] text-[#2E7D6B] dark:text-[#4EAD97] border border-[#2E7D6B]/30 dark:border-[#4EAD97]/40',
    info: 'bg-[#E7EEF5] dark:bg-[#263746] text-[#2E4A62] dark:text-[#8FAFCB] border border-[#7C97B0]/30 dark:border-[#8FAFCB]/30',
    neutral: 'bg-[#F7F9FB] dark:bg-[#2D3C49] text-[#64748B] dark:text-[#B7C3CE] border border-[#E1E7EE] dark:border-[#40515F]',
  };

  const dotClasses = {
    primary: 'bg-[#7C97B0] dark:bg-[#8FAFCB]',
    secondary: 'bg-[#9BAFC1] dark:bg-[#7597B4]',
    forest: 'bg-[#7C97B0] dark:bg-[#8FAFCB]',
    teal: 'bg-[#9BAFC1] dark:bg-[#7597B4]',
    critical: 'bg-[#C74949] dark:bg-[#E56B6B]',
    warning: 'bg-[#B7791F] dark:bg-[#E09E3E]',
    success: 'bg-[#2E7D6B] dark:bg-[#4EAD97]',
    info: 'bg-[#7C97B0] dark:bg-[#8FAFCB]',
    neutral: 'bg-[#64748B] dark:text-[#B7C3CE]',
  };

  const sizeClasses = {
    sm: 'text-xs sm:text-sm px-3 py-1 gap-2 font-medium',
    md: 'text-sm sm:text-base px-3.5 py-1.5 gap-2 font-semibold',
  };

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${dotClasses[variant] || dotClasses.primary}`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
