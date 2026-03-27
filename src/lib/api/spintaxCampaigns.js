// 스핀택스 캠페인 API 클라이언트
// spintax_campaigns 테이블 전용 (기존 campaigns와 완전 분리)

import { buildApiUrl, jsonHeaders } from './httpClient';
import { supabase } from '../supabase';

async function getCurrentUserId() {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user) return user.id;
  } catch (e) {
    console.warn('supabase.auth.getUser 실패:', e.message);
  }
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (session?.user) return session.user.id;
  } catch (e) {
    console.warn('supabase.auth.getSession 실패:', e.message);
  }
  return null;
}

export const spintaxCampaignsAPI = {
  // 스핀택스 캠페인 목록
  async getCampaigns() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('로그인이 필요합니다.');

    const response = await fetch(buildApiUrl(`/api/spintax/campaigns?user_id=${userId}`));
    if (!response.ok) throw new Error('스핀택스 캠페인 목록 조회 실패');
    return response.json();
  },

  // 스핀택스 캠페인 생성
  async createCampaign(data) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('로그인이 필요합니다.');

    const response = await fetch(buildApiUrl('/api/spintax/campaigns'), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        user_id: userId,
        ...data
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: '서버 응답 오류' }));
      throw new Error(error.detail || '스핀택스 캠페인 생성 실패');
    }
    return response.json();
  },

  // 스핀택스 캠페인 상세
  async getCampaign(campaignId) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('로그인이 필요합니다.');

    const response = await fetch(buildApiUrl(`/api/spintax/campaigns/${campaignId}?user_id=${userId}`));
    if (!response.ok) throw new Error('캠페인 조회 실패');
    return response.json();
  },

  // 스핀택스 캠페인 중지
  async stopCampaign(campaignId) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('로그인이 필요합니다.');

    const response = await fetch(buildApiUrl(`/api/spintax/campaigns/${campaignId}/stop?user_id=${userId}`), {
      method: 'POST'
    });
    if (!response.ok) throw new Error('캠페인 중지 실패');
    return response.json();
  },

  // 스핀택스 캠페인 삭제
  async deleteCampaign(campaignId) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('로그인이 필요합니다.');

    const response = await fetch(buildApiUrl(`/api/spintax/campaigns/${campaignId}?user_id=${userId}`), {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('캠페인 삭제 실패');
    return response.json();
  }
};
