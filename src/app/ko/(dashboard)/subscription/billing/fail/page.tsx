// v1.0 - 토스 빌링키 등록 실패 페이지 (2026.01.15)
// 기능 요약: 카드 등록 실패 사유 표시 및 재시도 안내

'use client';

import { useMemo } from 'react';
import Link from 'next/link';

export default function TossBillingFailPage() {
  const queryInfo = useMemo(() => {
    if (typeof window === 'undefined') {
      return { code: '', message: '' };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      code: params.get('code') || '',
      message: params.get('message') || ''
    };
  }, []);

  return (
    <div className="p-8">
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <p className="text-lg font-semibold text-red-700">정기결제 카드 등록에 실패했습니다.</p>
        <p className="mt-2">{queryInfo.message || '카드 등록 중 오류가 발생했습니다.'}</p>
        {queryInfo.code && <p className="mt-2 text-xs text-red-600">code: {queryInfo.code}</p>}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/ko/subscription"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
        >
          다시 시도하기
        </Link>
        <Link
          href="/ko/dashboard"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          대시보드로 이동
        </Link>
      </div>
    </div>
  );
}
