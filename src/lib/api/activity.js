// v1.0 - 사용자 활동 로그 API 클라이언트 (2025.10.01)

/**
 * 사용자 활동 로그 관련 API 호출 함수들 (캐시 적용)
 *
 * 주요 기능:
 * - 최근 활동 조회 (캐시 적용)
 * - 활동 통계 조회 (캐시 적용)
 * - 활동 타입 목록 조회
 */

import { logCache } from '../cache/logCache';
import { buildApiUrl, jsonHeaders } from './httpClient';

export const activityAPI = {
  /**
   * 최근 활동 로그 조회 (캐시 적용)
   * @param {Object} options - 조회 옵션
   * @param {number} options.limit - 조회할 활동 수 (기본: 50)
   * @param {string} options.userId - 특정 사용자 ID (선택사항)
   * @param {string} options.activityType - 활동 타입 필터 (선택사항)
   * @returns {Promise<Object>} API 응답
   */
  async getRecentActivities(options = {}) {
    const { limit = 50, userId, activityType } = options;
    const cacheKey = { limit, userId, activityType };

    // 캐시 확인
    const cached = logCache.get('activities', cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());

      if (userId) {
        params.append('user_id', userId);
      }

      if (activityType) {
        params.append('activity_type', activityType);
      }

      const requestUrl = `${buildApiUrl('/api/activity/recent')}?${params.toString()}`;
      const response = await fetch(requestUrl, { method: 'GET', headers: jsonHeaders() });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const result = { data, error: null };

      // 캐시 저장 (1분 TTL - 활동 로그는 자주 업데이트됨)
      logCache.set('activities', cacheKey, result, 1 * 60 * 1000);

      console.log('📋 최근 활동 조회 성공:', data.length, '개 (API에서 로드)');
      return result;
    } catch (error) {
      console.error('❌ 최근 활동 조회 실패:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * 활동 통계 조회
   * @param {string} userId - 특정 사용자 ID (선택사항)
   * @returns {Promise<Object>} API 응답
   */
  async getActivityStats(userId = null) {
    try {
      const params = new URLSearchParams();

      if (userId) {
        params.append('user_id', userId);
      }

      let url = buildApiUrl('/api/activity/stats');
      if (params.toString()) {
        url = `${url}?${params.toString()}`;
      }

      const response = await fetch(url, { method: 'GET', headers: jsonHeaders() });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 활동 통계 조회 성공:', data);

      return { data, error: null };
    } catch (error) {
      console.error('❌ 활동 통계 조회 실패:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * 활동 타입 목록 조회
   * @returns {Promise<Object>} API 응답
   */
  async getActivityTypes() {
    try {
      const response = await fetch(buildApiUrl('/api/activity/types'), { method: 'GET', headers: jsonHeaders() });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📝 활동 타입 조회 성공:', data.total_types, '개');

      return { data, error: null };
    } catch (error) {
      console.error('❌ 활동 타입 조회 실패:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * 오래된 활동 로그 정리
   * @param {number} days - 보관 기간 (일, 기본: 90)
   * @returns {Promise<Object>} API 응답
   */
  async cleanupOldActivities(days = 90) {
    try {
      const response = await fetch(`${buildApiUrl('/api/activity/cleanup')}?days=${days}`, {
        method: 'DELETE',
        headers: jsonHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🧹 활동 로그 정리 성공:', data);

      return { data, error: null };
    } catch (error) {
      console.error('❌ 활동 로그 정리 실패:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * 활동 로그 API 상태 확인
   * @returns {Promise<Object>} API 응답
   */
  async healthCheck() {
    try {
      const response = await fetch(buildApiUrl('/api/activity/health'), { method: 'GET', headers: jsonHeaders() });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('💚 활동 로그 API 상태:', data.status);

      return { data, error: null };
    } catch (error) {
      console.error('❌ 활동 로그 API 상태 확인 실패:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * 활동 타입별 아이콘 반환
   * @param {string} activityType - 활동 타입
   * @returns {string} 아이콘 이모지
   */
  getActivityIcon(activityType) {
    const iconMap = {
      login: '🔐',
      logout: '🚪',
      campaign_create: '📝',
      campaign_edit: '✏️',
      campaign_delete: '🗑️',
      campaign_start: '▶️',
      campaign_pause: '⏸️',
      campaign_resume: '▶️',
      site_add: '🌐',
      site_edit: '⚙️',
      site_delete: '❌',
      connection_test: '🔌',
      content_generate: '📄',
      settings_change: '⚙️',
      report_download: '📊',
      export_data: '📤'
    };

    return iconMap[activityType] || '📋';
  },

  /**
   * 활동 타입별 색상 클래스 반환
   * @param {string} activityType - 활동 타입
   * @returns {string} Tailwind CSS 색상 클래스
   */
  getActivityColor(activityType) {
    const colorMap = {
      login: 'bg-green-500',
      logout: 'bg-gray-500',
      campaign_create: 'bg-blue-500',
      campaign_edit: 'bg-yellow-500',
      campaign_delete: 'bg-red-500',
      campaign_start: 'bg-green-500',
      campaign_pause: 'bg-orange-500',
      campaign_resume: 'bg-green-500',
      site_add: 'bg-purple-500',
      site_edit: 'bg-indigo-500',
      site_delete: 'bg-red-500',
      connection_test: 'bg-teal-500',
      content_generate: 'bg-emerald-500',
      settings_change: 'bg-gray-500',
      report_download: 'bg-blue-500',
      export_data: 'bg-cyan-500'
    };

    return colorMap[activityType] || 'bg-gray-500';
  },

  /**
   * UTC 시간을 클라이언트 시간대로 자동 변환
   * @param {string} dateString - UTC 시간 문자열
   * @returns {string} 포맷된 날짜 문자열
   */
  formatKoreanTime(dateString) {
    if (!dateString) return 'Invalid Date';

    try {
      console.log('🔍 활동 API 원본 시간:', dateString);

      // UTC 시간으로 파싱 (백엔드에서 UTC로 저장됨)
      const utcDate = new Date(dateString);

      // 유효한 날짜인지 확인
      if (isNaN(utcDate.getTime())) {
        console.warn('❌ Invalid date detected:', dateString);
        return 'Invalid Date';
      }

      // 클라이언트의 로컬 시간대로 자동 변환
      const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localTime = utcDate.toLocaleString('ko-KR', {
        timeZone: clientTimeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      console.log('🌍 활동 API 시간대 변환:', {
        original: dateString,
        utc: utcDate.toISOString(),
        clientTimeZone: clientTimeZone,
        displayed: localTime
      });

      return localTime;
    } catch (error) {
      console.error('❌ 활동 API 날짜 포맷팅 오류:', error);
      return dateString;
    }
  },

  /**
   * 상대 시간 계산 (예: "2시간 전")
   * @param {string} dateString - ISO 날짜 문자열
   * @returns {string} 상대 시간 문자열
   */
  getRelativeTime(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) {
        return '방금 전';
      } else if (diffMinutes < 60) {
        return `${diffMinutes}분 전`;
      } else if (diffHours < 24) {
        return `${diffHours}시간 전`;
      } else if (diffDays < 7) {
        return `${diffDays}일 전`;
      } else {
        return this.formatKoreanTime(dateString);
      }
    } catch (error) {
      console.error('상대 시간 계산 오류:', error);
      return dateString;
    }
  }
};
