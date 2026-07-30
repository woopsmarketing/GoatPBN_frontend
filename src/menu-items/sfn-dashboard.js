/**
 * Site Factory PBN (SFN) 사이드바 메뉴 — 격리 개발.
 *
 * site-factory-next 블로그 팜으로 발행하는 신규 캠페인 시스템 (docs/캠페인시스템-설계.md).
 * 기존 SNC 메뉴(snc-dashboard.js)와 별도 그룹으로 표시.
 * title 은 리터럴 한국어 — 사이드바 FormattedMessage 의 id-fallback 패턴 (SNC 와 동일).
 */

import { AddCircle, DocumentText, DocumentDownload } from '@wandersonalwes/iconsax-react';

const icons = {
  campaigns: AddCircle,
  logs: DocumentText,
  reports: DocumentDownload
};

const sfnDashboard = {
  id: 'group-sfn-dashboard',
  title: 'Site Factory PBN',
  type: 'group',
  children: [
    {
      id: 'sfn-campaigns',
      title: 'SFN 캠페인',
      type: 'collapse',
      icon: icons.campaigns,
      children: [
        {
          id: 'sfn-campaign-create',
          title: '새 캠페인 생성',
          type: 'item',
          url: '/sfn/campaigns/create',
          breadcrumbs: false
        },
        {
          id: 'sfn-campaign-create-spintax',
          title: '스핀택스 캠페인 생성',
          type: 'item',
          url: '/sfn/campaigns/create-spintax',
          breadcrumbs: false
        },
        {
          id: 'sfn-campaign-list',
          title: '캠페인 목록',
          type: 'item',
          url: '/sfn/campaigns',
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'sfn-logs',
      title: '로그',
      type: 'item',
      url: '/sfn/logs',
      icon: icons.logs,
      breadcrumbs: false
    },
    {
      id: 'sfn-reports',
      title: '결과 보고서',
      type: 'item',
      url: '/sfn/reports',
      icon: icons.reports,
      breadcrumbs: false
    }
  ]
};

export default sfnDashboard;
