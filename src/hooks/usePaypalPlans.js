import { useCallback, useEffect, useState } from 'react';

import { buildApiUrl, jsonHeaders } from '@/lib/api/httpClient';

// v1.1 - PayPal 구독 훅 개선 (2026.01.07)
// - 한글 주석: 백엔드가 x-user-id 헤더를 요구하므로 userId를 받아 헤더에 포함합니다.
// - 한글 주석: 승인 후 confirm API 호출을 위한 helper를 제공합니다.
export function usePaypalPlans({ returnUrl, cancelUrl, userId }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState('');

  useEffect(() => {
    let active = true;

    const loadPlans = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/payments/paypal/plans'));
        if (!response.ok) {
          throw new Error('Failed to load payment plans');
        }
        const payload = await response.json();
        if (active) {
          setPlans(payload.plans || []);
        }
      } catch (err) {
        console.error('PayPal plan load failed', err);
        if (active) {
          setError('Unable to fetch PayPal plan definitions right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPlans();
    return () => {
      active = false;
    };
  }, []);

  const subscribeToPlan = useCallback(
    async (planSlug) => {
      if (!returnUrl || !cancelUrl) {
        throw new Error('Return/cancel URLs are required');
      }
      if (!userId) {
        throw new Error('User context missing (userId)');
      }

      setSubmitting(planSlug);
      try {
        const response = await fetch(buildApiUrl('/api/payments/paypal/create-subscription'), {
          method: 'POST',
          headers: jsonHeaders({ 'x-user-id': userId }),
          body: JSON.stringify({
            plan_slug: planSlug,
            return_url: returnUrl,
            cancel_url: cancelUrl
          })
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.detail || 'PayPal subscription request failed.');
        }

        if (!payload.approval_url) {
          throw new Error('PayPal approval URL missing.');
        }

        window.location.href = payload.approval_url;
      } finally {
        setSubmitting('');
      }
    },
    [returnUrl, cancelUrl, userId]
  );

  const confirmSubscription = useCallback(
    async (subscriptionId) => {
      // 한글 주석: PayPal 승인 후 리다이렉트된 subscription_id를 백엔드 confirm에 전달합니다.
      if (!subscriptionId) {
        throw new Error('subscription_id missing');
      }
      if (!userId) {
        throw new Error('User context missing (userId)');
      }

      const response = await fetch(buildApiUrl('/api/payments/paypal/confirm'), {
        method: 'POST',
        headers: jsonHeaders({ 'x-user-id': userId }),
        body: JSON.stringify({ subscription_id: subscriptionId })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || 'PayPal confirmation failed.');
      }
      return payload;
    },
    [userId]
  );

  return {
    plans,
    loading,
    error,
    subscribing: submitting,
    subscribeToPlan,
    confirmSubscription
  };
}
