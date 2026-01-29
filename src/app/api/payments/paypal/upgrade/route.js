import { proxyToBackend } from '@/app/api/_utils/backendProxy';
import { buildCorsHeaders, handleCorsPreflight, withCors } from '@/app/api/_utils/cors';

// PayPal 구독 업그레이드 (prorate=true)
export async function PATCH(req) {
  const corsHeaders = buildCorsHeaders(req);
  const body = await req.text();
  const response = await proxyToBackend('/api/payments/paypal/upgrade', {
    method: 'PATCH',
    headers: {
      'Content-Type': req.headers.get('content-type') || 'application/json',
      authorization: req.headers.get('authorization') || '',
      'x-user-id': req.headers.get('x-user-id') || ''
    },
    body
  });
  return withCors(response, corsHeaders);
}

// 한글 주석: goatpbn.com에서 호출할 수 있도록 프리플라이트를 허용합니다.
export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}
