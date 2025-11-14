// src/lib/supabase.js
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
  signInWithGoogle: () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    }),

  // 로그아웃
  signOut: () => supabase.auth.signOut(),

  // 현재 사용자 정보 가져오기
  getCurrentUser: () => supabase.auth.getUser(),

  // 현재 세션 확인
  getSession: () => supabase.auth.getSession(),

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
