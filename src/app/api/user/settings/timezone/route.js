// v1.0 - 사용자 타임존 업데이트 프록시 (2026-01-09)
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

export async function POST(request) {
  const body = await request.text();
  return await proxyToBackend('/api/user/settings/timezone', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  });
}
