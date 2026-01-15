// v1.0 - 토스 결제 후처리 프록시 (2026.01.15)
// 기능 요약: Next.js API Route에서 FastAPI /api/payments/toss/confirm로 프록시

import { proxyToBackend } from '@/app/api/_utils/backendProxy';

export async function POST(request) {
  return await proxyToBackend('/api/payments/toss/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: await request.text()
  });
}
