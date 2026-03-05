// v1.0 - 간단한 메모리 기반 Rate Limiter (2026.03.05)
// 한글 주석: API 요청 속도 제한 시스템
// 목적: API 키당 요청 횟수를 제한하여 과도한 사용 방지

/**
 * 메모리 기반 Rate Limiter 클래스
 * 한글 주석: 슬라이딩 윈도우 방식으로 요청 횟수 추적
 *
 * 주의: 이 구현은 단일 서버 환경에서만 동작합니다.
 * 다중 서버 환경에서는 Redis 등 외부 저장소 사용을 권장합니다.
 */
class RateLimiter {
  constructor() {
    // 한글 주석: API 키별 요청 기록을 저장하는 Map
    // 구조: { apiKeyId: [timestamp1, timestamp2, ...] }
    this.requests = new Map();

    // 한글 주석: 주기적으로 오래된 요청 기록 정리 (메모리 누수 방지)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 1분마다 정리
  }

  /**
   * 요청 허용 여부 확인
   * 한글 주석: 지정된 시간 윈도우 내 요청 횟수를 확인하고 제한 초과 여부 반환
   *
   * @param {string} apiKeyId - API 키 ID
   * @param {number} maxRequests - 최대 요청 횟수
   * @param {number} windowMs - 시간 윈도우 (밀리초)
   * @returns {{allowed: boolean, remaining: number, resetAt: number}}
   */
  checkLimit(apiKeyId, maxRequests, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // 해당 API 키의 요청 기록 가져오기
    let timestamps = this.requests.get(apiKeyId) || [];

    // 시간 윈도우 내의 요청만 필터링
    timestamps = timestamps.filter((timestamp) => timestamp > windowStart);

    // 요청 횟수 확인
    const requestCount = timestamps.length;
    const allowed = requestCount < maxRequests;
    const remaining = Math.max(0, maxRequests - requestCount);

    // 다음 리셋 시간 계산 (가장 오래된 요청 + 윈도우)
    const resetAt = timestamps.length > 0 ? timestamps[0] + windowMs : now + windowMs;

    if (allowed) {
      // 요청 허용 시 현재 시간 기록
      timestamps.push(now);
      this.requests.set(apiKeyId, timestamps);
    }

    return {
      allowed,
      remaining,
      resetAt,
      requestCount
    };
  }

  /**
   * 오래된 요청 기록 정리
   * 한글 주석: 1시간 이상 지난 요청 기록을 삭제하여 메모리 절약
   */
  cleanup() {
    const oneHourAgo = Date.now() - 3600000; // 1시간 전

    for (const [apiKeyId, timestamps] of this.requests.entries()) {
      // 1시간 이내의 요청만 유지
      const recentTimestamps = timestamps.filter((timestamp) => timestamp > oneHourAgo);

      if (recentTimestamps.length === 0) {
        // 최근 요청이 없으면 삭제
        this.requests.delete(apiKeyId);
      } else {
        this.requests.set(apiKeyId, recentTimestamps);
      }
    }

    console.log(`🧹 Rate Limiter 정리 완료: ${this.requests.size}개 API 키 추적 중`);
  }

  /**
   * 특정 API 키의 요청 기록 초기화
   * 한글 주석: 테스트나 관리 목적으로 특정 API 키의 제한을 리셋
   *
   * @param {string} apiKeyId - API 키 ID
   */
  reset(apiKeyId) {
    this.requests.delete(apiKeyId);
  }

  /**
   * 모든 요청 기록 초기화
   * 한글 주석: 전체 Rate Limiter 상태를 리셋 (주의해서 사용)
   */
  resetAll() {
    this.requests.clear();
  }

  /**
   * Rate Limiter 종료 (정리 작업 중지)
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// 싱글톤 인스턴스 생성
const rateLimiter = new RateLimiter();

/**
 * Rate Limit 설정
 * 한글 주석: API 키별 요청 제한 규칙
 */
export const RATE_LIMIT_CONFIG = {
  // 분당 제한
  perMinute: {
    maxRequests: 10,
    windowMs: 60000 // 1분
  },
  // 시간당 제한
  perHour: {
    maxRequests: 100,
    windowMs: 3600000 // 1시간
  },
  // 일일 제한
  perDay: {
    maxRequests: 1000,
    windowMs: 86400000 // 24시간
  }
};

/**
 * Rate Limit 체크 함수
 * 한글 주석: API 키의 요청 제한을 확인하고 허용 여부 반환
 *
 * @param {string} apiKeyId - API 키 ID
 * @param {string} limitType - 제한 타입 ('perMinute', 'perHour', 'perDay')
 * @returns {{allowed: boolean, remaining: number, resetAt: number, requestCount: number}}
 *
 * @example
 * const result = checkRateLimit(apiKeyId, 'perMinute');
 * if (!result.allowed) {
 *   return Response.json({ error: 'Too many requests' }, { status: 429 });
 * }
 */
export function checkRateLimit(apiKeyId, limitType = 'perMinute') {
  const config = RATE_LIMIT_CONFIG[limitType];
  if (!config) {
    throw new Error(`유효하지 않은 limitType: ${limitType}`);
  }

  return rateLimiter.checkLimit(apiKeyId, config.maxRequests, config.windowMs);
}

/**
 * 다중 Rate Limit 체크
 * 한글 주석: 여러 제한 규칙을 동시에 확인 (분당, 시간당 등)
 *
 * @param {string} apiKeyId - API 키 ID
 * @param {string[]} limitTypes - 확인할 제한 타입 배열
 * @returns {{allowed: boolean, failedLimit?: string, details: object}}
 *
 * @example
 * const result = checkMultipleRateLimits(apiKeyId, ['perMinute', 'perHour']);
 * if (!result.allowed) {
 *   console.log('제한 초과:', result.failedLimit);
 * }
 */
export function checkMultipleRateLimits(apiKeyId, limitTypes = ['perMinute', 'perHour']) {
  const details = {};

  for (const limitType of limitTypes) {
    const result = rateLimiter.checkLimit(apiKeyId, RATE_LIMIT_CONFIG[limitType].maxRequests, RATE_LIMIT_CONFIG[limitType].windowMs);

    details[limitType] = result;

    // 하나라도 제한 초과 시 즉시 반환
    if (!result.allowed) {
      return {
        allowed: false,
        failedLimit: limitType,
        details
      };
    }
  }

  return {
    allowed: true,
    details
  };
}

/**
 * Rate Limit 헤더 생성
 * 한글 주석: HTTP 응답 헤더에 Rate Limit 정보 추가
 *
 * @param {object} limitResult - checkRateLimit 결과
 * @returns {object} HTTP 헤더 객체
 */
export function getRateLimitHeaders(limitResult) {
  return {
    'X-RateLimit-Limit': RATE_LIMIT_CONFIG.perMinute.maxRequests.toString(),
    'X-RateLimit-Remaining': limitResult.remaining.toString(),
    'X-RateLimit-Reset': new Date(limitResult.resetAt).toISOString()
  };
}

// 싱글톤 인스턴스 내보내기
export default rateLimiter;
