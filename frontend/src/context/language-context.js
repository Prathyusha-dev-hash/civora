import { createContext } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getLanguageMetadata } from '../i18n/languages';

export const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  currentLanguage: getLanguageMetadata(DEFAULT_LANGUAGE),
  languages: SUPPORTED_LANGUAGES,
  isRtl: false,
  dir: 'ltr',
  isLanguageConfirmed: true,
  confirmLanguage: () => {},
  resetLanguageConfirmation: () => {},
  setLanguage: () => {},
  isLanguageModalOpen: false,
  openLanguageModal: () => {},
  closeLanguageModal: () => {},
  t: (key) => key,
});

export default LanguageContext;
