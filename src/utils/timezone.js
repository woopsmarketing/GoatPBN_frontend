/**
 * 타임존 유틸리티
 * v1.0: 사용자 타임존 자동 감지 및 변환 (2025-11-01)
 */

/**
 * 브라우저에서 사용자의 타임존 감지
 * @returns {string} IANA 타임존 문자열 (예: 'Asia/Seoul')
 */
export function detectUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('타임존 감지 실패, 기본값 사용:', error);
    return 'Asia/Seoul'; // 기본값
  }
}

/**
 * UTC 시간을 사용자 로컬 시간으로 변환
 * @param {string|Date} utcTime - UTC 시간 (ISO 문자열 또는 Date 객체)
 * @param {string} timezone - 타임존 (옵션, 기본값: 자동 감지)
 * @returns {Date} 로컬 시간 Date 객체
 */
export function utcToLocal(utcTime, timezone = null) {
  const date = typeof utcTime === 'string' ? new Date(utcTime) : utcTime;
  const userTimezone = timezone || detectUserTimezone();

  // Date 객체는 이미 사용자 타임존을 고려하므로 그대로 반환
  return date;
}

/**
 * UTC 시간을 포맷팅된 문자열로 변환
 * @param {string|Date} utcTime - UTC 시간
 * @param {string} format - 포맷 ('date', 'time', 'datetime', 'relative')
 * @param {string} timezone - 타임존 (옵션)
 * @returns {string} 포맷팅된 시간 문자열
 */
export function formatUTCTime(utcTime, format = 'datetime', timezone = null) {
  const date = utcToLocal(utcTime, timezone);
  const userTimezone = timezone || detectUserTimezone();

  const options = {
    timeZone: userTimezone
  };

  switch (format) {
    case 'date':
      return date.toLocaleDateString('ko-KR', {
        ...options,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

    case 'time':
      return date.toLocaleTimeString('ko-KR', {
        ...options,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

    case 'datetime':
      return date.toLocaleString('ko-KR', {
        ...options,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

    case 'relative':
      return getRelativeTime(date);

    default:
      return date.toISOString();
  }
}

/**
 * 상대적 시간 표시 (예: '3분 전', '2시간 전')
 * @param {Date} date - 비교할 시간
 * @returns {string} 상대적 시간 문자열
 */
function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${diffSec}초 전`;
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 30) return `${diffDay}일 전`;

  return formatUTCTime(date, 'date');
}

/**
 * 로컬 시간을 UTC로 변환
 * @param {Date} localTime - 로컬 시간
 * @returns {string} UTC ISO 문자열
 */
export function localToUTC(localTime) {
  return localTime.toISOString();
}

/**
 * 타임존 정보 가져오기
 * @returns {object} 타임존 정보
 */
export function getTimezoneInfo() {
  const timezone = detectUserTimezone();
  const offset = -new Date().getTimezoneOffset() / 60;

  return {
    timezone,
    offset,
    offsetString: `UTC${offset >= 0 ? '+' : ''}${offset}`
  };
}

// React 컴포넌트에서 사용할 커스텀 훅
export function useTimezone() {
  const [timezone, setTimezone] = React.useState(detectUserTimezone());

  React.useEffect(() => {
    // 사용자 설정에서 타임존 불러오기
    // API 호출로 user_settings에서 가져올 수 있음
    const fetchUserTimezone = async () => {
      try {
        const response = await fetch('/api/user/settings');
        const data = await response.json();
        if (data.timezone) {
          setTimezone(data.timezone);
        }
      } catch (error) {
        console.warn('타임존 불러오기 실패:', error);
      }
    };

    fetchUserTimezone();
  }, []);

  return timezone;
}

// 사용 예시
if (typeof window !== 'undefined') {
  console.log('🌍 타임존 정보:', getTimezoneInfo());
}
