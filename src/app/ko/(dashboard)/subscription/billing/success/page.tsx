// v1.0 - 토스 빌링키 발급 성공 처리 (2026.01.15)
// 기능 요약: authKey/customerKey로 빌링키 발급 후 첫 결제 승인까지 수행
// 사용 예시: /ko/subscription/billing/success?authKey=...&customerKey=...&plan=basic&amount=20000

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { authAPI } from '@/lib/supabase';
import { jsonHeaders } from '@/lib/api/httpClient';

export default function TossBillingSuccessPage() {
  const [statusMessage, setStatusMessage] = useState('카드 등록 정보를 확인 중입니다...');
  const [errorMessage, setErrorMessage] = useState('');
  const [resultPayload, setResultPayload] = useState<Record<string, any> | null>(null);

  const queryInfo = useMemo(() => {
    if (typeof window === 'undefined') {
      return { authKey: '', customerKey: '', plan: '', amount: null };
    }
    const params = new URLSearchParams(window.location.search);
    const amountRaw = params.get('amount');
    const parsedAmount = amountRaw ? Number(amountRaw) : null;
    return {
      authKey: params.get('authKey') || '',
      customerKey: params.get('customerKey') || '',
      plan: params.get('plan') || '',
      amount: Number.isFinite(parsedAmount) ? parsedAmount : null
    };
  }, []);

  useEffect(() => {
    const { authKey, customerKey, plan, amount } = queryInfo;
    if (!authKey || !customerKey || !plan) {
      setErrorMessage('카드 등록 정보가 올바르지 않습니다.');
      return;
    }

    (async () => {
      try {
        setStatusMessage('정기결제 등록을 완료하는 중입니다...');
        const { data: authData, error: authError } = await authAPI.getCurrentUser();
        if (authError || !authData?.user?.id) {
          throw new Error('로그인 정보를 찾을 수 없습니다.');
        }

        const resp = await fetch('/api/payments/toss/billing/issue', {
          method: 'POST',
          headers: jsonHeaders({ 'x-user-id': authData.user.id }),
          body: JSON.stringify({
            auth_key: authKey,
            customer_key: customerKey,
            plan_slug: plan,
            amount,
            order_name: `GoatPBN ${plan.toUpperCase()} 정기결제`,
            customer_email: authData.user.email || undefined,
            customer_name:
              authData.user.user_metadata?.full_name ||
              authData.user.user_metadata?.name ||
              authData.user.email?.split('@')?.[0] ||
              undefined
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data?.detail || data?.error || '정기결제 등록 실패');
        }
        setResultPayload(data);
        setStatusMessage('정기결제가 완료되었습니다.');
      } catch (err) {
        // 한글 주석: Error 여부를 안전하게 판단해 사용자에게 메시지를 보여줍니다.
        const safeErrorMessage = err instanceof Error ? err.message : '정기결제 등록에 실패했습니다.';
        setErrorMessage(safeErrorMessage);
      }
    })();
  }, [queryInfo]);

  const amountLabel = useMemo(() => {
    if (!queryInfo.amount) return '—';
    return `${queryInfo.amount.toLocaleString('ko-KR')}원`;
  }, [queryInfo.amount]);

  if (errorMessage) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="text-lg font-semibold text-red-700">정기결제 등록에 실패했습니다.</p>
          <p className="mt-2">{errorMessage}</p>
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

  return (
    <div className="p-8">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
        <p className="text-lg font-semibold text-emerald-800">{statusMessage}</p>
        <p className="mt-2">정기결제가 완료되면 구독/크레딧이 자동 반영됩니다.</p>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-700">
        <p className="text-base font-semibold text-gray-900">결제 요약</p>
        <div className="mt-3 space-y-1">
          <p>
            플랜: <span className="font-medium">{queryInfo.plan?.toUpperCase() || '—'}</span>
          </p>
          <p>
            결제금액: <span className="font-medium">{amountLabel}</span>
          </p>
          <p>
            상태: <span className="font-medium">{resultPayload?.payment?.status || '처리 중'}</span>
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/ko/subscription"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
        >
          구독 내역 보기
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
