// v1.2 - SSO URL 해시 세션 동기화 지원 (2026.01.21)
// 한글 주석: Supabase 클라이언트 설정 및 인증 관리
// 목적: 프론트엔드에서 Supabase 데이터베이스와 통신하기 위한 연결 설정

import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경 변수가 설정되지 않았으면 에러 발생
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.');
}

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 인증 관련 함수들
export const authAPI = {
  // 구글 로그인
  signInWithGoogle: (customOptions = {}) => {
    const defaultRedirect = typeof window !== 'undefined' ? `${window.location.origin}` : supabaseUrl || '';
    const options = { redirectTo: defaultRedirect, ...customOptions };
    return supabase.auth.signInWithOAuth({ provider: 'google', options });
  },

  // 로그아웃
  signOut: () => supabase.auth.signOut(),

  // 현재 사용자 정보 가져오기
  getCurrentUser: () => supabase.auth.getUser(),

  // 현재 세션 확인
  getSession: () => supabase.auth.getSession(),

  // 한글 주석: URL 해시의 토큰을 감지해 세션을 강제로 동기화합니다(SSO 대응).
  syncSessionFromUrlHash: async () => {
    try {
      if (typeof window === 'undefined') return { synced: false };
      const hash = window.location.hash || '';
      if (!hash.includes('access_token')) return { synced: false };
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (!accessToken || !refreshToken) return { synced: false };
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (error) throw error;
      // 한글 주석: URL 해시를 제거해 재실행을 방지합니다.
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState({}, document.title, cleanUrl);
      return { synced: true, session: data?.session || null };
    } catch (err) {
      console.warn('SSO 세션 동기화 실패:', err);
      return { synced: false, error: err };
    }
  },

  // 인증 상태 변화 감지
  onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback)
};

// 데이터베이스 관련 함수들
export const dbAPI = {
  // 사이트 목록 조회
  getSites: (userId) => supabase.from('sites').select('*').eq('user_id', userId).order('created_at', { ascending: false }),

  // 사이트 등록
  createSite: (siteData) => supabase.from('sites').insert([siteData]),

  // 캠페인 목록 조회
  getCampaigns: (userId, filters = {}) => {
    let query = supabase
      .from('campaigns')
      .select(
        `
        *,
        sites(name, url),
        logs(count)
      `
      )
      .eq('user_id', userId);

    if (filters.status) query = query.eq('status', filters.status);
    return query.order('created_at', { ascending: false });
  },

  // 캠페인 생성
  createCampaign: (campaignData) => supabase.from('campaigns').insert([campaignData]),

  // 로그 목록 조회
  getLogs: (userId, filters = {}) => {
    let query = supabase
      .from('logs')
      .select(
        `
        *,
        campaigns(name)
      `
      )
      .eq('user_id', userId);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.campaign_id) query = query.eq('campaign_id', filters.campaign_id);

    return query.order('created_at', { ascending: false });
  }
};

// 실시간 구독 관련 함수들
export const realtimeAPI = {
  // 캠페인 진행률 실시간 구독
  subscribeToCampaigns: (userId, callback) => {
    return supabase
      .channel('campaigns')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  },

  // 로그 실시간 구독
  subscribeToLogs: (userId, callback) => {
    return supabase
      .channel('logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'logs',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }
};

// 알림 관리 유틸리티
export const notificationAPI = {
  // v1.0 - 사용자 알림 목록 조회 (2025.11.24)
  // 한글 주석: 지정된 사용자 ID에 대한 최신 알림을 가져옴
  fetchNotifications: async (userId, limit = 20) => {
    return supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  },

  // v1.0 - 알림 개별 읽음 처리
  markAsRead: async (notificationId) => {
    return supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId);
  },

  // v1.0 - 사용자 전체 알림 읽음 처리
  markAllAsRead: async (userId) => {
    return supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
  },

  // v1.0 - 실시간 알림 구독
  // 한글 주석: 새로운 알림 insert/update 이벤트를 수신해 콜백으로 전달
  subscribeToUserNotifications: (userId, callback) => {
    return supabase
      .channel(`notifications-user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }
};
