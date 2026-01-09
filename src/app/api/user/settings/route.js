// v1.0 - 사용자 설정 조회 프록시 (2026-01-09)
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

export async function GET(request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id') || '';

  return await proxyToBackend(`/api/user/settings${userId ? `?user_id=${userId}` : ''}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
