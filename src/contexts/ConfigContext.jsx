import PropTypes from 'prop-types';
import { createContext, useCallback } from 'react';

// project-imports
import config from 'config';
import useLocalStorage from 'hooks/useLocalStorage';
import { MenuOrientation } from 'config';

// initial state
const initialState = {
  ...config,
  onChangeContainer: () => {},
  onChangeLocalization: () => {},
  onChangeMode: () => {},
  onChangePresetColor: () => {},
  onChangeDirection: () => {},
  onChangeMiniDrawer: () => {},
  onChangeMenuOrientation: () => {},
  onChangeMenuCaption: () => {},
  onChangeFontFamily: () => {},
  onChangeContrast: () => {}
};

// ==============================|| CONFIG CONTEXT & PROVIDER ||============================== //

const ConfigContext = createContext(initialState);

function ConfigProvider({ children }) {
  const [config, setConfig] = useLocalStorage('able-pro-material-next-ts-config', initialState);

  const onChangeContainer = useCallback(
    (container) => {
      setConfig((prev) => ({
        ...prev,
        container: container !== 'fluid'
      }));
    },
    [setConfig]
  );

  const onChangeLocalization = useCallback(
    (lang) => {
      setConfig((prev) => ({ ...prev, i18n: lang }));
    },
    [setConfig]
  );

  const onChangeMode = useCallback(
    (mode) => {
      setConfig((prev) => ({ ...prev, mode }));
    },
    [setConfig]
  );

  const onChangePresetColor = useCallback(
    (theme) => {
      setConfig((prev) => ({ ...prev, presetColor: theme }));
    },
    [setConfig]
  );

  const onChangeDirection = useCallback(
    (direction) => {
      setConfig((prev) => ({ ...prev, themeDirection: direction }));
    },
    [setConfig]
  );

  const onChangeMiniDrawer = useCallback(
    (miniDrawer) => {
      setConfig((prev) => ({ ...prev, menuOrientation: MenuOrientation.VERTICAL, miniDrawer }));
    },
    [setConfig]
  );

  const onChangeMenuOrientation = useCallback(
    (layout) => {
      setConfig((prev) => ({
        ...prev,
        menuOrientation: layout,
        ...(layout === MenuOrientation.VERTICAL && { miniDrawer: false })
      }));
    },
    [setConfig]
  );

  const onChangeContrast = useCallback(
    (themeContrast) => {
      setConfig((prev) => ({ ...prev, themeContrast: themeContrast === 'contrast' }));
    },
    [setConfig]
  );

  const onChangeMenuCaption = useCallback(
    (menuCaption) => {
      setConfig((prev) => ({ ...prev, menuCaption: menuCaption === 'caption' }));
    },
    [setConfig]
  );

  const onChangeFontFamily = useCallback(
    (fontFamily) => {
      setConfig((prev) => ({ ...prev, fontFamily }));
    },
    [setConfig]
  );

  return (
    <ConfigContext.Provider
      value={{
        ...config,
        onChangeContainer,
        onChangeLocalization,
        onChangeMode,
        onChangePresetColor,
        onChangeDirection,
        onChangeMiniDrawer,
        onChangeMenuOrientation,
        onChangeMenuCaption,
        onChangeFontFamily,
        onChangeContrast
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export { ConfigProvider, ConfigContext };

ConfigProvider.propTypes = { children: PropTypes.node };
