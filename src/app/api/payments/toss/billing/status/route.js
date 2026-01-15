// v1.0 - 토스 정기결제 상태 조회 프록시 (2026.01.15)
// 기능 요약: FastAPI /api/payments/toss/billing/status 로 전달

import { jsonHeaders } from '@/lib/api/httpClient';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_SERVER_URL;
const API_URL = (RAW_API_URL || '').replace(/\/+$/, '');

export async function GET(request) {
  if (!API_URL) {
    return new Response(JSON.stringify({ error: 'API url not configured' }), {
      status: 500,
      headers: jsonHeaders()
    });
  }

  try {
    const userId = request.headers.get('x-user-id') || '';
    const resp = await fetch(`${API_URL}/api/payments/toss/billing/status`, {
      method: 'GET',
      headers: {
        ...jsonHeaders(),
        'x-user-id': userId
      }
    });

    const text = await resp.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      data = { error: text || 'Unable to parse backend response' };
    }

    return new Response(JSON.stringify(data), {
      status: resp.status,
      headers: jsonHeaders()
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: jsonHeaders()
    });
  }
}
