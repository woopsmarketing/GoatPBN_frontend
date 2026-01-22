// v1.0 - 토스 구독 취소 프록시 (2026.01.22)
// 기능 요약: FastAPI /api/payments/toss/cancel-subscription 로 전달 + CORS 허용

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
    const userId = request.headers.get('x-user-id') || '';
    const resp = await fetch(`${API_URL}/api/payments/toss/cancel-subscription`, {
      method: 'POST',
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
