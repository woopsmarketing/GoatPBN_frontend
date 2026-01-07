import { useCallback, useEffect, useState } from 'react';

import { buildApiUrl, jsonHeaders } from '@/lib/api/httpClient';

export function usePaypalPlans(returnUrl, cancelUrl) {
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

      setSubmitting(planSlug);
      try {
        const response = await fetch(buildApiUrl('/api/payments/paypal/create-subscription'), {
          method: 'POST',
          headers: jsonHeaders(),
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
    [returnUrl, cancelUrl]
  );

  return {
    plans,
    loading,
    error,
    subscribing: submitting,
    subscribeToPlan
  };
}
