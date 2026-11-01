export function Textarea({
  label,
  error,
  helperText,
  maxLength,
  value = '',
  className = '',
  id,
  required = false,
  rows = 4,
  ...props
}) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/gu, '-') : undefined);
  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8]"
          >
            {label} {required && <span className="text-[#C74949]">*</span>}
          </label>
        )}
        {maxLength && (
          <span
            className={`text-xs sm:text-sm font-mono font-medium ${
              currentLength >= maxLength ? 'text-[#C74949] font-bold' : 'text-[#64748B] dark:text-[#B7C3CE]'
            }`}
          >
            {currentLength}/{maxLength}
          </span>
        )}
      </div>
      <div className="relative rounded-xl shadow-2xs">
        <textarea
          id={textareaId}
          rows={rows}
          maxLength={maxLength}
          required={required}
          value={value}
          className={`block w-full min-h-[110px] rounded-xl text-base sm:text-lg transition-colors duration-150 border bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B] dark:placeholder:text-[#8C9CA9] focus:outline-none focus:ring-2 focus:ring-[#7C97B0] focus:border-[#7C97B0] p-4 resize-y leading-relaxed ${
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

export default Textarea;
