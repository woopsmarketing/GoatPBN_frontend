// next
import { Inter } from 'next/font/google';

// ==============================|| THEME CONSTANT ||============================== //

export const APP_DEFAULT_PATH = '/dashboard';
export const HORIZONTAL_MAX_ITEM = 8;
export const DRAWER_WIDTH = 280;
export const MINI_DRAWER_WIDTH = 90;
export const HEADER_HEIGHT = 74;

const inter = Inter({
  subsets: ['latin'],
  fallback: ['sans-serif'],
  weight: ['300', '400', '500', '700'],
  adjustFontFallback: false
});

export let ThemeMode;
(function (ThemeMode) {
  ThemeMode['LIGHT'] = 'light';
  ThemeMode['DARK'] = 'dark';
  ThemeMode['AUTO'] = 'auto';
})(ThemeMode || (ThemeMode = {}));

export let MenuOrientation;
(function (MenuOrientation) {
  MenuOrientation['VERTICAL'] = 'vertical';
  MenuOrientation['HORIZONTAL'] = 'horizontal';
})(MenuOrientation || (MenuOrientation = {}));

export let ThemeDirection;
(function (ThemeDirection) {
  ThemeDirection['LTR'] = 'ltr';
  ThemeDirection['RTL'] = 'rtl';
})(ThemeDirection || (ThemeDirection = {}));

export let NavActionType;
(function (NavActionType) {
  NavActionType['FUNCTION'] = 'function';
  NavActionType['LINK'] = 'link';
})(NavActionType || (NavActionType = {}));

// ==============================|| THEME CONFIG ||============================== //

const config = {
  fontFamily: inter.style.fontFamily,
  i18n: 'en',
  menuOrientation: MenuOrientation.VERTICAL,
  menuCaption: true,
  miniDrawer: false,
  container: true,
  mode: ThemeMode.LIGHT,
  presetColor: 'default',
  themeDirection: ThemeDirection.LTR,
  themeContrast: false
};

export default config;
