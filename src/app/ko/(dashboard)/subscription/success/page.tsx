// v1.0 - 토스페이먼츠 결제 성공 페이지 (2026.01.15)
// 기능 요약: successUrl 쿼리(paymentKey/orderId/amount)로 confirm 호출
// 사용 예시: /ko/subscription/success?paymentKey=...&orderId=...&amount=10000

'use client';

import { useEffect, useState } from 'react';

export default function SubscriptionSuccessPage() {
  const [statusMessage, setStatusMessage] = useState('결제 확인 중입니다...');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // 한글 주석: 클라이언트에서만 실행(리다이렉트 쿼리 파라미터 사용)
    const params = new URLSearchParams(window.location.search);
    const paymentKey = params.get('paymentKey');
    const orderId = params.get('orderId');
    const amount = params.get('amount');

    if (!paymentKey || !orderId || !amount) {
      setErrorMessage('결제 정보가 올바르지 않습니다.');
      return;
    }

    const confirmPayload = {
      paymentKey,
      orderId,
      amount: Number(amount)
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
        if (data?.status === 'CONFIRMED') {
          setStatusMessage('결제가 완료되었습니다.');
          return;
        }
        setErrorMessage('결제 확인에 실패했습니다. 다시 시도해주세요.');
      })
      .catch((err) => {
        console.error('confirm 호출 실패:', err);
        setErrorMessage('결제 확인 중 오류가 발생했습니다.');
      });
  }, []);

  if (errorMessage) {
    return <div className="p-8 text-red-600">{errorMessage}</div>;
  }

  return <div className="p-8">{statusMessage}</div>;
}
