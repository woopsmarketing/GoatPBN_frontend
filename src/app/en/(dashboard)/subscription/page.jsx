'use client';

// v1.0 - Subscription overview (English)
// Displays Supabase subscription data with English copy

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import { authAPI, supabase } from '@/lib/supabase';
import { formatToUserTimeZone } from '@/lib/utils/userTimeZone';
import { usePaypalPlans } from '@/hooks/usePaypalPlans';
import { jsonHeaders } from '@/lib/api/httpClient';

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
  // 한글 주석: 낙관적 업데이트 후 3~5초 뒤 재조회 타이머(중복 실행 방지)
  const refreshTimerRef = useRef(null);

  // helper: subscriptions + user_subscriptions 병합 조회
  const fetchSubAndUserSub = async (uid) => {
    const { data, error: subError } = await supabase.from('subscriptions').select('*').eq('user_id', uid).maybeSingle();
    if (subError) throw subError;
    // user_subscriptions keeps history; read only latest active/pending row for UI.
    const { data: userSubs, error: userSubError } = await supabase
      .from('user_subscriptions')
      .select('provider_subscription_id, plan_id, status, next_billing_date')
      .eq('user_id', uid)
      .in('status', ['active', 'approval_pending'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (userSubError) {
      console.warn('user_subscriptions fetch failed:', userSubError.message);
    }

    const userSub = Array.isArray(userSubs) ? userSubs[0] : null;

    // Convert current plan slug -> billing_plans.id so we can compare with plan_id.
    let currentPlanId = null;
    if (data?.plan) {
      const { data: planRow, error: planError } = await supabase.from('billing_plans').select('id').eq('slug', data.plan).limit(1);
      if (planError) {
        console.warn('billing_plans fetch failed:', planError.message);
      } else {
        currentPlanId = Array.isArray(planRow) ? planRow[0]?.id : null;
      }
    }
    return {
      ...(data || {}),
      current_plan_id: currentPlanId,
      provider_subscription_id: userSub?.provider_subscription_id || data?.provider_subscription_id,
      reserved_plan_id: userSub?.plan_id || null,
      reserved_status: userSub?.status || null,
      reserved_next_billing_date: userSub?.next_billing_date || null
    };
  };

  // 한글 주석: 클릭 직후 UI를 먼저 토글(낙관적)하고, 3~5초 뒤 DB 상태로 최종 동기화합니다.
  const scheduleRefresh = (delayMs = 10000) => {
    if (!userId) return;
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const merged = await fetchSubAndUserSub(userId);
        setSubscription(merged);
        setPaymentStatus('');
      } catch (err) {
        console.error('Subscription refresh failed:', err);
      }
    }, delayMs);
  };

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

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

        const merged = await fetchSubAndUserSub(user.id);
        if (active) setSubscription(merged);
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
    return formatToUserTimeZone(subscription.expiry_date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
      locale: 'en-US'
    });
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
  // 한글 주석: 낙관적 업데이트 시 reserved_plan_id를 특수 문자열로 세팅해 즉시 토글되도록 합니다.
  const isOptimisticReserved =
    typeof subscription?.reserved_plan_id === 'string' && subscription.reserved_plan_id.startsWith('__optimistic__');
  // Reserved if current plan is pro and reserved_plan_id differs from current_plan_id.
  const isReserved =
    subscription?.plan === 'pro' &&
    !!subscription?.reserved_plan_id &&
    (isOptimisticReserved || (!!subscription?.current_plan_id && subscription.reserved_plan_id !== subscription.current_plan_id));

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
    cancelDowngrade,
    processing
  } = usePaypalPlans({
    returnUrl,
    cancelUrl,
    userId
  });

  // invoices
  const [invoices, setInvoices] = useState([]);
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const loadInvoices = async () => {
    if (!userId) return;
    setInvoiceLoading(true);
    setInvoiceError('');
    try {
      const res = await fetch('/api/invoices', {
        headers: jsonHeaders({ 'x-user-id': userId })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.detail || 'Failed to load invoices.');
      setInvoices(payload.data || []);
    } catch (e) {
      setInvoiceError(e.message || 'Failed to load invoices.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  // 한글 주석: 영어 플랜 설명과 기능을 로컬라이즈하여 차별점을 명확히 노출합니다.
  const localizedPlans = useMemo(() => {
    return plans.map((plan) => {
      if (plan.slug === 'basic') {
        return {
          ...plan,
          description: 'Automate up to 10 campaigns with core reporting and baseline quality. Register up to 20 sites.',
          features: [
            'Up to 10 active campaigns',
            'Register up to 20 sites',
            'Core automation & scheduling',
            'Standard content prompts + baseline image generation',
            'Email & in-app notifications'
          ]
        };
      }
      if (plan.slug === 'pro') {
        return {
          ...plan,
          description: 'Scale to 100 active campaigns with premium quality content and unlimited sites.',
          features: [
            'Up to 100 active campaigns',
            'Unlimited site registrations',
            'Advanced automation & scheduling',
            'Enhanced prompts + premium image generation quality',
            'Priority support & faster updates'
          ]
        };
      }
      return plan;
    });
  }, [plans]);

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
          if (active) {
            const merged = await fetchSubAndUserSub(userId);
            setSubscription(merged);
            scheduleRefresh();
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

  useEffect(() => {
    loadInvoices();
  }, [userId]);

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
                {isReserved && subscription?.reserved_next_billing_date && (
                  <p className="mt-1 text-xs text-blue-700">
                    Scheduled downgrade starts on: <span className="font-semibold">{subscription.reserved_next_billing_date}</span>
                  </p>
                )}
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
        {isReserved && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            Downgrade scheduled for next billing cycle
            {subscription?.reserved_next_billing_date ? ` (next billing: ${subscription.reserved_next_billing_date})` : ''}. You can cancel
            the scheduled downgrade below.
          </div>
        )}
        {paymentStatus && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">{paymentStatus}</div>
        )}
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
            : localizedPlans.map((plan) => (
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
                  {/* 다운그레이드/예약 상태 판단 */}
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
                    (() => {
                      return isReserved ? (
                        <TailwindButton
                          size="lg"
                          variant="secondary"
                          className="mt-auto"
                          onClick={async () => {
                            const prevSnapshot = subscription;
                            try {
                              const subId = subscription?.provider_subscription_id;
                              if (!subId) throw new Error('No provider subscription id');
                              setPlanError('');
                              setPaymentStatus('Cancelling scheduled downgrade...');
                              // 한글 주석: 낙관적 업데이트 - 즉시 "예약 취소" 상태를 해제하고 버튼/배너를 원복합니다.
                              setSubscription((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  reserved_plan_id: prev.current_plan_id || null,
                                  reserved_status: 'active'
                                };
                              });
                              await cancelDowngrade(subId);
                              const merged = await fetchSubAndUserSub(userId);
                              if (merged) setSubscription(merged);
                              setPaymentStatus('Downgrade cancellation requested. Syncing...');
                              scheduleRefresh();
                            } catch (e) {
                              if (prevSnapshot) setSubscription(prevSnapshot);
                              setPlanError(e.message || 'Cancel downgrade failed');
                              setPaymentStatus('');
                            }
                          }}
                          disabled={processing === 'cancel-downgrade'}
                        >
                          {processing === 'cancel-downgrade' ? 'Cancelling...' : 'Cancel scheduled downgrade'}
                        </TailwindButton>
                      ) : (
                        <TailwindButton
                          size="lg"
                          variant="secondary"
                          className="mt-auto"
                          onClick={async () => {
                            const prevSnapshot = subscription;
                            try {
                              const subId = subscription?.provider_subscription_id;
                              if (!subId) throw new Error('No provider subscription id');
                              setPlanError('');
                              setPaymentStatus('Downgrade will apply next cycle. (Syncing...)');
                              // 한글 주석: 낙관적 업데이트 - 즉시 "예약됨" 상태로 토글하여 UX를 개선합니다.
                              setSubscription((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  reserved_plan_id: `__optimistic__${plan.slug}__`,
                                  reserved_status: 'active'
                                };
                              });
                              await downgradeSubscription(subId, plan.slug);
                              const merged = await fetchSubAndUserSub(userId);
                              if (merged) setSubscription(merged);
                              scheduleRefresh();
                            } catch (e) {
                              if (prevSnapshot) setSubscription(prevSnapshot);
                              setPlanError(e.message || 'Downgrade failed');
                              setPaymentStatus('');
                            }
                          }}
                          disabled={processing === 'downgrade'}
                        >
                          {processing === 'downgrade' ? 'Processing...' : 'Downgrade next cycle'}
                        </TailwindButton>
                      );
                    })()
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
      <MainCard title="Invoices">
        {invoiceLoading ? (
          <p className="text-sm text-gray-600">Loading invoices...</p>
        ) : invoiceError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{invoiceError}</div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-gray-600">No invoices found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Invoice #</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-2 font-medium text-gray-900">{inv.invoice_number || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {inv.issued_at
                        ? formatToUserTimeZone(inv.issued_at, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZoneName: 'short',
                            locale: 'en-US'
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {inv.currency || 'USD'} {((inv.amount_cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          inv.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : inv.status === 'refunded'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {inv.pdf_url ? (
                        <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          Download
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MainCard>
    </div>
  );
}
