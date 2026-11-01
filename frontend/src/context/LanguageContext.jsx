import { useState, useEffect, useCallback, useMemo } from 'react';
import { LanguageContext } from './language-context';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  getLanguageMetadata,
  translate,
} from '../i18n';

const LANGUAGE_STORAGE_KEY = 'civicai_language';
const LANGUAGE_CONFIRMED_KEY = 'civicai_language_confirmed';

export function LanguageProvider({ children }) {
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  const [language, setLanguageState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && SUPPORTED_LANGUAGES.some((lang) => lang.code === saved)) {
          return saved;
        }
      } catch {
        // Ignore localStorage access errors
      }
    }
    return DEFAULT_LANGUAGE;
  });

  const [isLanguageConfirmed, setIsLanguageConfirmed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(LANGUAGE_CONFIRMED_KEY) === 'true';
      } catch {
        // Ignore localStorage access errors
      }
    }
    return false;
  });

  const currentLanguage = useMemo(() => {
    return getLanguageMetadata(language);
  }, [language]);

  const isRtl = currentLanguage.isRtl || currentLanguage.dir === 'rtl';
  const dir = isRtl ? 'rtl' : 'ltr';

  // Synchronize document lang & dir attributes with active language
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('lang', language);
      root.setAttribute('dir', dir);
      if (isRtl) {
        root.classList.add('rtl-layout');
      } else {
        root.classList.remove('rtl-layout');
      }
    }

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore localStorage access errors
    }
  }, [language, dir, isRtl]);

  const setLanguage = useCallback((newLang) => {
    if (SUPPORTED_LANGUAGES.some((l) => l.code === newLang)) {
      setLanguageState(newLang);
      setIsLanguageConfirmed(true);
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
        localStorage.setItem(LANGUAGE_CONFIRMED_KEY, 'true');
      } catch {
        // Ignore localStorage access errors
      }
    }
  }, []);

  const confirmLanguage = useCallback((selectedLang) => {
    const validLang = SUPPORTED_LANGUAGES.some((l) => l.code === selectedLang) ? selectedLang : DEFAULT_LANGUAGE;
    setLanguageState(validLang);
    setIsLanguageConfirmed(true);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, validLang);
      localStorage.setItem(LANGUAGE_CONFIRMED_KEY, 'true');
    } catch {
      // Ignore localStorage access errors
    }
  }, []);

  const resetLanguageConfirmation = useCallback(() => {
    setIsLanguageConfirmed(false);
    try {
      localStorage.removeItem(LANGUAGE_CONFIRMED_KEY);
    } catch {
      // Ignore localStorage access errors
    }
  }, []);

  const openLanguageModal = useCallback(() => {
    setIsLanguageModalOpen(true);
  }, []);

  const closeLanguageModal = useCallback(() => {
    setIsLanguageModalOpen(false);
  }, []);

  const t = useCallback(
    (key, params) => {
      return translate(language, key, params);
    },
    [language]
  );

  const contextValue = useMemo(
    () => ({
      language,
      currentLanguage,
      languages: SUPPORTED_LANGUAGES,
      isRtl,
      dir,
      isLanguageConfirmed,
      confirmLanguage,
      resetLanguageConfirmation,
      setLanguage,
      isLanguageModalOpen,
      openLanguageModal,
      closeLanguageModal,
      t,
    }),
    [
      language,
      currentLanguage,
      isRtl,
      dir,
      isLanguageConfirmed,
      confirmLanguage,
      resetLanguageConfirmation,
      setLanguage,
      isLanguageModalOpen,
      openLanguageModal,
      closeLanguageModal,
      t,
    ]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageProvider;
