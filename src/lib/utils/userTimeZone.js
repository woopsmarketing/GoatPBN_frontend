// v1.0 - 사용자 시간대 설정 관리 (2025.10.01)

/**
 * 사용자 시간대 설정 관리 유틸리티
 *
 * 주요 기능:
 * - 사용자 시간대 설정 저장/불러오기
 * - 자동 감지 vs 수동 설정
 * - 국가별 시간대 목록 제공
 */

const isBrowser = typeof window !== 'undefined';

// 주요 국가별 시간대 목록
export const TIMEZONE_OPTIONS = [
  // 아시아
  { value: 'Asia/Seoul', label: '🇰🇷 한국 (서울)', country: 'KR', offset: '+09:00' },
  { value: 'Asia/Tokyo', label: '🇯🇵 일본 (도쿄)', country: 'JP', offset: '+09:00' },
  { value: 'Asia/Shanghai', label: '🇨🇳 중국 (상하이)', country: 'CN', offset: '+08:00' },
  { value: 'Asia/Hong_Kong', label: '🇭🇰 홍콩', country: 'HK', offset: '+08:00' },
  { value: 'Asia/Singapore', label: '🇸🇬 싱가포르', country: 'SG', offset: '+08:00' },
  { value: 'Asia/Bangkok', label: '🇹🇭 태국 (방콕)', country: 'TH', offset: '+07:00' },
  { value: 'Asia/Jakarta', label: '🇮🇩 인도네시아 (자카르타)', country: 'ID', offset: '+07:00' },
  { value: 'Asia/Kolkata', label: '🇮🇳 인도 (콜카타)', country: 'IN', offset: '+05:30' },
  { value: 'Asia/Dubai', label: '🇦🇪 UAE (두바이)', country: 'AE', offset: '+04:00' },

  // 유럽
  { value: 'Europe/London', label: '🇬🇧 영국 (런던)', country: 'GB', offset: '+00:00' },
  { value: 'Europe/Paris', label: '🇫🇷 프랑스 (파리)', country: 'FR', offset: '+01:00' },
  { value: 'Europe/Berlin', label: '🇩🇪 독일 (베를린)', country: 'DE', offset: '+01:00' },
  { value: 'Europe/Rome', label: '🇮🇹 이탈리아 (로마)', country: 'IT', offset: '+01:00' },
  { value: 'Europe/Madrid', label: '🇪🇸 스페인 (마드리드)', country: 'ES', offset: '+01:00' },
  { value: 'Europe/Amsterdam', label: '🇳🇱 네덜란드 (암스테르담)', country: 'NL', offset: '+01:00' },
  { value: 'Europe/Moscow', label: '🇷🇺 러시아 (모스크바)', country: 'RU', offset: '+03:00' },

  // 북미
  { value: 'America/New_York', label: '🇺🇸 미국 동부 (뉴욕)', country: 'US', offset: '-05:00' },
  { value: 'America/Chicago', label: '🇺🇸 미국 중부 (시카고)', country: 'US', offset: '-06:00' },
  { value: 'America/Denver', label: '🇺🇸 미국 산악 (덴버)', country: 'US', offset: '-07:00' },
  { value: 'America/Los_Angeles', label: '🇺🇸 미국 서부 (LA)', country: 'US', offset: '-08:00' },
  { value: 'America/Toronto', label: '🇨🇦 캐나다 (토론토)', country: 'CA', offset: '-05:00' },
  { value: 'America/Vancouver', label: '🇨🇦 캐나다 (밴쿠버)', country: 'CA', offset: '-08:00' },

  // 오세아니아
  { value: 'Australia/Sydney', label: '🇦🇺 호주 (시드니)', country: 'AU', offset: '+10:00' },
  { value: 'Australia/Melbourne', label: '🇦🇺 호주 (멜버른)', country: 'AU', offset: '+10:00' },
  { value: 'Pacific/Auckland', label: '🇳🇿 뉴질랜드 (오클랜드)', country: 'NZ', offset: '+12:00' },

  // 남미
  { value: 'America/Sao_Paulo', label: '🇧🇷 브라질 (상파울루)', country: 'BR', offset: '-03:00' },
  { value: 'America/Argentina/Buenos_Aires', label: '🇦🇷 아르헨티나 (부에노스아이레스)', country: 'AR', offset: '-03:00' },

  // 아프리카
  { value: 'Africa/Cairo', label: '🇪🇬 이집트 (카이로)', country: 'EG', offset: '+02:00' },
  { value: 'Africa/Johannesburg', label: '🇿🇦 남아프리카 (요하네스버그)', country: 'ZA', offset: '+02:00' }
];

/**
 * 로컬 스토리지 키
 */
const STORAGE_KEYS = {
  USER_TIMEZONE: 'user_timezone',
  AUTO_DETECT: 'auto_detect_timezone',
  TIMEZONE_PREFERENCE: 'timezone_preference'
};

/**
 * 사용자 시간대 설정 관리 클래스
 */
export class UserTimeZoneManager {
  constructor() {
    this.autoDetect = this.getAutoDetectSetting();
    this.userTimeZone = this.getUserTimeZone();
  }

  /**
   * 브라우저에서 자동 감지된 시간대 가져오기
   */
  getDetectedTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * 자동 감지 설정 가져오기
   */
  getAutoDetectSetting() {
    if (!isBrowser) {
      return true;
    }
    const stored = window.localStorage.getItem(STORAGE_KEYS.AUTO_DETECT);
    return stored !== null ? JSON.parse(stored) : true; // 기본값: 자동 감지
  }

  /**
   * 자동 감지 설정 저장
   */
  setAutoDetectSetting(autoDetect) {
    this.autoDetect = autoDetect;
    if (isBrowser) {
      window.localStorage.setItem(STORAGE_KEYS.AUTO_DETECT, JSON.stringify(autoDetect));
    }

    if (autoDetect) {
      // 자동 감지 활성화 시 현재 감지된 시간대로 설정
      this.setUserTimeZone(this.getDetectedTimeZone());
    }
  }

  /**
   * 사용자 시간대 가져오기
   */
  getUserTimeZone() {
    if (!isBrowser) {
      return 'UTC';
    }
    if (this.autoDetect) {
      return this.getDetectedTimeZone();
    }

    const stored = window.localStorage.getItem(STORAGE_KEYS.USER_TIMEZONE);
    return stored || this.getDetectedTimeZone();
  }

  /**
   * 사용자 시간대 설정
   */
  setUserTimeZone(timeZone) {
    this.userTimeZone = timeZone;
    if (isBrowser) {
      window.localStorage.setItem(STORAGE_KEYS.USER_TIMEZONE, timeZone);
    }

    // 수동 설정 시 자동 감지 비활성화
    if (timeZone !== this.getDetectedTimeZone()) {
      this.setAutoDetectSetting(false);
    }
  }

  /**
   * 현재 설정된 시간대로 날짜 포맷팅
   */
  formatDate(dateInput, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };

    try {
      const date = new Date(dateInput);
      return date.toLocaleString('ko-KR', {
        timeZone: this.getUserTimeZone(),
        ...defaultOptions,
        ...options
      });
    } catch (error) {
      console.error('날짜 포맷팅 오류:', error);
      return String(dateInput);
    }
  }

  /**
   * 시간대 정보 가져오기
   */
  getTimeZoneInfo() {
    const timeZone = this.getUserTimeZone();
    const detected = this.getDetectedTimeZone();
    const option = TIMEZONE_OPTIONS.find((tz) => tz.value === timeZone);

    return {
      current: timeZone,
      detected: detected,
      isAutoDetect: this.autoDetect,
      isManual: !this.autoDetect,
      isDifferentFromDetected: timeZone !== detected,
      label: option?.label || timeZone,
      country: option?.country || 'Unknown',
      offset: option?.offset || 'Unknown'
    };
  }

  /**
   * 시간대 변경 이벤트 리스너
   */
  onTimeZoneChange(callback) {
    // 시간대 변경 시 콜백 실행
    const originalSetUserTimeZone = this.setUserTimeZone.bind(this);
    this.setUserTimeZone = (timeZone) => {
      originalSetUserTimeZone(timeZone);
      callback(this.getTimeZoneInfo());
    };
  }

  /**
   * 디버깅 정보 출력
   */
  logDebugInfo() {
    const info = this.getTimeZoneInfo();
    console.log('🌍 사용자 시간대 설정 정보:');
    console.log('  - 현재 설정:', info.current);
    console.log('  - 자동 감지:', info.detected);
    console.log('  - 자동 감지 모드:', info.isAutoDetect ? '활성화' : '비활성화');
    console.log('  - 수동 설정:', info.isManual ? '활성화' : '비활성화');
    console.log('  - 감지값과 다름:', info.isDifferentFromDetected ? '예' : '아니오');
    console.log('  - 표시명:', info.label);
    console.log('  - 국가:', info.country);
    console.log('  - UTC 오프셋:', info.offset);
  }
}

// 전역 인스턴스
export const userTimeZone = new UserTimeZoneManager();

// 편의 함수들
export const formatToUserTimeZone = (dateInput, options = {}) => {
  return userTimeZone.formatDate(dateInput, options);
};

export const getUserTimeZoneInfo = () => {
  return userTimeZone.getTimeZoneInfo();
};

export const setUserTimeZone = (timeZone) => {
  userTimeZone.setUserTimeZone(timeZone);
};

export const toggleAutoDetect = () => {
  const current = userTimeZone.getAutoDetectSetting();
  userTimeZone.setAutoDetectSetting(!current);
  return !current;
};
