// v1.0 - CORS 공통 유틸 (2026.01.20)
// 기능 요약: goatpbn.com에서 호출 가능한 API CORS 헤더를 생성
// 사용 예시:
//   export function OPTIONS(request) { return handleCorsPreflight(request); }

const DEFAULT_ALLOWED_ORIGINS = ['https://goatpbn.com', 'https://www.goatpbn.com'];

// 한글 주석: 허용 오리진 목록을 환경변수에서 읽어옵니다.
const resolveAllowedOrigins = () => {
  const raw = (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || '').trim();
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

// 한글 주석: 요청의 Origin이 허용 목록에 포함되면 CORS 헤더를 반환합니다.
export const buildCorsHeaders = (request) => {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = resolveAllowedOrigins();
  if (!origin || !allowedOrigins.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, x-user-id',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin'
  };
};

// 한글 주석: 프리플라이트 응답을 생성합니다.
export const handleCorsPreflight = (request) => {
  const headers = buildCorsHeaders(request);
  return new Response(null, { status: 204, headers });
};

// 한글 주석: 기존 응답에 CORS 헤더를 합칩니다.
export const withCors = (response, corsHeaders = {}) => {
  if (!corsHeaders || Object.keys(corsHeaders).length === 0) return response;
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, headers });
};
