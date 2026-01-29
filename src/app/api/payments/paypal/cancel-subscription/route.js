// v1.0 - PayPal 구독 취소 프록시 (2026.01.29)
// 한글 주석: goatpbn.com에서 PayPal 구독 취소를 호출할 수 있도록 프록시합니다.

import { proxyToBackend } from '@/app/api/_utils/backendProxy';
import { buildCorsHeaders, handleCorsPreflight, withCors } from '@/app/api/_utils/cors';

export async function POST(request) {
  const corsHeaders = buildCorsHeaders(request);
  const body = await request.text();
  const userId = request.headers.get('x-user-id') || '';

  const response = await proxyToBackend('/api/payments/paypal/cancel-subscription', {
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
