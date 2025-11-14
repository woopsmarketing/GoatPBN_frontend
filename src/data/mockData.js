/**
 * 🗄️ PBN SaaS 대시보드 Mock 데이터
 * 프론트엔드 개발용 더미 데이터 모음
 *
 * 사용법:
 * import { mockSites, mockCampaigns, mockLogs, mockStatistics } from '@/data/mockData';
 */

// 사이트 데이터
export const mockSites = [
  {
    id: 1,
    name: '내 블로그',
    url: 'https://myblog.com',
    username: 'admin',
    password: 'mypassword123',
    app_password: 'abcd efgh ijkl mnop',
    status: 'connected', // connected, disconnected, error
    lastCheck: '2025-09-24T10:00:00Z'
  },
  {
    id: 2,
    name: '회사 블로그',
    url: 'https://companyblog.com',
    username: 'editor',
    password: 'editor2024!',
    app_password: 'qrst uvwx yz12 3456',
    status: 'connected',
    lastCheck: '2025-09-24T09:30:00Z'
  },
  {
    id: 3,
    name: '개인 포트폴리오',
    url: 'https://portfolio.com',
    username: 'writer',
    password: 'writer123!',
    app_password: 'xyza bcde fghi jklm',
    status: 'disconnected',
    lastCheck: '2025-09-23T15:20:00Z'
  }
];

// 캠페인 데이터
export const mockCampaigns = [
  {
    id: 1,
    name: '아르바이트 백링크 캠페인',
    siteId: 1, // 연결된 사이트 ID
    targetSite: 'example1.com',
    keywords: ['아르바이트', '구인구직', '월급 300'],
    quantity: 50, // 총 생성할 콘텐츠 수량
    duration: 20, // 캠페인 기간 (일)
    status: 'active', // active, paused, completed, stopped
    completedCount: 30, // 현재까지 완료된 콘텐츠 수
    progress: 60, // 진행률 (completedCount / quantity * 100)
    dailyTarget: 2.5, // 일일 평균 목표 (quantity / duration)
    createdAt: '2025-09-01T00:00:00Z',
    startedAt: '2025-09-01T09:00:00Z',
    estimatedCompletion: '2025-09-21T09:00:00Z'
  },
  {
    id: 2,
    name: '스포츠중계 백링크 캠페인',
    siteId: 2,
    targetSite: 'example2.com',
    keywords: ['스포츠중계', '축구중계', '프리미어리그 중계'],
    quantity: 100,
    duration: 15,
    status: 'active',
    completedCount: 85,
    progress: 85,
    dailyTarget: 6.67,
    createdAt: '2025-09-05T00:00:00Z',
    startedAt: '2025-09-05T10:00:00Z',
    estimatedCompletion: '2025-09-20T10:00:00Z'
  },
  {
    id: 3,
    name: '대구맛집 백링크 캠페인',
    siteId: 1,
    targetSite: 'example3.com',
    keywords: ['대구맛집', '서울맛집', '홍대맛집'],
    quantity: 80,
    duration: 30,
    status: 'completed',
    completedCount: 80,
    progress: 100,
    dailyTarget: 2.67,
    createdAt: '2025-08-01T00:00:00Z',
    startedAt: '2025-08-01T08:00:00Z',
    completedAt: '2025-08-30T18:00:00Z'
  }
];

// 로그 데이터
export const mockLogs = [
  {
    id: 1,
    campaignId: 1,
    campaignName: '아르바이트 백링크 캠페인',
    contentTitle: '2025년 최고 아르바이트 추천 사이트',
    targetSite: 'example1.com',
    keyword: '아르바이트',
    status: 'success', // success, failed, pending, processing
    publishedUrl: 'https://myblog.com/posts/best-part-time-jobs-2025',
    createdAt: '2025-09-24T10:30:00Z',
    errorMessage: null
  },
  {
    id: 2,
    campaignId: 2,
    campaignName: '스포츠중계 백링크 캠페인',
    contentTitle: '프리미어리그 무료 시청 가이드',
    targetSite: 'example2.com',
    keyword: '프리미어리그 중계',
    status: 'failed',
    publishedUrl: null,
    createdAt: '2025-09-24T09:15:00Z',
    errorMessage: 'WordPress API 연결 실패: 401 Unauthorized'
  },
  {
    id: 3,
    campaignId: 1,
    campaignName: '아르바이트 백링크 캠페인',
    contentTitle: '구인구직 사이트 완전 정리',
    targetSite: 'example1.com',
    keyword: '구인구직',
    status: 'success',
    publishedUrl: 'https://myblog.com/posts/job-search-complete-guide',
    createdAt: '2025-09-24T08:45:00Z',
    errorMessage: null
  },
  {
    id: 4,
    campaignId: 3,
    campaignName: '대구맛집 백링크 캠페인',
    contentTitle: '홍대 숨은 맛집 베스트 10',
    targetSite: 'example3.com',
    keyword: '홍대맛집',
    status: 'processing',
    publishedUrl: null,
    createdAt: '2025-09-24T11:00:00Z',
    errorMessage: null
  }
];

// 통계 데이터
export const mockStatistics = {
  overview: {
    totalCampaigns: 3,
    activeCampaigns: 2,
    completedCampaigns: 1,
    totalSites: 3,
    totalContentGenerated: 195,
    successRate: 94.2
  },
  subscription: {
    plan: 'Pro',
    creditsUsed: 120,
    creditsTotal: 200,
    creditsRemaining: 80,
    expiryDate: '2025-12-31',
    autoRenew: true
  },
  systemStatus: {
    wordpressSites: {
      connected: 2,
      disconnected: 1,
      total: 3
    },
    apiResponseTime: 245, // ms
    serverStatus: 'healthy',
    lastCheck: '2025-09-24T10:30:00Z'
  },
  dailyGoals: {
    todayTarget: 8,
    todayGenerated: 5,
    weeklyTarget: 56,
    weeklyGenerated: 42,
    monthlyTarget: 240,
    monthlyGenerated: 195
  },
  performance: {
    weeklyComparison: {
      thisWeek: 42,
      lastWeek: 38,
      change: 10.5 // percentage
    },
    topKeywords: [
      { keyword: '아르바이트', count: 25, successRate: 96 },
      { keyword: '스포츠중계', count: 18, successRate: 89 },
      { keyword: '대구맛집', count: 15, successRate: 100 },
      { keyword: '구인구직', count: 12, successRate: 92 },
      { keyword: '월급 300', count: 8, successRate: 88 }
    ]
  },
  faq: [
    {
      id: 1,
      question: '캠페인 생성 후 언제부터 시작되나요?',
      answer: '즉시 시작을 선택하면 바로 시작되고, 예약 시작을 선택하면 설정한 시간에 자동으로 시작됩니다.'
    },
    {
      id: 2,
      question: 'WordPress 사이트 연결이 실패하는 이유는?',
      answer: '사용자명, 비밀번호, 앱 패스워드가 정확한지 확인해주세요. WordPress REST API가 활성화되어 있어야 합니다.'
    },
    {
      id: 3,
      question: '크레딧은 어떻게 소모되나요?',
      answer: '콘텐츠 1개 생성당 1크레딧이 소모됩니다. 실패한 작업은 크레딧이 차감되지 않습니다.'
    },
    {
      id: 4,
      question: '캠페인을 중지할 수 있나요?',
      answer: '네, 언제든지 캠페인을 일시정지하거나 완전 중지할 수 있습니다. 진행률은 유지됩니다.'
    }
  ],
  campaignProgress: [
    { campaignId: 1, name: '아르바이트 백링크', progress: 60, status: 'active' },
    { campaignId: 2, name: '스포츠중계 백링크', progress: 85, status: 'active' },
    { campaignId: 3, name: '대구맛집 백링크', progress: 100, status: 'completed' }
  ],
  dailyActivity: [
    { date: '2025-09-20', generated: 8, success: 7, failed: 1 },
    { date: '2025-09-21', generated: 6, success: 6, failed: 0 },
    { date: '2025-09-22', generated: 9, success: 8, failed: 1 },
    { date: '2025-09-23', generated: 7, success: 7, failed: 0 },
    { date: '2025-09-24', generated: 5, success: 4, failed: 1 }
  ]
};

// 유틸리티 함수들
export const utils = {
  // 진행률 계산 함수
  calculateProgress: (completedCount, quantity) => {
    return Math.round((completedCount / quantity) * 100);
  },

  // 일일 목표 계산 함수
  calculateDailyTarget: (quantity, duration) => {
    return Math.round((quantity / duration) * 100) / 100; // 소수점 2자리
  },

  // 사이트 이름으로 사이트 찾기
  findSiteById: (siteId) => {
    return mockSites.find((site) => site.id === siteId);
  },

  // 상태별 색상 반환
  getStatusColor: (status) => {
    const colors = {
      active: 'text-blue-600 bg-blue-100',
      paused: 'text-yellow-600 bg-yellow-100',
      completed: 'text-green-600 bg-green-100',
      stopped: 'text-gray-600 bg-gray-100',
      success: 'text-green-600 bg-green-100',
      failed: 'text-red-600 bg-red-100',
      pending: 'text-yellow-600 bg-yellow-100',
      processing: 'text-blue-600 bg-blue-100',
      connected: 'text-green-600 bg-green-100',
      disconnected: 'text-red-600 bg-red-100',
      error: 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  },

  // 날짜 포맷팅 함수
  formatDate: (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};
