// v1.0 - 영문 대시보드 레이아웃 (2025.11.13)
// 기능 요약: /en 하위 대시보드 페이지에 영문 내비게이션/레이아웃 제공
// 사용 예시: /en/dashboard
'use client';

import PropTypes from 'prop-types';

// project-imports
import DashboardLayout from 'layout/DashboardLayout';
import AuthGuard from 'utils/route-guard/AuthGuard';
import { DashboardLocaleProvider } from 'contexts/DashboardLocaleContext';
import menuItemsEn from 'menu-items/en';

const enDashboardLocale = {
  locale: 'en',
  menuItems: menuItemsEn,
  navCard: {
    title: 'Need support?',
    description: 'We respond within 1 business day.',
    buttonLabel: 'Contact us'
  }
};

export default function Layout({ children }) {
  return (
    <AuthGuard>
      <DashboardLocaleProvider value={enDashboardLocale}>
        <DashboardLayout>{children}</DashboardLayout>
      </DashboardLocaleProvider>
    </AuthGuard>
  );
}

Layout.propTypes = { children: PropTypes.node };

