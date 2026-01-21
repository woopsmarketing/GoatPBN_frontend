// v0.1 - 공통 유틸리티 모음 (2026.01.20)
// 기능 요약: URL/DOM/네트워크 처리를 공통 함수로 제공합니다.
// 사용 예시: const config = getConfig();

// 한글 주석: 설정 정보를 안전하게 반환합니다.
const getConfig = () => {
  const config = window.GOATPBN_CONFIG || {};
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    throw new Error('Supabase 설정값이 누락되었습니다. assets/config.js를 확인해주세요.');
  }
  if (!config.API_BASE_URL) {
    throw new Error('API_BASE_URL이 누락되었습니다. assets/config.js를 확인해주세요.');
  }
  return config;
};

// 한글 주석: 현재 페이지의 쿼리 파라미터를 객체로 변환합니다.
const getQueryParams = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  } catch (err) {
    console.error('쿼리 파라미터 파싱 실패:', err);
    return {};
  }
};

// 한글 주석: 단일 쿼리 파라미터를 안전하게 읽습니다.
const getQueryParam = (key, fallback = '') => {
  const params = getQueryParams();
  return params[key] || fallback;
};

// 한글 주석: 현재 경로 기준 베이스 경로를 계산합니다.
const getBasePath = () => {
  try {
    const pathname = window.location.pathname || '/';
    if (pathname.endsWith('/')) return pathname.replace(/\/+$/, '');
    return pathname.replace(/\/[^/]*$/, '');
  } catch (err) {
    console.error('베이스 경로 계산 실패:', err);
    return '';
  }
};

// 한글 주석: 동일 도메인 내 절대 URL을 생성합니다.
const buildPageUrl = (fileName, query = {}) => {
  try {
    const origin = window.location.origin;
    const basePath = getBasePath();
    const url = new URL(`${origin}${basePath}/${fileName}`);
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
    return url.toString();
  } catch (err) {
    console.error('URL 생성 실패:', err);
    return '';
  }
};

// 한글 주석: DOM 요소의 텍스트를 안전하게 변경합니다.
const setText = (selector, text) => {
  const element = document.querySelector(selector);
  if (!element) return;
  element.textContent = text;
};

// 한글 주석: DOM 요소 표시/숨김 헬퍼입니다.
const showElement = (selector) => {
  const element = document.querySelector(selector);
  if (element) element.classList.remove('hidden');
};

const hideElement = (selector) => {
  const element = document.querySelector(selector);
  if (element) element.classList.add('hidden');
};

// 한글 주석: KRW 금액 표시를 포맷합니다.
const formatKRW = (amount) => {
  if (!Number.isFinite(Number(amount))) return '—';
  return `${Number(amount).toLocaleString('ko-KR')}원`;
};

// 한글 주석: fetch 응답을 안전하게 JSON으로 변환합니다.
const safeJson = async (response) => {
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    return { error: '응답 파싱 실패' };
  }
};

// 한글 주석: 공통 fetch 래퍼(에러 메시지 일관 처리)
const requestJson = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    const data = await safeJson(response);
    if (!response.ok) {
      const message = data?.detail || data?.error || data?.message || '요청에 실패했습니다.';
      return { ok: false, status: response.status, error: message, data };
    }
    return { ok: true, status: response.status, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : '요청 중 알 수 없는 오류가 발생했습니다.';
    return { ok: false, status: 0, error: message, data: null };
  }
};

// 한글 주석: 안전한 리다이렉트 URL을 생성합니다.
const sanitizeReturnTo = (returnTo) => {
  try {
    if (!returnTo) return '';
    if (/^https?:\/\//i.test(returnTo)) {
      const origin = window.location.origin;
      const url = new URL(returnTo);
      return url.origin === origin ? url.pathname + url.search : '';
    }
    return returnTo.startsWith('/') ? returnTo : `/${returnTo}`;
  } catch (err) {
    console.error('return_to 정리 실패:', err);
    return '';
  }
};

// 한글 주석: 전역 접근을 위해 window에 노출합니다.
window.GoatUtils = {
  getConfig,
  getQueryParams,
  getQueryParam,
  getBasePath,
  buildPageUrl,
  setText,
  showElement,
  hideElement,
  formatKRW,
  requestJson,
  sanitizeReturnTo
};
