'use client';
// v1.1 - 프로덕션 콘솔 로그 비활성화 옵션 추가 (2025.11.24)
// 기능 요약: 배포 환경에서 디버그 로그를 감추고 싶을 때 NEXT_PUBLIC_ENABLE_DEBUG_LOGS 환경변수로 제어
import PropTypes from 'prop-types';
import { useEffect } from 'react';

// next
import { SessionProvider } from 'next-auth/react';

// project-imports
import ThemeCustomization from 'themes';
import { ConfigProvider } from 'contexts/ConfigContext';
import RTLLayout from 'components/RTLLayout';
import Locales from 'components/Locales';
import ScrollTop from 'components/ScrollTop';

import Snackbar from 'components/@extended/Snackbar';

// 전역 옵션: true 로 설정하면 콘솔 로그 유지, 기본값은 false
const DEBUG_LOGS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === 'true';

// ==============================|| PROVIDER WRAPPER  ||============================== //

export default function ProviderWrapper({ children }) {
  useEffect(() => {
    // 한글 주석: 프로덕션에서 console.log/info/debug를 비활성화해 불필요한 로그 제거
    if (DEBUG_LOGS_ENABLED) {
      return undefined;
    }

    const originalConsole = {
      log: console.log,
      info: console.info,
      debug: console.debug
    };

    const noop = () => {
      // 한글 주석: 로그 비활성화 시 아무 일도 하지 않음
    };

    console.log = noop;
    console.info = noop;
    console.debug = noop;

    return () => {
      // 한글 주석: 컴포넌트 언마운트 시 원래 콘솔 메서드 복원
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    };
  }, []);

  return (
    <ConfigProvider>
      <ThemeCustomization>
        <RTLLayout>
          <Locales>
            <ScrollTop>
              <SessionProvider refetchInterval={0}>
                <Snackbar />
                {children}
              </SessionProvider>
            </ScrollTop>
          </Locales>
        </RTLLayout>
      </ThemeCustomization>
    </ConfigProvider>
  );
}

ProviderWrapper.propTypes = { children: PropTypes.node };
