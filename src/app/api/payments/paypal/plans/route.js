// v1.0 - PayPal 플랜 프록시 (2026.01.07)
// 한글 주석: 브라우저에서 Cloudtype 백엔드 주소가 노출되지 않도록 Next.js 서버에서 프록시합니다.

import { proxyToBackend } from '@/app/api/_utils/backendProxy';
import { buildCorsHeaders, handleCorsPreflight, withCors } from '@/app/api/_utils/cors';

export async function GET(request) {
  const corsHeaders = buildCorsHeaders(request);
  const response = await proxyToBackend('/api/payments/paypal/plans', { method: 'GET' });
  return withCors(response, corsHeaders);
}

// 한글 주석: goatpbn.com에서 호출할 수 있도록 프리플라이트를 허용합니다.
export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}
