// v1.0 - API 공통 유틸 추가 (2025.11.19)
// 기능 요약: NEXT_PUBLIC_API_URL 기반의 엔드포인트 생성 및 공통 헤더 제공

// 한글 주석: 환경 변수에서 API 기본 URL을 가져오고 검증
export const getApiBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : '';
  if (!baseUrl) {
    throw new Error('API 기본 URL이 설정되지 않았습니다. NEXT_PUBLIC_API_URL 값을 확인해주세요.');
  }
  return baseUrl;
};

// 한글 주석: 상대 경로를 받아 전체 API URL을 구성
export const buildApiUrl = (path = '/') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
};

// 한글 주석: JSON 요청에 필요한 기본 헤더를 반환
export const jsonHeaders = (customHeaders = {}) => ({ 'Content-Type': 'application/json', ...customHeaders });
