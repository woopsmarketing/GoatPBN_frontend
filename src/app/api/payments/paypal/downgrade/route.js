import { proxyToBackend } from '@/app/api/_utils/backendProxy';

// PayPal 구독 다운그레이드 (다음 결제 주기 적용)
export async function POST(req) {
  const body = await req.text();
  return proxyToBackend('/api/payments/paypal/downgrade', {
    method: 'POST',
    headers: {
      'Content-Type': req.headers.get('content-type') || 'application/json',
      authorization: req.headers.get('authorization') || '',
      'x-user-id': req.headers.get('x-user-id') || ''
    },
    body
  });
}
