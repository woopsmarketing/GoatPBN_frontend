import { jsonHeaders } from '@/lib/api/httpClient';

// v1.0 - 환불 승인 프록시: 관리자만 호출
// 한글 주석: 백엔드 FastAPI의 /api/refunds/approve 로 전달합니다.

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_SERVER_URL;
const API_URL = (RAW_API_URL || '').replace(/\/+$/, '');

export async function POST(request) {
  if (!API_URL) {
    return new Response(JSON.stringify({ error: 'API url not configured' }), {
      status: 500,
      headers: jsonHeaders()
    });
  }

  try {
    const payload = await request.json();
    const userId = request.headers.get('x-user-id') || '';
    const resp = await fetch(`${API_URL}/api/refunds/approve`, {
      method: 'POST',
      headers: {
        ...jsonHeaders(),
        'x-user-id': userId
      },
      body: JSON.stringify(payload)
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
