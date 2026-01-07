// v1.0 - PayPal 구독 confirm 프록시 (2026.01.07)
// 한글 주석: 승인 후 confirm 호출도 동일 오리진에서 처리하여 백엔드 주소 노출을 줄입니다.

import { proxyToBackend } from '@/app/api/_utils/backendProxy';

export async function POST(request) {
  const body = await request.text();
  const userId = request.headers.get('x-user-id') || '';

  return await proxyToBackend('/api/payments/paypal/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {})
    },
    body
  });
}
