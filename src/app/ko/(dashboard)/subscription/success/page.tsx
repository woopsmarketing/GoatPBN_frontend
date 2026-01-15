// v1.2 - 결제 성공 후 구독/크레딧 후처리 (2026.01.15)
// 기능 요약: successUrl 쿼리(paymentKey/orderId/amount)로 confirm 호출 후 구독 활성화 처리까지 수행
// 사용 예시: /ko/subscription/success?paymentKey=...&orderId=...&amount=10000

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import { authAPI, supabase } from '../../../../../lib/supabase';

const buildPlanSlugFromConfirm = async (amount, confirmData) => {
  // 한글 주석: 1) confirm 응답 메타데이터 우선
  const metadataPlan = confirmData?.metadata?.planSlug || confirmData?.metadata?.plan_slug;
  if (metadataPlan) return metadataPlan;

  // 한글 주석: 2) orderName에 Basic/Pro 포함 여부로 판단
  const orderName = String(confirmData?.orderName || confirmData?.order_name || '');
  if (/basic/i.test(orderName)) return 'basic';
  if (/pro/i.test(orderName)) return 'pro';

  // 한글 주석: 3) billing_plans metadata의 금액 매칭
  try {
    const { data, error } = await supabase.from('billing_plans').select('slug, metadata').in('slug', ['basic', 'pro']);
    if (error) throw error;
    const matched = (data || []).find((row) => Number(row?.metadata?.toss_amount_krw) === Number(amount));
    if (matched?.slug) return matched.slug;
  } catch (err) {
    console.warn('플랜 매칭 조회 실패:', err?.message || err);
  }

  // 한글 주석: 4) 안전한 금액 하드코딩 매칭 (최후의 fallback)
  if (Number(amount) === 20000) return 'basic';
  if (Number(amount) === 50000) return 'pro';

  return '';
};

const applyTossPostProcess = async (payload: Record<string, any>) => {
  const response = await fetch('/api/payments/toss/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.detail || result?.message || '구독 후처리에 실패했습니다.');
  }
  return result;
};

export default function SubscriptionSuccessPage() {
  const [statusMessage, setStatusMessage] = useState('결제 확인 중입니다...');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmResult, setConfirmResult] = useState<Record<string, any> | null>(null);
  const [postProcessMessage, setPostProcessMessage] = useState('');
  const [postProcessError, setPostProcessError] = useState('');
  const postProcessDoneRef = useRef(false);

  // 한글 주석: 쿼리에서 결제 정보를 안전하게 파싱합니다.
  const queryInfo = useMemo(() => {
    if (typeof window === 'undefined') {
      return { paymentKey: '', orderId: '', amount: null };
    }
    const params = new URLSearchParams(window.location.search);
    const amountRaw = params.get('amount');
    const parsedAmount = amountRaw ? Number(amountRaw) : null;
    return {
      paymentKey: params.get('paymentKey') || '',
      orderId: params.get('orderId') || '',
      amount: Number.isFinite(parsedAmount) ? parsedAmount : null
    };
  }, []);

  useEffect(() => {
    // 한글 주석: 클라이언트에서만 실행(리다이렉트 쿼리 파라미터 사용)
    const { paymentKey, orderId, amount } = queryInfo;
    if (!paymentKey || !orderId || amount === null) {
      setErrorMessage('결제 정보가 올바르지 않습니다.');
      return;
    }

    const confirmPayload = {
      paymentKey,
      orderId,
      amount
    };

    fetch('https://jjqugwegnpbwsxgclywg.supabase.co/functions/v1/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 한글 주석: 한국어 페이지 테넌트 키
        'X-Tenant-Key': 'tenant_key_goatpbn_ko'
      },
      body: JSON.stringify(confirmPayload)
    })
      .then((res) => res.json())
      .then((data) => {
        setConfirmResult(data);
        if (data?.status === 'CONFIRMED' || data?.status === 'ALREADY_CONFIRMED') {
          setStatusMessage('결제가 완료되었습니다.');
          return data;
        }
        throw new Error(data?.message || '결제 확인에 실패했습니다. 다시 시도해주세요.');
      })
      .then(async (data) => {
        // 한글 주석: 결제 확인 완료 후 구독/크레딧 후처리
        if (postProcessDoneRef.current) return;
        postProcessDoneRef.current = true;
        setPostProcessMessage('구독 정보를 반영하는 중입니다...');

        const { data: authData, error: authError } = await authAPI.getCurrentUser();
        if (authError || !authData?.user?.id) {
          throw new Error('로그인 정보를 찾을 수 없습니다.');
        }

        const planSlug = await buildPlanSlugFromConfirm(queryInfo.amount, data);
        if (!planSlug) {
          throw new Error('플랜 정보를 확인할 수 없습니다. 고객센터에 문의해주세요.');
        }

        await applyTossPostProcess({
          user_id: authData.user.id,
          plan_slug: planSlug,
          payment_key: queryInfo.paymentKey,
          order_id: queryInfo.orderId,
          amount: queryInfo.amount,
          currency: 'KRW',
          status: data?.status || 'CONFIRMED',
          raw_payload: data
        });
        setPostProcessMessage(`구독이 활성화되었습니다. (${planSlug.toUpperCase()})`);
        setPostProcessError('');
        return null;
      })
      .catch((err) => {
        if (postProcessMessage) {
          setPostProcessError(err?.message || '구독 반영 중 오류가 발생했습니다.');
          return;
        }
        setErrorMessage(err?.message || '결제 확인 중 오류가 발생했습니다.');
      })
      .catch((err) => {
        console.error('confirm 호출 실패:', err);
      });
  }, [queryInfo]);

  const amountLabel = useMemo(() => {
    if (!queryInfo.amount) return '—';
    return `${queryInfo.amount.toLocaleString('ko-KR')}원`;
  }, [queryInfo.amount]);

  if (errorMessage) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="text-lg font-semibold text-red-700">결제 확인에 실패했습니다.</p>
          <p className="mt-2">{errorMessage}</p>
          {(confirmResult?.code || confirmResult?.message) && (
            <div className="mt-4 rounded border border-red-200 bg-white p-3 text-xs text-red-700">
              <p>code: {confirmResult?.code || 'N/A'}</p>
              <p>message: {confirmResult?.message || 'N/A'}</p>
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
        <p className="mt-2">결제 처리가 완료되면 구독/크레딧이 자동 반영됩니다.</p>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-700">
        <p className="text-base font-semibold text-gray-900">결제 요약</p>
        <div className="mt-3 space-y-1">
          <p>
            주문번호: <span className="font-medium">{queryInfo.orderId || '—'}</span>
          </p>
          <p>
            결제금액: <span className="font-medium">{amountLabel}</span>
          </p>
          <p>
            확인상태: <span className="font-medium">{confirmResult?.status || '확인 중'}</span>
          </p>
        </div>
        {confirmResult?.status && confirmResult?.status !== 'CONFIRMED' && confirmResult?.status !== 'ALREADY_CONFIRMED' && (
          <p className="mt-3 text-xs text-gray-500">승인 상태가 반영되기까지 잠시 시간이 걸릴 수 있습니다.</p>
        )}
      </div>

      {(postProcessMessage || postProcessError) && (
        <div
          className={`mt-6 rounded-lg border p-4 text-sm ${
            postProcessError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {postProcessError || postProcessMessage}
        </div>
      )}

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
