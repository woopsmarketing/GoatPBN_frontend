// v1.1 - 토스 결제 후처리 프록시 (2026.01.20)
// 기능 요약: FastAPI /api/payments/toss/confirm로 프록시 + CORS 허용

import { proxyToBackend } from '@/app/api/_utils/backendProxy';
import { buildCorsHeaders, handleCorsPreflight, withCors } from '@/app/api/_utils/cors';

export async function POST(request) {
  const corsHeaders = buildCorsHeaders(request);
  const response = await proxyToBackend('/api/payments/toss/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: await request.text()
  });
  return withCors(response, corsHeaders);
}

// 한글 주석: goatpbn.com에서 호출할 수 있도록 프리플라이트를 허용합니다.
export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}
