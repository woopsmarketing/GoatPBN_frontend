// v1.1 - 환불 승인 프록시에 CORS 대응 추가 (2026.01.28)
// 기능 요약: 필요 시 goatpbn.com에서도 관리자 승인 요청을 처리할 수 있도록 CORS를 허용합니다.
import { jsonHeaders } from '@/lib/api/httpClient';
import { buildCorsHeaders, handleCorsPreflight, withCors } from '@/app/api/_utils/cors';

// v1.0 - 환불 승인 프록시: 관리자만 호출
// 한글 주석: 백엔드 FastAPI의 /api/refunds/approve 로 전달합니다.

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

// 한글 주석: 프리플라이트 요청을 허용합니다.
export async function OPTIONS(request) {
  return handleCorsPreflight(request);
}
