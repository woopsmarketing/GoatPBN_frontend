// v1.0 - 시간대 처리 유틸리티 함수 (2025.10.01)

/**
 * 클라이언트 시간대 기반 시간 처리 유틸리티
 *
 * 주요 기능:
 * - 클라이언트 로컬 시간대 자동 감지
 * - UTC 시간을 클라이언트 시간대로 변환
 * - 다양한 포맷 옵션 제공
 * - 국제화 지원
 */

/**
 * 클라이언트의 시간대 정보 가져오기
 * @returns {string} 시간대 (예: 'Asia/Seoul', 'America/New_York')
 */
export const getClientTimeZone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * UTC 시간을 클라이언트 로컬 시간대로 변환하여 포맷팅
 * @param {string|Date} dateInput - UTC 시간 (ISO 문자열 또는 Date 객체)
 * @param {Object} options - 포맷 옵션
 * @param {string} options.locale - 로케일 (기본: 'ko-KR')
 * @param {Object} options.formatOptions - Intl.DateTimeFormat 옵션
 * @returns {string} 포맷된 시간 문자열
 */
export const formatToClientTimeZone = (dateInput, options = {}) => {
  const {
    locale = 'ko-KR',
    formatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }
  } = options;

  try {
    const date = new Date(dateInput);
    const timeZone = getClientTimeZone();

    return date.toLocaleString(locale, {
      timeZone,
      ...formatOptions
    });
  } catch (error) {
    console.error('시간 포맷팅 오류:', error);
    return String(dateInput);
  }
};

/**
 * 간단한 날짜 포맷팅 (년-월-일만)
 * @param {string|Date} dateInput - UTC 시간
 * @param {string} locale - 로케일 (기본: 'ko-KR')
 * @returns {string} 포맷된 날짜 문자열
 */
export const formatDateOnly = (dateInput, locale = 'ko-KR') => {
  return formatToClientTimeZone(dateInput, {
    locale,
    formatOptions: {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
  });
};

/**
 * 시간만 포맷팅 (시:분)
 * @param {string|Date} dateInput - UTC 시간
 * @param {string} locale - 로케일 (기본: 'ko-KR')
 * @returns {string} 포맷된 시간 문자열
 */
export const formatTimeOnly = (dateInput, locale = 'ko-KR') => {
  return formatToClientTimeZone(dateInput, {
    locale,
    formatOptions: {
      hour: '2-digit',
      minute: '2-digit'
    }
  });
};

/**
 * 상대 시간 계산 (예: "2시간 전")
 * @param {string|Date} dateInput - UTC 시간
 * @returns {string} 상대 시간 문자열
 */
export const getRelativeTime = (dateInput) => {
  try {
    const date = new Date(dateInput);
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
      return formatDateOnly(dateInput);
    }
  } catch (error) {
    console.error('상대 시간 계산 오류:', error);
    return String(dateInput);
  }
};

/**
 * UTC 시간을 클라이언트 시간대의 날짜 문자열로 변환 (YYYY-MM-DD)
 * @param {string|Date} dateInput - UTC 시간
 * @returns {string} 날짜 문자열 (YYYY-MM-DD)
 */
export const toClientDateString = (dateInput) => {
  try {
    const date = new Date(dateInput);
    const timeZone = getClientTimeZone();

    // 클라이언트 시간대로 변환
    const clientDate = new Date(date.toLocaleString('en-US', { timeZone }));
    return clientDate.toISOString().split('T')[0];
  } catch (error) {
    console.error('날짜 문자열 변환 오류:', error);
    return new Date().toISOString().split('T')[0];
  }
};

/**
 * 클라이언트 시간대 정보 출력 (디버깅용)
 */
export const logClientTimeZoneInfo = () => {
  const timeZone = getClientTimeZone();
  const now = new Date();

  console.log('🌍 클라이언트 시간대 정보:');
  console.log('  - 시간대:', timeZone);
  console.log('  - 현재 시간:', now.toLocaleString('ko-KR', { timeZone }));
  console.log('  - UTC 시간:', now.toISOString());
  console.log('  - 시간대 오프셋:', now.getTimezoneOffset(), '분');
};

/**
 * 다양한 지역의 시간 표시 (국제화 지원)
 * @param {string|Date} dateInput - UTC 시간
 * @returns {Object} 다양한 지역의 시간 정보
 */
export const getMultiTimeZoneInfo = (dateInput) => {
  const date = new Date(dateInput);

  return {
    client: formatToClientTimeZone(dateInput),
    utc: date.toISOString(),
    seoul: date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    newYork: date.toLocaleString('en-US', { timeZone: 'America/New_York' }),
    london: date.toLocaleString('en-GB', { timeZone: 'Europe/London' }),
    tokyo: date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
  };
};
