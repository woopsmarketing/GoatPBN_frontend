// v1.0 - 토스 결제 웹훅 수신/확정 처리 (2026.01.15)
// 기능 요약: PAYMENT_STATUS_CHANGED(DONE) 이벤트 수신 시 confirm 호출로 결제 확정(멱등)
// 사용 예시: 개발자센터 웹훅 엔드포인트에 /api/payments/toss/webhook 등록

const DEFAULT_API_BASE = 'https://jjqugwegnpbwsxgclywg.supabase.co/functions/v1';
const DEFAULT_TENANT_KEY = 'tenant_key_goatpbn_ko';

// 한글 주석: confirm 호출을 공용 함수로 분리해 재사용/테스트를 쉽게 합니다.
const confirmTossPayment = async ({ paymentKey, orderId, amount }) => {
  const apiBase = process.env.NEXT_PUBLIC_TOSS_API_BASE || DEFAULT_API_BASE;
  const tenantKey = process.env.NEXT_PUBLIC_TOSS_TENANT_KEY || DEFAULT_TENANT_KEY;

  const response = await fetch(`${apiBase.replace(/\/$/, '')}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Key': tenantKey
    },
    body: JSON.stringify({ paymentKey, orderId, amount })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || payload?.error || 'confirm 호출 실패';
    throw new Error(message);
  }
  return payload;
};

export async function POST(request) {
  try {
    const body = await request.json();
    const eventType = body?.eventType || '';
    const data = body?.data || {};

    // 한글 주석: 결제 완료 이벤트만 confirm 처리합니다.
    if (eventType !== 'PAYMENT_STATUS_CHANGED') {
      return Response.json({ received: true, skipped: true }, { status: 200 });
    }

    const status = data?.status || '';
    if (status !== 'DONE') {
      return Response.json({ received: true, skipped: true }, { status: 200 });
    }

    const paymentKey = data?.paymentKey;
    const orderId = data?.orderId;
    const amount = Number(data?.totalAmount ?? data?.amount ?? 0);

    // 한글 주석: 필수값 누락 시에는 실패로 반환해 웹훅 재시도를 유도합니다.
    if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
      return Response.json({ received: false, error: '필수 결제 정보가 누락되었습니다.' }, { status: 400 });
    }

    const confirmResult = await confirmTossPayment({ paymentKey, orderId, amount });

    return Response.json(
      {
        received: true,
        confirmed: confirmResult?.status === 'CONFIRMED' || confirmResult?.status === 'ALREADY_CONFIRMED',
        status: confirmResult?.status || 'UNKNOWN'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[toss webhook] 처리 실패:', error);
    return Response.json({ received: false, error: error?.message || '웹훅 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
