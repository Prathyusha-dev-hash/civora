import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../../context/useLanguage';

export function LanguageDropdown({ className = '' }) {
  const { language, setLanguage, languages, currentLanguage, isRtl } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (code) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current language is ${currentLanguage.nativeName} (${currentLanguage.label}). Click to change language.`}
        title={`${currentLanguage.nativeName} (${currentLanguage.label})`}
        className="min-h-[44px] sm:min-h-[46px] inline-flex items-center justify-between gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-[#2E4A62] dark:text-[#F2F5F8] bg-white dark:bg-[#2D3C49] hover:bg-[#F7F9FB] dark:hover:bg-[#354756] border border-[#E1E7EE] dark:border-[#40515F] transition-all cursor-pointer select-none shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C97B0]"
      >
        <Globe className="w-4 h-4 text-[#7C97B0] dark:text-[#8FAFCB] shrink-0" />
        <span className="truncate max-w-[80px] sm:max-w-[110px] text-xs sm:text-sm leading-tight">
          {currentLanguage.nativeName}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#64748B] dark:text-[#B7C3CE] shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select Language"
          className={`absolute top-full mt-2 w-60 sm:w-64 max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${
            isRtl ? 'left-0 right-auto' : 'right-0 left-auto'
          }`}
        >
          <div className="px-3 py-2 border-b border-[#E1E7EE] dark:border-[#40515F] mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#B7C3CE]">
              Languages / ਭਾਸ਼ਾਵਾਂ / भाषाएं
            </p>
          </div>

          <div className="space-y-0.5">
            {languages.map((lang, index) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#F2F5F8] font-bold shadow-2xs'
                      : 'text-[#2E4A62] dark:text-[#F2F5F8] hover:bg-[#F7F9FB] dark:hover:bg-[#354756] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-mono text-[#64748B] dark:text-[#B7C3CE] w-4 text-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm sm:text-base font-bold leading-tight truncate">
                        {lang.nativeName}
                      </span>
                      <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] leading-tight truncate">
                        {lang.label} {lang.isRtl ? '(RTL)' : ''}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-[#7C97B0] dark:text-[#8FAFCB] stroke-[2.5] shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default LanguageDropdown;

