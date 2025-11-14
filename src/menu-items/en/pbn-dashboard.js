/**
 * 🎯 PBN Dashboard 메뉴 아이템 (EN)
 * 목적: 영문 전용 내비게이션 구성을 제공
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

// ==============================|| PBN DASHBOARD MENU (EN) ||============================== //

const pbnDashboardEn = {
  id: 'group-pbn-dashboard-en',
  title: 'PBN 대시보드',
  type: 'group',
  children: [
    {
      id: 'dashboard-home-en',
      title: '대시보드',
      type: 'item',
      url: '/en/dashboard',
      icon: icons.dashboard,
      breadcrumbs: false
    },
    {
      id: 'statistics-en',
      title: '통계',
      type: 'item',
      url: '/en/statistics',
      icon: icons.statistics,
      breadcrumbs: false
    },
    {
      id: 'campaigns-en',
      title: '캠페인 관리',
      type: 'collapse',
      icon: icons.campaigns,
      children: [
        {
          id: 'campaign-create-en',
          title: '새 캠페인 생성',
          type: 'item',
          url: '/en/campaigns/create',
          breadcrumbs: false
        },
        {
          id: 'campaign-list-en',
          title: '캠페인 목록',
          type: 'item',
          url: '/en/campaigns',
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'sites-en',
      title: '사이트 관리',
      type: 'collapse',
      icon: icons.sites,
      children: [
        {
          id: 'site-add-en',
          title: '사이트 추가',
          type: 'item',
          url: '/en/sites/add',
          breadcrumbs: false
        },
        {
          id: 'site-list-en',
          title: '사이트 목록',
          type: 'item',
          url: '/en/sites',
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'content-generator-en',
      title: 'AI 콘텐츠 생성기',
      type: 'item',
      url: '/en/content-generator',
      icon: icons.contentGenerator,
      breadcrumbs: false
    },
    {
      id: 'logs-en',
      title: '로그',
      type: 'item',
      url: '/en/logs',
      icon: icons.logs,
      breadcrumbs: false
    },
    {
      id: 'reports-en',
      title: '결과 보고서',
      type: 'item',
      url: '/en/reports',
      icon: icons.reports,
      breadcrumbs: false
    }
  ]
};

export default pbnDashboardEn;
