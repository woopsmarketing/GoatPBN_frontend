// v1.1 - 실패 사유/재시도/문의 안내 제공 (2026.01.15)
// 기능 요약: failUrl로 리다이렉트된 경우 에러 메시지/재시도/문의 버튼 표시
// 사용 예시: /ko/subscription/fail?code=...&message=...&orderId=...

'use client';

import Link from 'next/link';
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
    <div className="p-8">
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <p className="text-lg font-semibold">결제가 실패했습니다.</p>
        <p className="mt-2 text-sm">아래 사유를 확인한 뒤 다시 시도해주세요.</p>
        {(code || message || orderId) && (
          <div className="mt-4 rounded border border-red-200 bg-white p-4 text-xs text-red-700">
            <p>code: {code || 'N/A'}</p>
            <p>message: {message || 'N/A'}</p>
            <p>orderId: {orderId || 'N/A'}</p>
          </div>
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/ko/subscription"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
        >
          다시 시도하기
        </Link>
        <a
          href="https://totoggong.com/contact"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          고객센터 문의
        </a>
      </div>
    </div>
  );
}
