import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getLanguageMetadata } from './languages';
import en from './translations/en';
import hi from './translations/hi';
import ta from './translations/ta';
import te from './translations/te';
import kn from './translations/kn';
import ml from './translations/ml';
import mr from './translations/mr';
import bn from './translations/bn';
import gu from './translations/gu';
import pa from './translations/pa';
import ur from './translations/ur';

export const TRANSLATIONS = {
  en,
  hi,
  ta,
  te,
  kn,
  ml,
  mr,
  bn,
  gu,
  pa,
  ur,
};

/**
 * Resolves a dotted key path (e.g. 'auth.login.title') from an object.
 */
function resolvePath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Interpolates parameters like {name} into a translated string.
 */
function interpolate(template, params) {
  if (typeof template !== 'string' || !params || typeof params !== 'object') {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, paramKey) => {
    return paramKey in params ? String(params[paramKey]) : match;
  });
}

/**
 * Returns translated string for a given key, interpolating params,
 * with graceful fallback to English and then to the key itself.
 */
export function translate(langCode, key, params = {}) {
  const targetLang = langCode || DEFAULT_LANGUAGE;
  const primaryDict = TRANSLATIONS[targetLang] || TRANSLATIONS[DEFAULT_LANGUAGE];
  const fallbackDict = TRANSLATIONS[DEFAULT_LANGUAGE];

  let raw = resolvePath(primaryDict, key);
  if (raw === undefined && primaryDict !== fallbackDict) {
    raw = resolvePath(fallbackDict, key);
  }

  if (raw === undefined) {
    return key;
  }

  return interpolate(raw, params);
}

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getLanguageMetadata };

