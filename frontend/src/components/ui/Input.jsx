export function Input({
  label,
  error,
  helperText,
  icon = null,
  className = '',
  id,
  required = false,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/gu, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2"
        >
          {label} {required && <span className="text-[#C74949]">*</span>}
        </label>
      )}
      <div className="relative rounded-xl shadow-2xs">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          required={required}
          className={`block w-full min-h-[48px] rounded-xl text-base sm:text-lg transition-colors duration-150 border bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B] dark:placeholder:text-[#8C9CA9] focus:outline-none focus:ring-2 focus:ring-[#7C97B0] focus:border-[#7C97B0] ${
            icon ? 'pl-11' : 'pl-4'
          } pr-4 py-3 ${
            error
              ? 'border-[#C74949] focus:ring-[#C74949] focus:border-[#C74949] bg-red-50/20 dark:bg-red-950/20'
              : 'border-[#E1E7EE] dark:border-[#40515F] hover:border-[#9BAFC1]'
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-sm sm:text-base text-[#C74949] font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE]">{helperText}</p>
      ) : null}
    </div>
  );
}

export default Input;
