import { proxyToBackend } from '@/app/api/_utils/backendProxy';

// v1.0 - PayPal webhook 프록시
// - 한글 주석: PayPal이 app.goatpbn.com/api/payments/paypal/webhook 으로 보내는 웹훅을
//   백엔드 FastAPI로 그대로 전달합니다.
export async function POST(req) {
  // PayPal 서명 검증을 위해 원본 헤더/바디 그대로 전달
  return proxyToBackend(req);
}
