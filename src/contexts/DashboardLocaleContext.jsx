// v1.0 - 대시보드 다국어 컨텍스트 추가 (2025.11.13)
// 기능 요약: 좌측 내비게이션 및 부가 카드 문구를 언어별로 관리하기 위한 컨텍스트
// 사용 예시: <DashboardLocaleProvider value={enDashboardLocale}>...</DashboardLocaleProvider>
'use client';

import PropTypes from 'prop-types';
import { createContext, useContext, useMemo } from 'react';

import defaultMenuItems from 'menu-items';

// 기본 한글 내비게이션 카드 문구 정의
const defaultNavCard = {
  title: '지원이 필요한가요?',
  description: '1 일 이내 지원됩니다.',
  buttonLabel: '문의 하기'
};

// 기본값: 한글 구성
const defaultDashboardLocale = {
  locale: 'ko',
  menuItems: defaultMenuItems,
  navCard: defaultNavCard
};

const DashboardLocaleContext = createContext(defaultDashboardLocale);

// 컨텍스트 제공자: 전달된 값과 기본값을 병합하여 안전하게 전달
export function DashboardLocaleProvider({ value, children }) {
  const mergedValue = useMemo(() => {
    if (!value) {
      return defaultDashboardLocale;
    }

    return {
      locale: value.locale || defaultDashboardLocale.locale,
      menuItems: value.menuItems || defaultDashboardLocale.menuItems,
      navCard: {
        ...defaultNavCard,
        ...(value.navCard || {})
      }
    };
  }, [value]);

  return <DashboardLocaleContext.Provider value={mergedValue}>{children}</DashboardLocaleContext.Provider>;
}

DashboardLocaleProvider.propTypes = {
  value: PropTypes.shape({
    locale: PropTypes.string,
    menuItems: PropTypes.shape({
      items: PropTypes.arrayOf(PropTypes.shape({})).isRequired
    }),
    navCard: PropTypes.shape({
      title: PropTypes.string,
      description: PropTypes.string,
      buttonLabel: PropTypes.string
    })
  }),
  children: PropTypes.node.isRequired
};

DashboardLocaleProvider.defaultProps = {
  value: defaultDashboardLocale
};

// 컨텍스트 훅: 손쉽게 메뉴/문구 접근
export function useDashboardLocale() {
  return useContext(DashboardLocaleContext);
}

export { defaultDashboardLocale };

