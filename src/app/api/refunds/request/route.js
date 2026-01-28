// v1.1 - 환불 요청 프록시에 CORS 대응 추가 (2026.01.28)
// 기능 요약: goatpbn.com에서 환불 요청 API를 호출할 수 있도록 CORS 헤더를 적용합니다.
import { jsonHeaders } from '@/lib/api/httpClient';
import { buildCorsHeaders, handleCorsPreflight, withCors } from '@/app/api/_utils/cors';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_SERVER_URL;
const API_URL = (RAW_API_URL || '').replace(/\/+$/, '');

export async function POST(request) {
  const corsHeaders = buildCorsHeaders(request);
  if (!API_URL) {
    return withCors(
      new Response(JSON.stringify({ error: 'API url not configured' }), {
        status: 500,
        headers: jsonHeaders()
      }),
      corsHeaders
    );
  }

  try {
    const payload = await request.json();
    const userId = request.headers.get('x-user-id') || '';
    const resp = await fetch(`${API_URL}/api/refunds/request`, {
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
    return withCors(
      new Response(JSON.stringify(data), {
        status: resp.status,
        headers: jsonHeaders()
      }),
      corsHeaders
    );
  } catch (error) {
    return withCors(
      new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
        status: 500,
        headers: jsonHeaders()
      }),
      corsHeaders
    );
  }
}

// 한글 주석: goatpbn.com에서 호출할 수 있도록 프리플라이트를 허용합니다.
export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}
