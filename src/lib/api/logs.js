/**
 * 📝 로그 API 클라이언트 (캐시 적용)
 * Supabase logs 테이블과 연동
 */

import { supabase } from '../supabase';
import { logCache } from '../cache/logCache';

const API_BASE_URL = 'http://localhost:8000';

export const logsAPI = {
  /**
   * 최근 활동 로그 가져오기 (대시보드용) - 캐시 적용
   * 캠페인 생성, 사이트 등록, 캠페인 완료 등 주요 활동만 표시
   */
  async getRecentActivities(limit = 5) {
    try {
      // 현재 로그인한 사용자 정보 가져오기
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const cacheKey = { limit, userId: user.id };

      // 캐시 확인
      const cached = logCache.get('recent_activities', cacheKey);
      if (cached) {
        return cached;
      }

      // 현재 사용자의 로그만 조회
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('user_id', user.id)  // 사용자별 필터링 추가
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const result = { data, error: null };

      // 캐시 저장 (2분 TTL)
      logCache.set('recent_activities', cacheKey, result, 2 * 60 * 1000);

      console.log('📋 최근 활동 조회 성공:', data?.length || 0, '개 (DB에서 로드)');
      return result;
    } catch (error) {
      console.error('최근 활동 로드 오류:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * 전체 로그 목록 가져오기 (로그 페이지용) - 캐시 적용
   */
  async getAllLogs(filters = {}) {
    try {
      // 현재 로그인한 사용자 정보 가져오기
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const cacheKey = { ...filters, userId: user.id };

      // 캐시 확인
      const cached = logCache.get('all_logs', cacheKey);
      if (cached) {
        return cached;
      }

      // 현재 사용자의 로그만 조회 (사용자별 필터링 추가)
      let query = supabase
        .from('logs')
        .select('*, campaigns(name, site_id)')
        .eq('user_id', user.id)  // 사용자별 필터링 추가
        .order('created_at', { ascending: false });

      // 상태 필터
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // 날짜 필터
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      // 캠페인 ID 필터
      if (filters.campaignId) {
        query = query.eq('campaign_id', filters.campaignId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const result = { data, error: null };

      // 캐시 저장 (3분 TTL)
      logCache.set('all_logs', cacheKey, result, 3 * 60 * 1000);

      console.log('📝 전체 로그 조회 성공:', data?.length || 0, '개 (DB에서 로드)');
      return result;
    } catch (error) {
      console.error('로그 목록 로드 오류:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * 캐시 무효화 (새 로그 생성 시 호출)
   */
  invalidateCache() {
    logCache.invalidateType('all_logs');
    logCache.invalidateType('recent_activities');
    console.log('📝 로그 캐시 무효화 완료');
  },

  /**
   * 특정 캠페인의 로그 가져오기
   */
  async getLogsByCampaign(campaignId) {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('캠페인 로그 로드 오류:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * 로그 통계 가져오기
   */
  async getLogStats() {
    try {
      const { data, error } = await supabase.from('logs').select('status');

      if (error) throw error;

      const stats = {
        total: data.length,
        success: data.filter((log) => log.status === 'success').length,
        failed: data.filter((log) => log.status === 'failed').length,
        pending: data.filter((log) => log.status === 'pending').length,
        processing: data.filter((log) => log.status === 'processing').length
      };

      stats.successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

      return { data: stats, error: null };
    } catch (error) {
      console.error('로그 통계 로드 오류:', error);
      return { data: null, error: error.message };
    }
  }
};
