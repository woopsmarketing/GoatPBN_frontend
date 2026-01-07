// v1.0 - 백엔드 프록시 유틸 (2026.01.07)
// 기능 요약: Next.js API Route(서버)에서 Cloudtype FastAPI로 안전하게 프록시하기 위한 헬퍼
// 사용 예시:
//   return await proxyToBackend('/api/payments/paypal/plans', { method: 'GET' })

const resolveBackendBaseUrl = () => {
  // 한글 주석: 서버에서만 읽히는 환경변수가 있으면 우선 사용하고,
  // 없으면 기존에 쓰던 NEXT_PUBLIC_API_URL(공개 env)을 fallback으로 사용합니다.
  const baseUrl = (process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_URL || '').trim();
  return baseUrl.replace(/\/$/, '');
};

export const proxyToBackend = async (path, init = {}) => {
  const baseUrl = resolveBackendBaseUrl();
  if (!baseUrl) {
    return new Response(JSON.stringify({ detail: 'Backend base URL not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  // 한글 주석: Request/Response 스트림을 그대로 전달하기 위해 fetch로 프록시합니다.
  const response = await fetch(url, {
    // Next.js Route Handler 환경: 기본적으로 서버 사이드에서 실행됩니다.
    ...init,
    headers: {
      ...(init.headers || {})
    }
  });

  // 한글 주석: 응답을 그대로 전달하되 JSON을 기대하는 클라이언트 호환을 위해 content-type을 유지합니다.
  const contentType = response.headers.get('content-type') || 'application/json';
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': contentType,
      // 한글 주석: 플랜 정의는 자주 변하지 않으므로 짧게 캐시 가능(프론트 UX 개선)
      'Cache-Control': init.method === 'GET' ? 'public, max-age=30' : 'no-store'
    }
  });
};
