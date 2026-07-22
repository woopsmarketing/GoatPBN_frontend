// v1.0 - PayPal 구독 생성 프록시 (2026.01.07)
// 한글 주석: 클라이언트에서 Cloudtype 백엔드 주소를 직접 호출하지 않고, Next.js 서버에서 프록시합니다.

import { proxyToBackend } from '@/app/api/_utils/backendProxy';
import { buildCorsHeaders, handleCorsPreflight, withCors } from '@/app/api/_utils/cors';

export async function POST(request) {
  const corsHeaders = buildCorsHeaders(request);
  const body = await request.text();
  const userId = request.headers.get('x-user-id') || '';

  const response = await proxyToBackend('/api/payments/paypal/create-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {})
    },
    body
  });
  return withCors(response, corsHeaders);
}

// 한글 주석: goatpbn.com에서 호출할 수 있도록 프리플라이트를 허용합니다.
export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}
