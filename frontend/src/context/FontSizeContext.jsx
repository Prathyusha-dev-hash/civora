import { useEffect, useMemo } from 'react';
import { FontSizeContext, FONT_SIZES } from './font-size-context';

export function FontSizeProvider({ children }) {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font-size', FONT_SIZES.LARGE);
    }
  }, []);

  const value = useMemo(
    () => ({
      fontSize: FONT_SIZES.LARGE,
      setFontSize: () => {},
      isNormal: false,
      isLarge: true,
      isExtraLarge: false,
    }),
    []
  );

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  );
}

export default FontSizeProvider;
