// v1.0 - PayPal 플랜 프록시 (2026.01.07)
// 한글 주석: 브라우저에서 Cloudtype 백엔드 주소가 노출되지 않도록 Next.js 서버에서 프록시합니다.

import { proxyToBackend } from '@/app/api/_utils/backendProxy';

export async function GET() {
  return await proxyToBackend('/api/payments/paypal/plans', { method: 'GET' });
}
