'use client';

// v1.1 - 구독 관리 페이지 (한국어)
// 기능 요약: Supabase subscriptions 테이블과 연동하여 현재 플랜/크레딧을 표시하고 PayPal 결제 연동

import { useEffect, useMemo, useState } from 'react';

import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import { authAPI, supabase } from '@/lib/supabase';
import { formatToUserTimeZone } from '@/lib/utils/userTimeZone';
import { usePaypalPlans } from '@/hooks/usePaypalPlans';

const PLAN_LABELS = {
  free: '무료 플랜',
  starter: '스타터',
  growth: '그로스',
  pro: '프로',
  enterprise: '엔터프라이즈',
  custom: '맞춤 플랜',
  basic: '베이직'
};

export default function SubscriptionPageKo() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [planError, setPlanError] = useState('');
  const [userId, setUserId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const returnUrl = `${origin}/ko/subscription?paypal_status=success`;
  const cancelUrl = `${origin}/ko/subscription?paypal_status=cancel`;

  useEffect(() => {
    let active = true;
    const fetchSubAndUserSub = async (uid) => {
      const { data, error: subError } = await supabase.from('subscriptions').select('*').eq('user_id', uid).maybeSingle();
      if (subError) throw subError;
      const { data: userSub, error: userSubError } = await supabase
        .from('user_subscriptions')
        .select('provider_subscription_id, plan_id, status')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .maybeSingle();
      if (userSubError) {
        console.warn('user_subscriptions 조회 실패:', userSubError.message);
      }
      return {
        ...(data || {}),
        provider_subscription_id: userSub?.provider_subscription_id || data?.provider_subscription_id,
        reserved_plan_id: userSub?.plan_id || null,
        reserved_status: userSub?.status || null
      };
    };

    const loadSubscription = async () => {
      try {
        const { data: authData, error: authError } = await authAPI.getCurrentUser();
        if (authError) throw authError;
        const user = authData?.user;
        if (!user) {
          setError('로그인 정보를 찾을 수 없습니다.');
          return;
        }
        if (active) setUserId(user.id);
        const merged = await fetchSubAndUserSub(user.id);
        if (active) setSubscription(merged);
      } catch (err) {
        console.error('구독 정보 로드 실패:', err);
        if (active) setError('구독 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadSubscription();
    return () => {
      active = false;
    };
  }, []);

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
  } = usePaypalPlans({ returnUrl, cancelUrl, userId });

  const planLabel = useMemo(() => {
    if (!subscription?.plan) return '플랜 없음';
    return PLAN_LABELS[subscription.plan] || subscription.plan;
  }, [subscription]);

  const expiryLabel = useMemo(() => {
    if (!subscription?.expiry_date) return '무제한';
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

  const handleSubscribe = async (planSlug) => {
    setPlanError('');
    try {
      await subscribeToPlan(planSlug);
    } catch (err) {
      console.error(err);
      setPlanError(err?.message || 'PayPal 결제를 시작할 수 없습니다.');
    }
  };

  useEffect(() => {
    const paypalStatus = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('paypal_status') || '' : '';
    const subscriptionId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('subscription_id') || '' : '';
    if (!paypalStatus) return;
    if (paypalStatus === 'cancel') {
      setPaymentStatus('결제가 취소되었습니다.');
      return;
    }
    if (paypalStatus === 'success' && subscriptionId && userId) {
      let active = true;
      (async () => {
        try {
          setPaymentStatus('PayPal 구독을 확인 중입니다...');
          const result = await confirmSubscription(subscriptionId);
          if (active) setPaymentStatus(`구독 확인: ${result.status || 'OK'}`);
          const { data, error: subError } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
          if (!subError && active) {
            const { data: userSub } = await supabase
              .from('user_subscriptions')
              .select('provider_subscription_id, plan_id, status')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .maybeSingle();
            const merged = {
              ...(data || {}),
              provider_subscription_id: userSub?.provider_subscription_id || data?.provider_subscription_id,
              reserved_plan_id: userSub?.plan_id || null,
              reserved_status: userSub?.status || null
            };
            setSubscription(merged);
          }
        } catch (err) {
          console.error(err);
          if (active) {
            setPaymentStatus('');
            setPlanError(err?.message || 'PayPal 구독 확인에 실패했습니다.');
          }
        }
      })();
      return () => {
        active = false;
      };
    }
  }, [userId, confirmSubscription]);

  return (
    <div className="space-y-6">
      <MainCard title="구독 요약">
        {loading ? (
          <p className="text-sm text-gray-600">구독 정보를 불러오는 중입니다...</p>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : subscription ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">{planLabel}</h3>
              <p className="text-sm text-gray-600">
                {subscription.description || '플랜 설명이 아직 준비되지 않았습니다. 지원팀을 통해 맞춤 구성을 요청하실 수 있습니다.'}
              </p>
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <p>
                  상태: <span className="font-medium text-gray-900">{subscription.status}</span>
                </p>
                <p className="mt-2">
                  갱신/만료일: <span className="font-medium text-gray-900">{expiryLabel}</span>
                </p>
                {daysRemaining !== null && (
                  <p className="mt-1 text-xs text-gray-500">
                    남은 일수: <span className="font-semibold text-gray-700">{daysRemaining}일</span>
                  </p>
                )}
              </div>
              <TailwindButton size="lg" variant="secondary" onClick={() => window.open('https://totoggong.com/contact', '_blank')}>
                플랜 변경 문의
              </TailwindButton>
            </div>
            <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-3">
              <div className="space-y-1 rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">전체 크레딧</p>
                <p className="text-2xl font-bold text-blue-600">{credits.total.toLocaleString()}</p>
              </div>
              <div className="space-y-1 rounded-lg bg-purple-50 p-4 text-center">
                <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">사용한 크레딧</p>
                <p className="text-2xl font-bold text-purple-600">{credits.used.toLocaleString()}</p>
              </div>
              <div className="space-y-1 rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">남은 크레딧</p>
                <p className={`text-2xl font-bold ${credits.remaining <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {credits.remaining.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
            <p className="font-medium text-gray-900">아직 구독 정보가 없습니다.</p>
            <p className="mt-2">무료 플랜으로 시작하는 중이며, 크레딧이 부족하면 언제든지 업그레이드할 수 있습니다.</p>
            <TailwindButton className="mt-4" onClick={() => window.open('https://totoggong.com/contact', '_blank')}>
              상담 예약하기
            </TailwindButton>
          </div>
        )}
      </MainCard>
      <MainCard title="플랜 안내">
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          PayPal 승인이 끝난 뒤 실제 플랜/크레딧 반영까지 최대 1분 정도 걸릴 수 있습니다. 잠시 기다리거나 새로고침해 주세요.
        </div>
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
                      현재 플랜
                    </TailwindButton>
                  ) : currentPlanSlug && currentPlanSlug !== 'free' && plan.slug === 'pro' ? (
                    <TailwindButton
                      size="lg"
                      variant="primary"
                      className="mt-auto"
                      onClick={async () => {
                        try {
                          const subId = subscription?.provider_subscription_id;
                          if (!subId) throw new Error('구독 ID를 찾을 수 없습니다');
                          setPlanError('');
                          setPaymentStatus('PayPal에서 업그레이드(일할) 진행 중...');
                          await upgradeSubscription(subId, plan.slug);
                          setPaymentStatus('업그레이드 요청 완료. PayPal이 차액을 자동 정산합니다.');
                          const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
                          if (data) setSubscription(data);
                        } catch (e) {
                          setPlanError(e.message || '업그레이드 실패');
                          setPaymentStatus('');
                        }
                      }}
                      disabled={processing === 'upgrade'}
                    >
                      {processing === 'upgrade' ? '업그레이드 중...' : '업그레이드 (일할청구)'}
                    </TailwindButton>
                  ) : currentPlanSlug && currentPlanSlug === 'pro' && plan.slug === 'basic' ? (
                    (() => {
                      const isReserved =
                        subscription?.reserved_plan_id && subscription?.plan === 'pro' && subscription?.reserved_plan_id !== null;
                      return isReserved ? (
                        <TailwindButton
                          size="lg"
                          variant="secondary"
                          className="mt-auto"
                          onClick={async () => {
                            try {
                              const subId = subscription?.provider_subscription_id;
                              if (!subId) throw new Error('구독 ID를 찾을 수 없습니다');
                              setPlanError('');
                              setPaymentStatus('다운그레이드 예약을 취소하는 중입니다...');
                              await cancelDowngrade(subId);
                              const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
                              const { data: userSub } = await supabase
                                .from('user_subscriptions')
                                .select('provider_subscription_id, plan_id, status')
                                .eq('user_id', userId)
                                .order('created_at', { ascending: false })
                                .maybeSingle();
                              const merged = {
                                ...(data || {}),
                                provider_subscription_id: userSub?.provider_subscription_id || data?.provider_subscription_id,
                                reserved_plan_id: userSub?.plan_id || null,
                                reserved_status: userSub?.status || null
                              };
                              if (merged) setSubscription(merged);
                              setPaymentStatus('다운그레이드 예약이 취소되었습니다.');
                            } catch (e) {
                              setPlanError(e.message || '다운그레이드 취소 실패');
                              setPaymentStatus('');
                            }
                          }}
                          disabled={processing === 'cancel-downgrade'}
                        >
                          {processing === 'cancel-downgrade' ? '취소 중...' : '다운그레이드 예약 취소'}
                        </TailwindButton>
                      ) : (
                        <TailwindButton
                          size="lg"
                          variant="secondary"
                          className="mt-auto"
                          onClick={async () => {
                            try {
                              const subId = subscription?.provider_subscription_id;
                              if (!subId) throw new Error('구독 ID를 찾을 수 없습니다');
                              setPlanError('');
                              setPaymentStatus('다운그레이드는 다음 청구일부터 적용됩니다.');
                              await downgradeSubscription(subId, plan.slug);
                              const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
                              const { data: userSub } = await supabase
                                .from('user_subscriptions')
                                .select('provider_subscription_id, plan_id, status')
                                .eq('user_id', userId)
                                .order('created_at', { ascending: false })
                                .maybeSingle();
                              const merged = {
                                ...(data || {}),
                                provider_subscription_id: userSub?.provider_subscription_id || data?.provider_subscription_id,
                                reserved_plan_id: userSub?.plan_id || null,
                                reserved_status: userSub?.status || null
                              };
                              if (merged) setSubscription(merged);
                            } catch (e) {
                              setPlanError(e.message || '다운그레이드 실패');
                              setPaymentStatus('');
                            }
                          }}
                          disabled={processing === 'downgrade'}
                        >
                          {processing === 'downgrade' ? '처리 중...' : '다음 달부터 다운그레이드'}
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
                      {subscribing === plan.slug ? 'PayPal로 이동 중...' : 'PayPal로 구독하기'}
                    </TailwindButton>
                  )}
                </div>
              ))}
          {!plansLoading && plans.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">등록된 PayPal 플랜이 없습니다.</div>
          )}
        </div>
      </MainCard>
    </div>
  );
}
