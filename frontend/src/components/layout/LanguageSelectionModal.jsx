import React, { useEffect, useRef } from 'react';
import { Globe, Check, X } from 'lucide-react';
import { useLanguage } from '../../context/useLanguage';

export function LanguageSelectionModal() {
  const {
    isLanguageModalOpen,
    closeLanguageModal,
    language,
    setLanguage,
    languages,
    currentLanguage,
    t,
  } = useLanguage();

  const modalRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && isLanguageModalOpen) {
        closeLanguageModal();
      }
    }
    if (isLanguageModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isLanguageModalOpen, closeLanguageModal]);

  if (!isLanguageModalOpen) {
    return null;
  }

  const handleSelectLanguage = (code) => {
    setLanguage(code);
    closeLanguageModal();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeLanguageModal();
        }
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] rounded-3xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150 my-auto text-[#2E4A62] dark:text-[#F2F5F8]"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeLanguageModal}
          aria-label="Close language selector"
          className="absolute top-5 right-5 sm:top-6 sm:right-6 min-h-[44px] min-w-[44px] rounded-full p-2 text-[#64748B] hover:text-[#2E4A62] dark:text-[#B7C3CE] dark:hover:text-white bg-[#E7EEF5] hover:bg-[#D6E3EF] dark:bg-[#263746] dark:hover:bg-[#354756] transition-colors flex items-center justify-center cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4 mb-6 pr-12">
          <div className="w-12 h-12 rounded-2xl bg-[#D6E3EF] dark:bg-[#263746] border border-[#9BAFC1]/30 flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6 text-[#7C97B0] dark:text-[#8FAFCB]" />
          </div>
          <div>
            <h2
              id="language-modal-title"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2E4A62] dark:text-[#F2F5F8]"
            >
              {t('common.languageModalTitle')}
            </h2>
            <p className="mt-1 text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE] leading-relaxed">
              {t('common.languageModalDesc')}
            </p>
          </div>
        </div>

        {/* Current Active Language Indicator */}
        <div className="mb-6 p-3.5 rounded-2xl bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium">
            Active Language / वर्तमान भाषा:
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D6E3EF] dark:bg-[#263746] text-[#2E4A62] dark:text-[#F2F5F8] font-bold border border-[#9BAFC1]/40">
            <Check className="w-4 h-4 text-[#7C97B0] dark:text-[#8FAFCB]" />
            {currentLanguage.nativeName} ({currentLanguage.label})
          </span>
        </div>

        {/* 10 Languages Displayed Simultaneously in Native Scripts */}
        <div
          role="radiogroup"
          aria-label="Supported Languages"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4"
        >
          {languages.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectLanguage(lang.code)}
                className={`min-h-[76px] sm:min-h-[88px] p-3.5 rounded-2xl text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none relative group ${
                  isSelected
                    ? 'bg-[#E7EEF5] dark:bg-[#263746] border-2 border-[#7C97B0] dark:border-[#8FAFCB] shadow-md ring-2 ring-[#7C97B0]/20'
                    : 'bg-white dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] hover:border-[#7C97B0] dark:hover:border-[#8FAFCB] hover:bg-[#F7F9FB] dark:hover:bg-[#354756] shadow-2xs'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#7C97B0] text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}

                <span
                  className={`text-xl sm:text-2xl font-bold leading-tight ${
                    isSelected
                      ? 'text-[#2E4A62] dark:text-[#F2F5F8]'
                      : 'text-[#2E4A62] dark:text-[#F2F5F8] group-hover:text-[#7C97B0] dark:group-hover:text-[#8FAFCB]'
                  }`}
                >
                  {lang.nativeName}
                </span>

                <span
                  className={`mt-1 text-xs font-semibold ${
                    isSelected
                      ? 'text-[#7C97B0] dark:text-[#8FAFCB]'
                      : 'text-[#64748B] dark:text-[#B7C3CE]'
                  }`}
                >
                  {lang.label} {lang.isRtl ? '• RTL' : ''}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer & Reassurance */}
        <div className="mt-8 pt-6 border-t border-[#E1E7EE] dark:border-[#40515F] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] text-center sm:text-left">
            Selection applies instantly to all citizen reports, voice inputs, dashboards, and navigation.
          </p>
          <button
            type="button"
            onClick={closeLanguageModal}
            className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base text-white bg-[#7C97B0] hover:bg-[#69849E] dark:bg-[#8FAFCB] dark:hover:bg-[#A1BDD6] dark:text-[#202C38] transition-colors shadow-sm cursor-pointer"
          >
            Done / पूर्ण
          </button>
        </div>
      </div>
    </div>
  );
}

export default LanguageSelectionModal;
