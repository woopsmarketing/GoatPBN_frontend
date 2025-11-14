// v1.0 - 로그 데이터 캐시 관리 시스템 (2025.10.01)

/**
 * 로그 데이터 캐시 관리 클래스
 *
 * 주요 기능:
 * - 메모리 기반 캐시 (브라우저 세션 동안 유지)
 * - 캐시 만료 시간 관리
 * - 자동 캐시 무효화
 * - 백그라운드 데이터 갱신
 */

class LogCache {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5분 기본 TTL
    this.backgroundUpdateInterval = null;
  }

  /**
   * 캐시 키 생성
   * @param {string} type - 캐시 타입 (logs, activities, campaigns, statistics)
   * @param {Object} params - 쿼리 파라미터
   * @returns {string} 캐시 키
   */
  _generateKey(type, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    return `${type}:${sortedParams}`;
  }

  /**
   * 캐시된 데이터 조회
   * @param {string} type - 캐시 타입
   * @param {Object} params - 쿼리 파라미터
   * @returns {Object|null} 캐시된 데이터 또는 null
   */
  get(type, params = {}) {
    const key = this._generateKey(type, params);
    const expiry = this.cacheExpiry.get(key);

    // 만료 시간 확인
    if (expiry && Date.now() > expiry) {
      this.delete(key);
      return null;
    }

    const data = this.cache.get(key);
    if (data) {
      // 캐시 히트 시에만 간단한 로그
      console.log(`📦 캐시 사용: ${type}`);
      return data;
    }

    return null;
  }

  /**
   * 데이터를 캐시에 저장
   * @param {string} type - 캐시 타입
   * @param {Object} params - 쿼리 파라미터
   * @param {any} data - 저장할 데이터
   * @param {number} ttl - TTL (밀리초, 선택사항)
   */
  set(type, params = {}, data, ttl = this.defaultTTL) {
    const key = this._generateKey(type, params);
    const expiry = Date.now() + ttl;

    this.cache.set(key, data);
    this.cacheExpiry.set(key, expiry);

    // 캐시 저장 시 간단한 로그만
    console.log(`💾 캐시 저장: ${type} (${ttl / 1000}초)`);
  }

  /**
   * 특정 캐시 삭제
   * @param {string} key - 캐시 키
   */
  delete(key) {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  }

  /**
   * 타입별 캐시 무효화
   * @param {string} type - 캐시 타입
   */
  invalidateType(type) {
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${type}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.delete(key);
    });

    console.log(`[LogCache] ${type} 타입 캐시 무효화: ${keysToDelete.length}개`);
  }

  /**
   * 전체 캐시 초기화
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheExpiry.clear();
    console.log(`[LogCache] 전체 캐시 초기화: ${size}개`);
  }

  /**
   * 캐시 통계 조회
   * @returns {Object} 캐시 통계
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now > expiry) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      memoryUsage: this._estimateMemoryUsage()
    };
  }

  /**
   * 메모리 사용량 추정
   * @returns {string} 메모리 사용량 (KB)
   */
  _estimateMemoryUsage() {
    let totalSize = 0;

    for (const data of this.cache.values()) {
      try {
        totalSize += JSON.stringify(data).length;
      } catch (e) {
        totalSize += 1000; // 추정값
      }
    }

    return `${Math.round(totalSize / 1024)}KB`;
  }

  /**
   * 만료된 캐시 정리
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now > expiry) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.delete(key);
    });

    if (keysToDelete.length > 0) {
      console.log(`[LogCache] 만료된 캐시 정리: ${keysToDelete.length}개`);
    }
  }

  /**
   * 자동 정리 시작
   * @param {number} interval - 정리 주기 (밀리초)
   */
  startAutoCleanup(interval = 60000) {
    // 1분마다
    if (this.backgroundUpdateInterval) {
      clearInterval(this.backgroundUpdateInterval);
    }

    this.backgroundUpdateInterval = setInterval(() => {
      this.cleanup();
    }, interval);

    console.log(`[LogCache] 자동 정리 시작: ${interval / 1000}초 주기`);
  }

  /**
   * 자동 정리 중지
   */
  stopAutoCleanup() {
    if (this.backgroundUpdateInterval) {
      clearInterval(this.backgroundUpdateInterval);
      this.backgroundUpdateInterval = null;
      console.log('[LogCache] 자동 정리 중지');
    }
  }
}

// 전역 캐시 인스턴스
export const logCache = new LogCache();

// 페이지 언로드 시 정리
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    logCache.stopAutoCleanup();
  });

  // 자동 정리 시작
  logCache.startAutoCleanup();
}

export default logCache;
