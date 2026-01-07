'use client';

// v1.0 - Subscription overview (English)
// Displays Supabase subscription data with English copy

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import { authAPI, supabase } from '@/lib/supabase';
import { formatToUserTimeZone } from '@/lib/utils/userTimeZone';
import { usePaypalPlans } from '@/hooks/usePaypalPlans';

const PLAN_LABELS = {
  free: 'Free plan',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  enterprise: 'Enterprise',
  custom: 'Custom plan'
};

export default function SubscriptionPageEn() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [planError, setPlanError] = useState('');
  const [userId, setUserId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    let active = true;

    const loadSubscription = async () => {
      try {
        const { data: authData, error: authError } = await authAPI.getCurrentUser();
        if (authError) throw authError;
        const user = authData?.user;
        if (!user) {
          setError('Unable to locate login information.');
          return;
        }
        if (active) {
          setUserId(user.id);
        }

        const { data, error: subError } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();

        if (subError) throw subError;
        if (active) {
          setSubscription(data);
        }
      } catch (err) {
        console.error('Failed to load subscription:', err);
        if (active) {
          setError('Unable to fetch subscription data. Please try again shortly.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSubscription();
    return () => {
      active = false;
    };
  }, []);

  const planLabel = useMemo(() => {
    if (!subscription?.plan) return 'No plan selected';
    return PLAN_LABELS[subscription.plan] || subscription.plan;
  }, [subscription]);

  const expiryLabel = useMemo(() => {
    if (!subscription?.expiry_date) return 'Unlimited';
    return formatToUserTimeZone(subscription.expiry_date, { year: 'numeric', month: 'long', day: 'numeric' });
  }, [subscription]);

  const credits = useMemo(() => {
    const total = subscription?.credits_total ?? 0;
    const usedRaw = subscription?.credits_used ?? 0;
    const used = Math.min(usedRaw, total);
    const remaining = Math.max(total - used, 0);
    return { total, used, remaining };
  }, [subscription]);

  const daysRemaining = useMemo(() => {
    if (!subscription?.expiry_date) return null;
    const end = new Date(subscription.expiry_date).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }, [subscription]);

  const currentPlanSlug = (subscription?.plan || '').toLowerCase();

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const returnUrl = `${origin}/en/subscription?paypal_status=success`;
  const cancelUrl = `${origin}/en/subscription?paypal_status=cancel`;
  const {
    plans,
    loading: plansLoading,
    error: plansFetchError,
    subscribing,
    subscribeToPlan,
    confirmSubscription,
    upgradeSubscription,
    downgradeSubscription,
    processing
  } = usePaypalPlans({
    returnUrl,
    cancelUrl,
    userId
  });

  const handleSubscribe = async (planSlug) => {
    setPlanError('');
    try {
      await subscribeToPlan(planSlug);
    } catch (err) {
      console.error(err);
      setPlanError(err?.message || 'Unable to start PayPal checkout.');
    }
  };

  useEffect(() => {
    // 한글 주석: PayPal 승인 후 returnUrl로 돌아오면 subscription_id가 query string에 붙습니다.
    // 예) /en/subscription?paypal_status=success&subscription_id=I-XXXX
    const paypalStatus = searchParams?.get('paypal_status') || '';
    const subscriptionId = searchParams?.get('subscription_id') || '';

    if (!paypalStatus) return;

    if (paypalStatus === 'cancel') {
      setPaymentStatus('Payment cancelled.');
      return;
    }

    if (paypalStatus === 'success' && subscriptionId && userId) {
      let active = true;
      (async () => {
        try {
          setPaymentStatus('Confirming PayPal subscription...');
          const result = await confirmSubscription(subscriptionId);
          if (active) {
            setPaymentStatus(`Subscription confirmed: ${result.status || 'OK'}`);
          }

          // 한글 주석: confirm 성공 후 Supabase subscriptions 테이블 상태가 변경되었을 수 있으므로 재조회합니다.
          const { data, error: subError } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
          if (!subError && active) {
            setSubscription(data);
          }
        } catch (err) {
          console.error(err);
          if (active) {
            setPaymentStatus('');
            setPlanError(err?.message || 'Failed to confirm PayPal subscription.');
          }
        }
      })();

      return () => {
        active = false;
      };
    }
  }, [searchParams, userId, confirmSubscription]);

  return (
    <div className="space-y-6">
      <MainCard title="Subscription overview">
        {loading ? (
          <p className="text-sm text-gray-600">Loading subscription details...</p>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : subscription ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">{planLabel}</h3>
              <p className="text-sm text-gray-600">
                {subscription.description || 'No description yet. Contact support for a tailored plan or onboarding guidance.'}
              </p>
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <p>
                  Status: <span className="font-medium text-gray-900">{subscription.status}</span>
                </p>
                <p className="mt-2">
                  Renewal/expiry: <span className="font-medium text-gray-900">{expiryLabel}</span>
                </p>
                {daysRemaining !== null && (
                  <p className="mt-1 text-xs text-gray-500">
                    Days remaining: <span className="font-semibold text-gray-700">{daysRemaining} days</span>
                  </p>
                )}
              </div>
              <TailwindButton size="lg" variant="secondary" onClick={() => window.open('https://totoggong.com/contact', '_blank')}>
                Request plan upgrade
              </TailwindButton>
            </div>
            <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-3">
              <div className="space-y-1 rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total credits</p>
                <p className="text-2xl font-bold text-blue-600">{credits.total.toLocaleString()}</p>
              </div>
              <div className="space-y-1 rounded-lg bg-purple-50 p-4 text-center">
                <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Used</p>
                <p className="text-2xl font-bold text-purple-600">{credits.used.toLocaleString()}</p>
              </div>
              <div className="space-y-1 rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Remaining</p>
                <p className={`text-2xl font-bold ${credits.remaining <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {credits.remaining.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
            <p className="font-medium text-gray-900">No subscription record yet.</p>
            <p className="mt-2">You are starting on the free tier. Upgrade anytime when you need more credits or automation volume.</p>
            <TailwindButton className="mt-4" onClick={() => window.open('https://totoggong.com/contact', '_blank')}>
              Request consultation
            </TailwindButton>
          </div>
        )}
      </MainCard>
      <MainCard title="Plan overview">
        {paymentStatus && <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">{paymentStatus}</div>}
        {plansFetchError && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">{plansFetchError}</div>
        )}
        {planError && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{planError}</div>}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {plansLoading
            ? Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                  aria-hidden
                >
                  <div className="h-6 w-1/3 rounded bg-gray-200" />
                  <div className="mt-3 h-3 w-2/3 rounded bg-gray-200" />
                  <div className="mt-6 h-8 w-full rounded bg-gray-200" />
                </div>
              ))
            : plans.map((plan) => (
                <div key={plan.slug} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{plan.name}</h4>
                      <p className="mt-1 text-sm font-medium text-gray-500">{plan.description}</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                      {plan.interval || 'month'}
                    </span>
                  </div>
                  <div className="mt-5 flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-gray-900">
                      {plan.currency} {plan.price?.toLocaleString() ?? 'TBD'}
                    </p>
                    <span className="text-sm text-gray-500">/ {plan.interval || 'month'}</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    {(plan.features || []).map((feature) => (
                      <li key={`${plan.slug}-${feature}`} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {plan.slug === currentPlanSlug ? (
                    <TailwindButton size="lg" variant="secondary" className="mt-auto" disabled>
                      Current plan
                    </TailwindButton>
                  ) : currentPlanSlug && currentPlanSlug !== 'free' && plan.slug === 'pro' ? (
                    <TailwindButton
                      size="lg"
                      variant="primary"
                      className="mt-auto"
                      onClick={async () => {
                        try {
                          const subId = subscription?.provider_subscription_id;
                          if (!subId) throw new Error('No provider subscription id');
                          setPlanError('');
                          setPaymentStatus('Upgrading (prorated) via PayPal...');
                          await upgradeSubscription(subId, plan.slug);
                          setPaymentStatus('Upgrade requested. PayPal will prorate the difference.');
                          const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
                          if (data) setSubscription(data);
                        } catch (e) {
                          setPlanError(e.message || 'Upgrade failed');
                          setPaymentStatus('');
                        }
                      }}
                      disabled={processing === 'upgrade'}
                    >
                      {processing === 'upgrade' ? 'Upgrading...' : 'Upgrade (pro-rated)'}
                    </TailwindButton>
                  ) : currentPlanSlug && currentPlanSlug === 'pro' && plan.slug === 'basic' ? (
                    <TailwindButton
                      size="lg"
                      variant="secondary"
                      className="mt-auto"
                      onClick={async () => {
                        try {
                          const subId = subscription?.provider_subscription_id;
                          if (!subId) throw new Error('No provider subscription id');
                          setPlanError('');
                          setPaymentStatus('Downgrade will apply next cycle.');
                          await downgradeSubscription(subId, plan.slug);
                          const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
                          if (data) setSubscription(data);
                        } catch (e) {
                          setPlanError(e.message || 'Downgrade failed');
                          setPaymentStatus('');
                        }
                      }}
                      disabled={processing === 'downgrade'}
                    >
                      {processing === 'downgrade' ? 'Processing...' : 'Downgrade next cycle'}
                    </TailwindButton>
                  ) : (
                    <TailwindButton
                      size="lg"
                      variant="primary"
                      className="mt-auto"
                      onClick={() => handleSubscribe(plan.slug)}
                      disabled={subscribing === plan.slug}
                    >
                      {subscribing === plan.slug ? 'Redirecting to PayPal...' : 'Subscribe with PayPal'}
                    </TailwindButton>
                  )}
                </div>
              ))}
          {!plansLoading && plans.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
              No PayPal plans are configured yet.
            </div>
          )}
        </div>
      </MainCard>
    </div>
  );
}
