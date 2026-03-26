/**
 * 🎯 PBN SaaS 대시보드 메뉴 아이템
 * 백링크 캠페인 관리를 위한 메뉴 구성
 */

// assets - 아이콘 import
import { Home, Chart, AddCircle, DocumentText, Global, DocumentDownload, MagicStar, Setting2 } from '@wandersonalwes/iconsax-react';

// 아이콘 매핑
const icons = {
  dashboard: Home,
  statistics: Chart,
  campaigns: AddCircle,
  logs: DocumentText,
  sites: Global,
  reports: DocumentDownload,
  contentGenerator: MagicStar,
  settings: Setting2
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
      id: 'spintax-templates',
      title: '스핀택스 템플릿',
      type: 'collapse',
      icon: icons.contentGenerator,
      children: [
        {
          id: 'template-list',
          title: '템플릿 목록',
          type: 'item',
          url: '/templates',
          breadcrumbs: false
        },
        {
          id: 'template-create',
          title: '새 템플릿 생성',
          type: 'item',
          url: '/templates/create',
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
    },
    {
      id: 'settings',
      title: '설정',
      type: 'collapse',
      icon: icons.settings,
      children: [
        {
          id: 'settings-account',
          title: '계정 설정',
          type: 'item',
          url: '/settings',
          breadcrumbs: false
        },
        {
          id: 'settings-api-keys',
          title: 'API 키 관리',
          type: 'item',
          url: '/settings/api-keys',
          breadcrumbs: false
        }
      ]
    }
  ]
};

export default pbnDashboard;
