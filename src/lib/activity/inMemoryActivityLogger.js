// v1.0 - 인메모리 활동 로그 시스템 (2025.10.01)

/**
 * 간단한 인메모리 활동 로그 시스템
 *
 * 주요 기능:
 * - 브라우저 세션 동안 활동 로그 저장
 * - 실시간 활동 기록
 * - 데이터베이스 없이 즉시 표시
 * - 자동 정리 (최대 1000개 유지)
 */

class InMemoryActivityLogger {
  constructor() {
    this.activities = [];
    this.maxActivities = 1000;
    this.listeners = new Set();

    console.log('[InMemoryActivityLogger] 인메모리 활동 로거 초기화 완료');
  }

  /**
   * 활동 로그 추가
   * @param {string} type - 활동 타입
   * @param {string} description - 활동 설명
   * @param {Object} details - 추가 세부 정보
   */
  log(type, description, details = {}) {
    const activity = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      activity_type: type,
      description: description,
      details: details,
      created_at: new Date().toISOString(),
      user_id: 'current_user' // 실제로는 로그인된 사용자 ID
    };

    // 배열 앞쪽에 추가 (최신순)
    this.activities.unshift(activity);

    // 최대 개수 유지
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(0, this.maxActivities);
    }

    // 리스너들에게 알림
    this.notifyListeners(activity);

    console.log(`[InMemoryActivityLogger] 활동 기록: ${type} - ${description}`);
    return activity;
  }

  /**
   * 최근 활동 조회
   * @param {number} limit - 조회할 개수
   * @returns {Array} 활동 로그 배열
   */
  getRecentActivities(limit = 50) {
    return this.activities.slice(0, limit);
  }

  /**
   * 활동 타입별 필터링
   * @param {string} type - 활동 타입
   * @param {number} limit - 조회할 개수
   * @returns {Array} 필터링된 활동 로그 배열
   */
  getActivitiesByType(type, limit = 50) {
    return this.activities.filter((activity) => activity.activity_type === type).slice(0, limit);
  }

  /**
   * 활동 변경 리스너 등록
   * @param {Function} callback - 콜백 함수
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * 활동 변경 리스너 제거
   * @param {Function} callback - 콜백 함수
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * 리스너들에게 새 활동 알림
   * @param {Object} activity - 새 활동
   */
  notifyListeners(activity) {
    this.listeners.forEach((callback) => {
      try {
        callback(activity);
      } catch (error) {
        console.error('[InMemoryActivityLogger] 리스너 오류:', error);
      }
    });
  }

  /**
   * 모든 활동 로그 삭제
   */
  clear() {
    const count = this.activities.length;
    this.activities = [];
    console.log(`[InMemoryActivityLogger] 활동 로그 초기화: ${count}개 삭제`);
  }

  /**
   * 통계 정보 조회
   * @returns {Object} 통계 정보
   */
  getStats() {
    const typeCount = {};
    const today = new Date().toISOString().split('T')[0];
    let todayCount = 0;

    this.activities.forEach((activity) => {
      // 타입별 집계
      const type = activity.activity_type;
      typeCount[type] = (typeCount[type] || 0) + 1;

      // 오늘 활동 집계
      const activityDate = activity.created_at.split('T')[0];
      if (activityDate === today) {
        todayCount++;
      }
    });

    return {
      totalActivities: this.activities.length,
      todayActivities: todayCount,
      activityTypes: typeCount,
      recentActivityTime: this.activities[0]?.created_at || null
    };
  }
}

// 전역 인스턴스
export const inMemoryActivityLogger = new InMemoryActivityLogger();

// 편의 함수들
export const logActivity = {
  login: () => inMemoryActivityLogger.log('login', '사용자 로그인'),
  logout: () => inMemoryActivityLogger.log('logout', '사용자 로그아웃'),

  campaignCreate: (name) => inMemoryActivityLogger.log('campaign_create', `새 캠페인 생성: ${name}`, { campaignName: name }),
  campaignEdit: (name) => inMemoryActivityLogger.log('campaign_edit', `캠페인 수정: ${name}`, { campaignName: name }),
  campaignDelete: (name) => inMemoryActivityLogger.log('campaign_delete', `캠페인 삭제: ${name}`, { campaignName: name }),
  campaignStart: (name) => inMemoryActivityLogger.log('campaign_start', `캠페인 시작: ${name}`, { campaignName: name }),
  campaignPause: (name) => inMemoryActivityLogger.log('campaign_pause', `캠페인 일시정지: ${name}`, { campaignName: name }),

  siteAdd: (name, url) => inMemoryActivityLogger.log('site_add', `새 사이트 등록: ${name}`, { siteName: name, siteUrl: url }),
  siteEdit: (name) => inMemoryActivityLogger.log('site_edit', `사이트 편집: ${name}`, { siteName: name }),
  siteDelete: (name) => inMemoryActivityLogger.log('site_delete', `사이트 삭제: ${name}`, { siteName: name }),

  connectionTest: (name, success) => {
    const status = success ? '성공' : '실패';
    return inMemoryActivityLogger.log('connection_test', `연결 테스트 ${status}: ${name}`, { siteName: name, success });
  },

  contentGenerate: (title) => inMemoryActivityLogger.log('content_generate', `콘텐츠 생성: ${title}`, { contentTitle: title }),

  settingsChange: (setting) => inMemoryActivityLogger.log('settings_change', `설정 변경: ${setting}`, { setting }),

  reportDownload: (type) => inMemoryActivityLogger.log('report_download', `보고서 다운로드: ${type}`, { reportType: type }),

  exportData: (type) => inMemoryActivityLogger.log('export_data', `데이터 내보내기: ${type}`, { dataType: type })
};

// 페이지 로드 시 로그인 기록 (예시)
if (typeof window !== 'undefined') {
  // 페이지 로드 시 자동으로 로그인 활동 기록
  window.addEventListener('load', () => {
    setTimeout(() => {
      logActivity.login();
    }, 1000);
  });

  // 페이지 언로드 시 로그아웃 기록
  window.addEventListener('beforeunload', () => {
    logActivity.logout();
  });
}

export default inMemoryActivityLogger;
