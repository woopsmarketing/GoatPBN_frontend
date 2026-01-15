// v1.0 - 토스페이먼츠 결제 실패 페이지 (2026.01.15)
// 기능 요약: failUrl로 리다이렉트된 경우 에러 메시지 안내
// 사용 예시: /ko/subscription/fail?code=...&message=...&orderId=...

'use client';

import { useMemo } from 'react';

export default function SubscriptionFailPage() {
  const { code, message, orderId } = useMemo(() => {
    if (typeof window === 'undefined') return { code: '', message: '', orderId: '' };
    const params = new URLSearchParams(window.location.search);
    return {
      code: params.get('code') || '',
      message: params.get('message') || '',
      orderId: params.get('orderId') || ''
    };
  }, []);

  return (
    <div className="p-8 text-red-600">
      <p className="text-lg font-semibold">결제가 실패했습니다.</p>
      <p className="mt-2 text-sm">잠시 후 다시 시도해주세요.</p>
      {(code || message || orderId) && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>code: {code || 'N/A'}</p>
          <p>message: {message || 'N/A'}</p>
          <p>orderId: {orderId || 'N/A'}</p>
        </div>
      )}
    </div>
  );
}
