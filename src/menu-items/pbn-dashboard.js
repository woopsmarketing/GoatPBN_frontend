/**
 * 🎯 PBN SaaS 대시보드 메뉴 아이템
 * 백링크 캠페인 관리를 위한 메뉴 구성
 */

// assets - 아이콘 import
import { Home, Chart, AddCircle, DocumentText, Global, DocumentDownload, MagicStar } from '@wandersonalwes/iconsax-react';

// 아이콘 매핑
const icons = {
  dashboard: Home,
  statistics: Chart,
  campaigns: AddCircle,
  logs: DocumentText,
  sites: Global,
  reports: DocumentDownload,
  contentGenerator: MagicStar
};

// ==============================|| PBN 대시보드 메뉴 ||============================== //

const pbnDashboard = {
  id: 'group-pbn-dashboard',
  title: 'PBN 대시보드',
  type: 'group',
  children: [
    {
      id: 'dashboard-home',
      title: '대시보드',
      type: 'item',
      url: '/dashboard',
      icon: icons.dashboard,
      breadcrumbs: false
    },
    {
      id: 'statistics',
      title: '통계',
      type: 'item',
      url: '/statistics',
      icon: icons.statistics,
      breadcrumbs: false
    },
    {
      id: 'campaigns',
      title: '캠페인 관리',
      type: 'collapse',
      icon: icons.campaigns,
      children: [
        {
          id: 'campaign-create',
          title: '새 캠페인 생성',
          type: 'item',
          url: '/campaigns/create',
          breadcrumbs: false
        },
        {
          id: 'campaign-list',
          title: '캠페인 목록',
          type: 'item',
          url: '/campaigns',
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'sites',
      title: '사이트 관리',
      type: 'collapse',
      icon: icons.sites,
      children: [
        {
          id: 'site-add',
          title: '사이트 추가',
          type: 'item',
          url: '/sites/add',
          breadcrumbs: false
        },
        {
          id: 'site-list',
          title: '사이트 목록',
          type: 'item',
          url: '/sites',
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'content-generator',
      title: 'AI 콘텐츠 생성기',
      type: 'item',
      url: '/content-generator',
      icon: icons.contentGenerator,
      breadcrumbs: false
    },
    {
      id: 'logs',
      title: '로그',
      type: 'item',
      url: '/logs',
      icon: icons.logs,
      breadcrumbs: false
    },
    {
      id: 'reports',
      title: '결과 보고서',
      type: 'item',
      url: '/reports',
      icon: icons.reports,
      breadcrumbs: false
    }
  ]
};

export default pbnDashboard;
