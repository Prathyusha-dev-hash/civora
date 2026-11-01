import { createContext } from 'react';

export const FONT_SIZES = {
  NORMAL: 'normal',
  LARGE: 'large',
  EXTRA_LARGE: 'extralarge',
};

export const FontSizeContext = createContext({
  fontSize: FONT_SIZES.LARGE,
  setFontSize: () => {},
  isNormal: false,
  isLarge: true,
  isExtraLarge: false,
});

export default FontSizeContext;

