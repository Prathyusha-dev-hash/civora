import { ChevronDown } from 'lucide-react';

export function Select({
  label,
  options = [],
  error,
  helperText,
  className = '',
  id,
  required = false,
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/gu, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2"
        >
          {label} {required && <span className="text-[#C74949]">*</span>}
        </label>
      )}
      <div className="relative rounded-xl shadow-2xs">
        <select
          id={selectId}
          required={required}
          className={`block w-full min-h-[48px] appearance-none rounded-xl text-base sm:text-lg transition-colors duration-150 border bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] focus:outline-none focus:ring-2 focus:ring-[#7C97B0] focus:border-[#7C97B0] pl-4 pr-11 py-3 cursor-pointer ${
            error
              ? 'border-[#C74949] focus:ring-[#C74949] focus:border-[#C74949] bg-red-50/20 dark:bg-red-950/20'
              : 'border-[#E1E7EE] dark:border-[#40515F] hover:border-[#9BAFC1]'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#2D3C49] text-[#2E4A62] dark:text-[#F2F5F8] py-2">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>
      {error ? (
        <p className="mt-1.5 text-sm sm:text-base text-[#C74949] font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE]">{helperText}</p>
      ) : null}
    </div>
  );
}

export default Select;
