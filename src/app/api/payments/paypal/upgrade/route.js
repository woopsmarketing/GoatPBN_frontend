import { proxyToBackend } from '@/app/api/_utils/backendProxy';

// PayPal 구독 업그레이드 (prorate=true)
export async function PATCH(req) {
  const body = await req.text();
  return proxyToBackend('/api/payments/paypal/upgrade', {
    method: 'PATCH',
    headers: {
      'Content-Type': req.headers.get('content-type') || 'application/json',
      authorization: req.headers.get('authorization') || '',
      'x-user-id': req.headers.get('x-user-id') || ''
    },
    body
  });
}
