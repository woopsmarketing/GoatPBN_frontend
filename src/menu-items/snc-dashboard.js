/**
 * Next.js PBN (SNC) 사이드바 메뉴 — Phase 4 격리 개발.
 *
 * 기존 PBN 대시보드 메뉴(pbn-dashboard.js)와 별도 그룹으로 표시.
 * 캠페인 외 화면(사이트/로그/생성 폼)은 후속 phase 에서 추가.
 */

import { AddCircle, DocumentText, DocumentDownload } from '@wandersonalwes/iconsax-react';

const icons = {
  campaigns: AddCircle,
  logs: DocumentText,
  reports: DocumentDownload
};

const sncDashboard = {
  id: 'group-snc-dashboard',
  title: 'Next.js PBN',
  type: 'group',
  children: [
    {
      id: 'snc-campaigns',
      title: 'SNC 캠페인',
      type: 'collapse',
      icon: icons.campaigns,
      children: [
        {
          id: 'snc-campaign-create',
          title: '새 캠페인 생성',
          type: 'item',
          url: '/snc/campaigns/create',
          breadcrumbs: false
        },
        {
          id: 'snc-campaign-list',
          title: '캠페인 목록',
          type: 'item',
          url: '/snc/campaigns',
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'snc-logs',
      title: '로그',
      type: 'item',
      url: '/snc/logs',
      icon: icons.logs,
      breadcrumbs: false
    },
    {
      id: 'snc-reports',
      title: '결과 보고서',
      type: 'item',
      url: '/snc/reports',
      icon: icons.reports,
      breadcrumbs: false
    }
  ]
};

export default sncDashboard;
