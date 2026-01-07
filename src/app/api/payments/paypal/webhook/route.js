import { proxyToBackend } from '@/app/api/_utils/backendProxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// v1.1 - PayPal webhook 프록시
// - PayPal이 보내는 원본 헤더/바디를 그대로 FastAPI로 전달합니다.
// - body는 스트림을 소모하지 않도록 text()로 한 번만 읽어 전달합니다.
export async function POST(req) {
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    return await proxyToBackend('/api/payments/paypal/webhook', {
      method: 'POST',
      headers,
      body: rawBody
    });
  } catch (err) {
    // 한글 주석: Vercel 로그 확인용
    console.error('[webhook proxy] forward failed', err);
    return new Response(JSON.stringify({ detail: 'webhook proxy failed', error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
