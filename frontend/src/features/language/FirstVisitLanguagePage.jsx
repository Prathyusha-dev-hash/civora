import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Globe, Check, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/useLanguage';

export function FirstVisitLanguagePage() {
  const { language, languages, confirmLanguage, t } = useLanguage();
  const navigate = useNavigate();

  // Selected language state before confirmation
  const [selectedCode, setSelectedCode] = useState(() => language || 'en');

  const handleSelect = (code) => {
    setSelectedCode(code);
  };

  const handleContinue = () => {
    confirmLanguage(selectedCode);
    navigate('/', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedMeta = languages.find((l) => l.code === selectedCode) || languages[0];

  return (
    <div className="min-h-screen bg-[#F7F9FB] dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="w-full max-w-4xl mx-auto">
        {/* Branding Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#D6E3EF] dark:bg-[#263746] border border-[#7C97B0]/30 dark:border-[#8FAFCB]/30 flex items-center justify-center mb-4 shadow-sm">
            <Shield className="w-8 h-8 text-[#2E4A62] dark:text-[#F2F5F8]" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-extrabold text-2xl sm:text-3xl tracking-tight text-[#2E4A62] dark:text-[#F2F5F8]">
              Civora
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] font-medium">
            Civic Accountability & Intelligence Platform
          </p>
        </div>

        {/* Main Selection Card */}
        <div className="bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] rounded-3xl p-6 sm:p-10 shadow-xl transition-colors">
          {/* Card Header */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D6E3EF]/70 dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] text-xs sm:text-sm font-bold mb-3 border border-[#7C97B0]/25 dark:border-[#8FAFCB]/25">
              <Globe className="w-4 h-4 text-[#7C97B0] dark:text-[#8FAFCB]" />
              <span>Language Selection / ਭਾਸ਼ਾ ਚੋਣ / भाषा चयन</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#2E4A62] dark:text-[#F2F5F8] tracking-tight">
              Select Your Preferred Language
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE] leading-relaxed">
              Choose your language for civic reporting, voice capture, and portal tracking. You can always change this later in the header.
            </p>
          </div>

          {/* 10 Languages Grid in Native Scripts */}
          <div
            role="radiogroup"
            aria-label="Supported Regional Languages"
            className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-8"
          >
            {languages.map((lang, index) => {
              const isSelected = lang.code === selectedCode;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelect(lang.code)}
                  className={`min-h-[72px] sm:min-h-[82px] p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none relative group ${
                    isSelected
                      ? 'bg-[#E7EEF5] dark:bg-[#263746] border-2 border-[#7C97B0] dark:border-[#8FAFCB] shadow-sm ring-2 ring-[#7C97B0]/20'
                      : 'bg-white dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] hover:border-[#7C97B0] dark:hover:border-[#8FAFCB] hover:bg-[#F7F9FB] dark:hover:bg-[#354756]'
                  }`}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#7C97B0] dark:bg-[#8FAFCB] text-white dark:text-[#202C38] flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}

                  {/* Number / Order Badge */}
                  <span className="absolute top-2 left-2 text-[10px] font-mono text-[#64748B] dark:text-[#B7C3CE] opacity-60">
                    {index + 1}
                  </span>

                  {/* Native Script Name */}
                  <span
                    className={`text-lg sm:text-2xl font-bold leading-tight ${
                      isSelected
                        ? 'text-[#2E4A62] dark:text-[#F2F5F8]'
                        : 'text-[#2E4A62] dark:text-[#F2F5F8] group-hover:text-[#7C97B0] dark:group-hover:text-[#8FAFCB]'
                    }`}
                  >
                    {lang.nativeName}
                  </span>

                  {/* English Name / Meta */}
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

          {/* Action Row: Selected Summary & Continue Button */}
          <div className="pt-6 border-t border-[#E1E7EE] dark:border-[#40515F] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left text-sm text-[#64748B] dark:text-[#B7C3CE]">
              <span>Selected: </span>
              <strong className="font-bold text-[#2E4A62] dark:text-[#F2F5F8]">
                {selectedMeta.nativeName} ({selectedMeta.label})
              </strong>
            </div>

            <button
              type="button"
              onClick={handleContinue}
              className="w-full sm:w-auto min-h-[48px] sm:min-h-[52px] px-8 py-3 rounded-xl bg-[#7C97B0] hover:bg-[#69849E] dark:bg-[#8FAFCB] dark:hover:bg-[#A1BDD6] text-white dark:text-[#202C38] font-bold text-base sm:text-lg shadow-md transition-all inline-flex items-center justify-center gap-2.5 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C97B0]"
            >
              <span>{t('common.continue')} / Continue</span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Footer Guarantee */}
        <p className="mt-6 text-center text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE]">
          Civora preserves original regional language submissions while providing municipal English translations.
        </p>
      </div>
    </div>
  );
}

export default FirstVisitLanguagePage;

