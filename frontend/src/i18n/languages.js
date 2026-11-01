export const SUPPORTED_LANGUAGES = [
  {
    code: 'en',
    label: 'English',
    nativeName: 'English',
    bcp47: 'en-IN',
    dir: 'ltr',
    isRtl: false,
  },
  {
    code: 'hi',
    label: 'Hindi',
    nativeName: 'हिन्दी',
    bcp47: 'hi-IN',
    dir: 'ltr',
    isRtl: false,
  },
  {
    code: 'te',
    label: 'Telugu',
    nativeName: 'తెలుగు',
    bcp47: 'te-IN',
    dir: 'ltr',
    isRtl: false,
  },
  {
    code: 'ta',
    label: 'Tamil',
    nativeName: 'தமிழ்',
    bcp47: 'ta-IN',
    dir: 'ltr',
    isRtl: false,
  },
  {
    code: 'ml',
    label: 'Malayalam',
    nativeName: 'മലയാളം',
    bcp47: 'ml-IN',
    dir: 'ltr',
    isRtl: false,
  },
  {
    code: 'kn',
    label: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    bcp47: 'kn-IN',
    dir: 'ltr',
    isRtl: false,
  },
  {
    code: 'pa',
    label: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    bcp47: 'pa-IN',
    dir: 'ltr',
    isRtl: false,
  },
  {
    code: 'gu',
    label: 'Gujarati',
    nativeName: 'ગુજરાતી',
    bcp47: 'gu-IN',
    dir: 'ltr',
    isRtl: false,
  },
  {
    code: 'mr',
    label: 'Marathi',
    nativeName: 'मराठी',
    bcp47: 'mr-IN',
    dir: 'ltr',
    isRtl: false,
  },
  {
    code: 'ur',
    label: 'Urdu',
    nativeName: 'اردو',
    bcp47: 'ur-IN',
    dir: 'rtl',
    isRtl: true,
  },
];

export const DEFAULT_LANGUAGE = 'en';

export function getLanguageMetadata(code) {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code) || SUPPORTED_LANGUAGES[0];
}
