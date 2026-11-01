import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../../context/useLanguage';

/**
 * Dedicated Language Selector
 * Displays all 10 supported regional languages simultaneously in native scripts.
 * No dropdowns are used, ensuring immediate discoverability for users aged 40+ and rural citizens.
 */
export function LanguageSelector({ className = '' }) {
  const { language, setLanguage, languages, t } = useLanguage();

  const handleSelect = (code) => {
    setLanguage(code);
  };

  return (
    <div
      role="region"
      aria-label="Language Selection"
      className={`w-full bg-[#E7EEF5]/40 dark:bg-[#202C38] p-4 sm:p-5 rounded-2xl border border-[#E1E7EE] dark:border-[#40515F] shadow-2xs ${className}`}
    >
      <div className="flex items-center gap-2 mb-3 text-[#2E4A62] dark:text-[#F2F5F8] text-sm sm:text-base font-bold">
        <Globe className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB] shrink-0" />
        <span>{t('common.chooseLanguage')} / Select Language:</span>
      </div>

      <div
        role="radiogroup"
        aria-label="Available regional languages"
        className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5"
      >
        {languages.map((lang) => {
          const isSelected = lang.code === language;
          return (
            <button
              key={lang.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(lang.code)}
              className={`min-h-[52px] sm:min-h-[58px] px-3 py-2 rounded-xl text-center flex flex-col items-center justify-center transition-all cursor-pointer border select-none relative ${
                isSelected
                  ? 'bg-[#7C97B0] dark:bg-[#8FAFCB] text-white dark:text-[#202C38] font-bold border-[#69849E] dark:border-[#7597B4] shadow-sm ring-2 ring-[#7C97B0]/25'
                  : 'bg-white dark:bg-[#2D3C49] text-[#2E4A62] dark:text-[#F2F5F8] font-semibold border-[#E1E7EE] dark:border-[#40515F] hover:bg-[#F7F9FB] dark:hover:bg-[#354756] hover:border-[#7C97B0]'
              }`}
            >
              {isSelected && (
                <span className="absolute top-1.5 right-1.5">
                  <Check className="w-3.5 h-3.5 stroke-[3] text-white dark:text-[#202C38]" />
                </span>
              )}
              <span className="text-base sm:text-lg font-bold leading-tight">
                {lang.nativeName}
              </span>
              <span
                className={`text-[11px] sm:text-xs font-medium ${
                  isSelected ? 'text-white/90 dark:text-[#202C38]/90' : 'text-[#64748B] dark:text-[#B7C3CE]'
                }`}
              >
                {lang.label} {lang.isRtl ? '(RTL)' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LanguageSelector;
