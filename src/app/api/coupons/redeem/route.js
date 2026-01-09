// v1.0 - 쿠폰 등록/승인 프록시 (2026.01.09)
// 한글 주석: 프론트는 Next.js API를 통해 Cloudtype FastAPI 쿠폰 엔드포인트를 호출합니다.

import { proxyToBackend } from '@/app/api/_utils/backendProxy';

export async function POST(request) {
  const body = await request.text();
  const userId = request.headers.get('x-user-id') || '';

  return await proxyToBackend('/api/coupons/redeem', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {})
    },
    body
  });
}
