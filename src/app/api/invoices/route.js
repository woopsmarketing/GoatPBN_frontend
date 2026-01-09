// v1.0 - Invoices proxy to backend (2026-01-09)
import { proxyToBackend } from '@/app/api/_utils/backendProxy';

export async function GET(request) {
  const userId = request.headers.get('x-user-id') || '';
  const url = new URL(request.url);
  const uid = url.searchParams.get('user_id') || userId;

  return await proxyToBackend(`/api/invoices${uid ? `?user_id=${uid}` : ''}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(uid ? { 'x-user-id': uid } : {})
    }
  });
}
