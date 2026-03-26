// 스핀택스 템플릿 API 클라이언트
// 템플릿 CRUD + 생성 상태 폴링

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

  // fallback: getSession에서 시도
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

export const spintaxAPI = {
  // 내 템플릿 목록 조회 (경량 — template_data 제외)
  async getTemplates() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('로그인이 필요합니다.');

    const response = await fetch(buildApiUrl(`/api/spintax/templates?user_id=${userId}`));
    if (!response.ok) throw new Error('템플릿 목록 조회 실패');
    return response.json();
  },

  // 준비된 템플릿만 조회 (캠페인 생성 시 드롭다운용)
  async getReadyTemplates() {
    const result = await this.getTemplates();
    if (result.success && result.templates) {
      return {
        ...result,
        templates: result.templates.filter((t) => t.status === 'ready')
      };
    }
    return result;
  },

  // 템플릿 생성 요청 (Celery 비동기, 약 40분 소요)
  async createTemplate({ keywords, name, contentLanguage = 'ko' }) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('로그인이 필요합니다. 다시 로그인 해주세요.');

    const response = await fetch(buildApiUrl('/api/spintax/templates'), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        user_id: userId,
        keywords,
        name,
        content_language: contentLanguage
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: '서버 응답 오류' }));
      throw new Error(error.detail || '템플릿 생성 요청 실패');
    }
    return response.json();
  },

  // 템플릿 생성 진행률 조회 (폴링용)
  async getTemplateStatus(templateId) {
    const response = await fetch(buildApiUrl(`/api/spintax/templates/${templateId}/status`));
    if (!response.ok) throw new Error('상태 조회 실패');
    return response.json();
  },

  // 템플릿 삭제
  async deleteTemplate(templateId) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('로그인이 필요합니다.');

    const response = await fetch(buildApiUrl(`/api/spintax/templates/${templateId}?user_id=${userId}`), {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('템플릿 삭제 실패');
    return response.json();
  }
};
