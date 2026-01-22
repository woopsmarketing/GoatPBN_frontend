'use client';

// v2.2 - 업그레이드 차액 결제 강제 (2026.01.22)
// 기능 요약: 업그레이드 시 차액 금액 로딩 전에는 결제를 막고 오류를 안내

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';

import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import { authAPI, supabase } from '@/lib/supabase';
import { formatToUserTimeZone } from '@/lib/utils/userTimeZone';
import { usePaypalPlans } from '@/hooks/usePaypalPlans';
import { jsonHeaders } from '@/lib/api/httpClient';

const PLAN_LABELS = {
  free: '무료 플랜',
  starter: '스타터',
  growth: '그로스',
  pro: '프로',
  enterprise: '엔터프라이즈',
  custom: '맞춤 플랜',
  basic: '베이직'
};

// 한글 주석: 토스 결제 기본값(서버 설정이 없을 때 사용)
const FALLBACK_TOSS_PLAN_CONFIG = {
  basic: {
    amount: 20000,
    orderName: 'GoatPBN Basic 1개월'
  },
  pro: {
    amount: 50000,
    orderName: 'GoatPBN Pro 1개월'
  }
};

const DEFAULT_TOSS_CLIENT_KEY = 'test_ck_kYG57Eba3G9KALol59k6rpWDOxmA';
// 한글 주석: 외부 결제 URL/모드 기본값(환경변수 없을 때 goatpbn.com 사용)
const DEFAULT_MAIN_PAYMENT_URL = 'https://goatpbn.com/pricing';
const PAYMENT_MODE = process.env.NEXT_PUBLIC_PAYMENT_MODE || 'external';
const MAIN_PAYMENT_URL = process.env.NEXT_PUBLIC_MAIN_PAYMENT_URL || DEFAULT_MAIN_PAYMENT_URL;

export default function SubscriptionPageKo() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [planError, setPlanError] = useState('');
  const [userId, setUserId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  // 한글 주석: 낙관적 업데이트 후 3~5초 뒤 재조회 타이머(중복 실행 방지)
  const refreshTimerRef = useRef(null);
  const [invoices, setInvoices] = useState([]);
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [tossPlanConfig, setTossPlanConfig] = useState(FALLBACK_TOSS_PLAN_CONFIG);
  const [upgradeQuote, setUpgradeQuote] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [downgradeLoading, setDowngradeLoading] = useState(false);
  const [billingStatus, setBillingStatus] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [tossSdkReady, setTossSdkReady] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [upgradeConfirmOpen, setUpgradeConfirmOpen] = useState(false);
  const [upgradeConfirmChecked, setUpgradeConfirmChecked] = useState(false);
  const [pendingUpgradePlan, setPendingUpgradePlan] = useState(null);
  // 한글 주석: 메인 도메인 결제 모드일 때 앱 내 결제 흐름을 비활성화합니다.
  const isExternalPayment = PAYMENT_MODE === 'external';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const returnUrl = `${origin}/ko/subscription?paypal_status=success`;
  const cancelUrl = `${origin}/ko/subscription?paypal_status=cancel`;
  // 한글 주석: 메인 도메인 결제 완료 후 돌아올 주소(WordPress 측 리다이렉트용)
  const externalReturnUrl = `${origin}/ko/subscription?payment_status=success`;
  const externalCancelUrl = `${origin}/ko/subscription?payment_status=cancel`;
  const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || DEFAULT_TOSS_CLIENT_KEY;

  // helper: subscriptions + user_subscriptions 병합 조회
  const fetchSubAndUserSub = async (uid) => {
    const { data, error: subError } = await supabase.from('subscriptions').select('*').eq('user_id', uid).maybeSingle();
    if (subError) throw subError;
    // 한글 주석: user_subscriptions는 과거 기록(취소/완료)이 누적되므로,
    // active/approval_pending 중 최신 1건만 안전하게 가져옵니다.
    const { data: userSubs, error: userSubError } = await supabase
      .from('user_subscriptions')
      .select('provider_subscription_id, plan_id, status, next_billing_date')
      .eq('user_id', uid)
      .in('status', ['active', 'approval_pending'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (userSubError) {
      console.warn('user_subscriptions 조회 실패:', userSubError.message);
    }

    const userSub = Array.isArray(userSubs) ? userSubs[0] : null;

    // 한글 주석: subscriptions.plan(slug) -> billing_plans.id(UUID)로 변환해서
    // user_subscriptions.plan_id(UUID)와 비교할 수 있게 만듭니다.
    let currentPlanId = null;
    if (data?.plan) {
      const { data: planRow, error: planError } = await supabase.from('billing_plans').select('id').eq('slug', data.plan).limit(1);
      if (planError) {
        console.warn('billing_plans 조회 실패:', planError.message);
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
        // 한글 주석: 최종 동기화가 끝나면 안내 문구는 자연스럽게 숨깁니다.
        setPaymentStatus('');
      } catch (err) {
        console.error('구독 상태 재조회 실패:', err);
      }
    }, delayMs);
  };

  // 한글 주석: 메인 도메인 결제 URL을 안전하게 구성합니다.
  const buildExternalPaymentUrl = (planSlug) => {
    try {
      if (!MAIN_PAYMENT_URL) return '';
      const url = new URL(MAIN_PAYMENT_URL);
      if (planSlug) url.searchParams.set('plan', String(planSlug));
      url.searchParams.set('source', 'app');
      if (origin) {
        url.searchParams.set('return_to', externalReturnUrl);
        url.searchParams.set('cancel_to', externalCancelUrl);
      }
      return url.toString();
    } catch (err) {
      console.error('외부 결제 URL 생성 실패:', err);
      return '';
    }
  };

  // 한글 주석: 메인 도메인 결제 페이지로 이동(팝업 차단 포함 예외 처리).
  const openExternalPayment = (planSlug) => {
    try {
      setPlanError('');
      const targetUrl = buildExternalPaymentUrl(planSlug);
      if (!targetUrl) {
        setPlanError('결제 페이지 URL을 확인할 수 없습니다. 관리자에게 문의해주세요.');
        return;
      }
      const nextWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!nextWindow) {
        setPlanError('팝업이 차단되었습니다. 브라우저에서 새 창 허용 후 다시 시도해주세요.');
      }
    } catch (err) {
      console.error('외부 결제 이동 실패:', err);
      setPlanError('외부 결제 페이지로 이동하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
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
          setError('로그인 정보를 찾을 수 없습니다.');
          return;
        }
        if (active) setUserId(user.id);
        if (active) setUserEmail(user.email || '');
        if (active) {
          const displayName =
            user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : '') || '사용자';
          setUserName(displayName);
        }
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

  useEffect(() => {
    loadInvoices();
  }, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!userId) return;
    const status = new URLSearchParams(window.location.search).get('payment_status') || '';
    if (!status) return;
    if (status === 'cancel') {
      setPaymentStatus('메인 도메인 결제가 취소되었습니다.');
      return;
    }
    if (status === 'fail') {
      setPlanError('메인 도메인 결제에 실패했습니다. 다시 시도해주세요.');
      return;
    }
    if (status === 'success') {
      setPaymentStatus('메인 도메인 결제가 완료되었습니다. 구독 정보를 동기화 중입니다...');
      scheduleRefresh(6000);
    }
  }, [userId]);

  const loadBillingStatus = async () => {
    if (!userId) return;
    setBillingLoading(true);
    setBillingError('');
    try {
      const res = await fetch('/api/payments/toss/billing/status', {
        headers: jsonHeaders({ 'x-user-id': userId })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.detail || payload.error || '빌링 상태 조회 실패');
      setBillingStatus(payload);
    } catch (err) {
      setBillingError(err?.message || '빌링 상태 조회 실패');
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    if (isExternalPayment) return;
    loadBillingStatus();
  }, [userId, isExternalPayment]);

  const paypalPlans = usePaypalPlans({ returnUrl, cancelUrl, userId });
  const plans = paypalPlans.plans;
  const plansLoading = paypalPlans.loading;
  const plansFetchError = paypalPlans.error;
  const confirmSubscription = paypalPlans.confirmSubscription;

  const loadInvoices = async () => {
    if (!userId) return;
    setInvoiceLoading(true);
    setInvoiceError('');
    try {
      const res = await fetch('/api/invoices', {
        headers: jsonHeaders({ 'x-user-id': userId })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.detail || '인보이스 조회에 실패했습니다.');
      setInvoices(payload.data || []);
    } catch (e) {
      setInvoiceError(e.message || '인보이스 조회에 실패했습니다.');
    } finally {
      setInvoiceLoading(false);
    }
  };

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
  // 한글 주석: 낙관적 업데이트 시 reserved_plan_id를 특수 문자열로 세팅해 즉시 토글되도록 합니다.
  const isOptimisticReserved =
    typeof subscription?.reserved_plan_id === 'string' && subscription.reserved_plan_id.startsWith('__optimistic__');
  // 한글 주석: 예약 여부 = (현재 플랜이 pro) AND (reserved_plan_id != current_plan_id)
  const isReserved =
    subscription?.plan === 'pro' &&
    !!subscription?.reserved_plan_id &&
    (isOptimisticReserved || (!!subscription?.current_plan_id && subscription.reserved_plan_id !== subscription.current_plan_id));

  const isUpgradeFlow = currentPlanSlug === 'basic';

  // 한글 주석: 결제 금액을 한국 원화 표시로 안전하게 포맷합니다.
  const formatAmountKRW = (amount) => {
    if (!Number.isFinite(amount)) return '—';
    return `${Number(amount).toLocaleString('ko-KR')}원`;
  };

  // 한글 주석: 업그레이드 즉시 결제 안내 모달을 띄웁니다.
  const openUpgradeConfirm = (planSlug) => {
    setPendingUpgradePlan(planSlug);
    setUpgradeConfirmChecked(false);
    setUpgradeConfirmOpen(true);
  };

  // 한글 주석: 모달에서 확인을 눌렀을 때 결제를 진행합니다.
  const confirmUpgradeCharge = async () => {
    if (!pendingUpgradePlan) return;
    setUpgradeConfirmOpen(false);
    await handleStartBilling(pendingUpgradePlan, { skipConfirm: true });
  };

  // 한글 주석: 화면에 표시할 토스 금액을 계산합니다.
  const getPlanDisplayAmount = (plan) => {
    if (['basic', 'pro'].includes(plan.slug)) return tossPlanConfig?.[plan.slug]?.amount;
    return plan.price;
  };

  // 플랜별 기능/설명 로컬라이즈 (Basic vs Pro 차별화)
  const localizedPlans = useMemo(() => {
    return plans.map((plan) => {
      if (plan.slug === 'basic') {
        return {
          ...plan,
          description: '최대 10개 캠페인을 자동화하고 20개 사이트까지 등록 가능합니다. 핵심 리포트와 기본 품질 콘텐츠/이미지를 제공합니다.',
          features: [
            '최대 10개 활성 캠페인',
            '사이트 등록 20개까지',
            '기본 자동화 & 스케줄링',
            '표준 프롬프트 + 기본 이미지 품질',
            '이메일/인앱 알림'
          ]
        };
      }
      if (plan.slug === 'pro') {
        return {
          ...plan,
          description: '최대 100개 캠페인, 사이트 무제한. 고품질 프롬프트/이미지, 고급 자동화와 우선 지원을 제공합니다.',
          features: [
            '최대 100개 활성 캠페인',
            '사이트 등록 무제한',
            '고급 자동화 & 스케줄링',
            '고도화 프롬프트 + 프리미엄 이미지 생성',
            '우선 지원 & 빠른 동기화'
          ]
        };
      }
      return plan;
    });
  }, [plans]);

  // 한글 주석: 외부 결제 모드에서 버튼 라벨을 일관되게 결정합니다.
  const getExternalActionLabel = (planSlug) => {
    if (currentPlanSlug === 'pro' && planSlug === 'basic') return '메인 사이트에서 다운그레이드';
    if (currentPlanSlug === 'basic' && planSlug === 'pro') return '메인 사이트에서 업그레이드';
    return '메인 사이트에서 결제';
  };

  // 한글 주석: 플랜별 CTA 버튼 렌더링을 함수로 분리해 가독성을 높입니다.
  const renderPlanActionButton = (plan) => {
    if (plan.slug === currentPlanSlug) {
      return (
        <TailwindButton size="lg" variant="secondary" className="mt-auto" disabled>
          현재 플랜
        </TailwindButton>
      );
    }

    const isPaidPlan = ['basic', 'pro'].includes(plan.slug);

    if (isExternalPayment) {
      if (!isPaidPlan) {
        return (
          <TailwindButton size="lg" variant="secondary" className="mt-auto" disabled>
            준비 중
          </TailwindButton>
        );
      }
      return (
        <TailwindButton size="lg" variant="primary" className="mt-auto" onClick={() => openExternalPayment(plan.slug)}>
          {getExternalActionLabel(plan.slug)}
        </TailwindButton>
      );
    }

    if (currentPlanSlug === 'pro' && plan.slug === 'basic') {
      return isReserved ? (
        <TailwindButton size="lg" variant="secondary" className="mt-auto" onClick={handleCancelDowngrade} disabled={downgradeLoading}>
          {downgradeLoading ? '취소 중...' : '다운그레이드 예약 취소'}
        </TailwindButton>
      ) : (
        <TailwindButton size="lg" variant="secondary" className="mt-auto" onClick={handleScheduleDowngrade} disabled={downgradeLoading}>
          {downgradeLoading ? '예약 중...' : '다음 달부터 다운그레이드'}
        </TailwindButton>
      );
    }

    if (isPaidPlan) {
      return (
        <>
          <TailwindButton
            size="lg"
            variant="primary"
            className="mt-auto"
            onClick={() => handleStartBilling(plan.slug)}
            disabled={
              !tossPlanConfig?.[plan.slug]?.amount ||
              billingLoading ||
              (plan.slug === 'pro' && isUpgradeFlow && (upgradeLoading || !upgradeQuote?.amount))
            }
          >
            {plan.slug === 'pro' && isUpgradeFlow
              ? `${upgradeQuote?.amount?.toLocaleString() ?? '차액'}원 PRO 업그레이드`
              : billingStatus?.has_billing_key
                ? '정기결제 시작하기'
                : '카드 등록 후 정기결제'}
          </TailwindButton>
          {plan.slug === 'pro' && isUpgradeFlow && (
            <p className="mt-2 text-xs text-gray-500">업그레이드 시 차액이 즉시 결제되며, 잔여 일수 기준으로 계산됩니다.</p>
          )}
        </>
      );
    }

    return (
      <TailwindButton size="lg" variant="secondary" className="mt-auto" disabled>
        준비 중
      </TailwindButton>
    );
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
          const merged = await fetchSubAndUserSub(userId);
          if (active) setSubscription(merged);
          // 한글 주석: 웹훅 반영이 지연될 수 있으므로 3~5초 뒤 한 번 더 상태 확인을 예약합니다.
          scheduleRefresh();
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

  // 한글 주석: 토스 결제 설정을 Supabase에서 우선 조회(없으면 기본값 사용)
  useEffect(() => {
    let active = true;
    const loadTossPlanConfig = async () => {
      try {
        const { data, error } = await supabase.from('billing_plans').select('*').in('slug', ['basic', 'pro']);
        if (error) throw error;
        const nextConfig = { ...FALLBACK_TOSS_PLAN_CONFIG };
        (data || []).forEach((row) => {
          const slug = row?.slug;
          if (!slug || !nextConfig[slug]) return;
          const metadata = row?.metadata || {};
          const amountFromMeta = Number(metadata?.toss_amount_krw) || Number(metadata?.toss_price_krw) || Number(metadata?.toss_amount);
          if (Number.isFinite(amountFromMeta) && amountFromMeta > 0) {
            nextConfig[slug].amount = amountFromMeta;
          }
          const orderNameFromMeta = metadata?.toss_order_name_ko || metadata?.toss_order_name;
          if (orderNameFromMeta) {
            nextConfig[slug].orderName = orderNameFromMeta;
          }
        });
        if (active) setTossPlanConfig(nextConfig);
      } catch (err) {
        console.warn('토스 결제 설정 조회 실패:', err?.message || err);
        if (active) setTossPlanConfig(FALLBACK_TOSS_PLAN_CONFIG);
      }
    };
    loadTossPlanConfig();
    return () => {
      active = false;
    };
  }, []);

  // 한글 주석: 업그레이드 차액(일할 계산) 금액 조회
  useEffect(() => {
    if (!userId || !isUpgradeFlow) {
      setUpgradeQuote(null);
      return;
    }
    let active = true;
    const fetchUpgradeQuote = async () => {
      setUpgradeLoading(true);
      setUpgradeError('');
      try {
        const resp = await fetch('/api/payments/toss/upgrade-quote', {
          method: 'POST',
          headers: jsonHeaders({ 'x-user-id': userId }),
          body: JSON.stringify({ target_plan_slug: 'pro' })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data?.detail || data?.error || '업그레이드 금액 조회 실패');
        }
        if (active) setUpgradeQuote(data);
      } catch (err) {
        if (active) setUpgradeError(err?.message || '업그레이드 금액 조회 실패');
      } finally {
        if (active) setUpgradeLoading(false);
      }
    };
    fetchUpgradeQuote();
    return () => {
      active = false;
    };
  }, [userId, isUpgradeFlow]);

  const handleStartBilling = async (planSlug, options = {}) => {
    if (!userId) return;
    setPlanError('');
    setBillingError('');
    setPaymentStatus('');
    // 한글 주석: 외부 결제 모드에서는 메인 도메인으로 이동합니다.
    if (isExternalPayment) {
      openExternalPayment(planSlug);
      return;
    }

    const planAmount = planSlug === 'pro' && isUpgradeFlow ? upgradeQuote?.amount : tossPlanConfig?.[planSlug]?.amount;

    // 한글 주석: 업그레이드 차액이 아직 로딩되지 않았으면 결제를 막습니다.
    if (planSlug === 'pro' && isUpgradeFlow && !upgradeQuote?.amount) {
      setPlanError('업그레이드 차액을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (!planAmount) {
      setPlanError('결제 금액을 확인할 수 없습니다.');
      return;
    }

    // 한글 주석: 이미 빌링키가 있으면 즉시 결제(업그레이드 포함)
    if (billingStatus?.has_billing_key) {
      if (planSlug === 'pro' && isUpgradeFlow && !options.skipConfirm) {
        openUpgradeConfirm(planSlug);
        return;
      }
      setPaymentStatus('정기결제를 진행하는 중입니다...');
      try {
        const resp = await fetch('/api/payments/toss/billing/charge', {
          method: 'POST',
          headers: jsonHeaders({ 'x-user-id': userId }),
          body: JSON.stringify({
            plan_slug: planSlug,
            amount: planAmount,
            order_name:
              planSlug === 'pro' && isUpgradeFlow
                ? 'GoatPBN Pro 업그레이드'
                : tossPlanConfig?.[planSlug]?.orderName || `GoatPBN ${planSlug} 1개월`,
            customer_email: userEmail || undefined,
            customer_name: userName || undefined
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data?.detail || data?.error || '정기결제 승인 실패');
        }
        setPaymentStatus('정기결제가 완료되었습니다.');
        await loadBillingStatus();
        const merged = await fetchSubAndUserSub(userId);
        setSubscription(merged);
        scheduleRefresh();
        return;
      } catch (err) {
        setPlanError(err?.message || '정기결제 승인 실패');
        setPaymentStatus('');
        return;
      }
    }

    // 한글 주석: 빌링키가 없으면 카드 등록(빌링 인증)부터 진행
    if (!tossSdkReady || typeof window === 'undefined' || !window.TossPayments) {
      setBillingError('토스 결제 SDK가 아직 준비되지 않았습니다.');
      return;
    }

    try {
      const tossPayments = window.TossPayments(tossClientKey);
      const payment = tossPayments.payment({ customerKey: userId });
      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${origin}/ko/subscription/billing/success?plan=${planSlug}&amount=${planAmount}`,
        failUrl: `${origin}/ko/subscription/billing/fail?plan=${planSlug}`,
        customerEmail: userEmail || undefined,
        customerName: userName || undefined
      });
    } catch (err) {
      console.error('토스 빌링 등록 실패:', err);
      setBillingError(err?.message || '카드 등록에 실패했습니다.');
    }
  };

  const handleScheduleDowngrade = async () => {
    if (!userId) return;
    setPlanError('');
    setPaymentStatus('다운그레이드를 예약하는 중입니다...');
    setDowngradeLoading(true);
    try {
      const resp = await fetch('/api/payments/toss/downgrade', {
        method: 'POST',
        headers: jsonHeaders({ 'x-user-id': userId }),
        body: JSON.stringify({ target_plan_slug: 'basic' })
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.detail || data?.error || '다운그레이드 예약 실패');
      }
      const merged = await fetchSubAndUserSub(userId);
      if (merged) setSubscription(merged);
      setPaymentStatus('다음 결제 주기에 다운그레이드가 예약되었습니다.');
      scheduleRefresh();
    } catch (err) {
      setPlanError(err?.message || '다운그레이드 예약 실패');
      setPaymentStatus('');
    } finally {
      setDowngradeLoading(false);
    }
  };

  const handleCancelDowngrade = async () => {
    if (!userId) return;
    setPlanError('');
    setPaymentStatus('다운그레이드 예약을 취소하는 중입니다...');
    setDowngradeLoading(true);
    try {
      const resp = await fetch('/api/payments/toss/cancel-downgrade', {
        method: 'POST',
        headers: jsonHeaders({ 'x-user-id': userId })
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.detail || data?.error || '다운그레이드 취소 실패');
      }
      const merged = await fetchSubAndUserSub(userId);
      if (merged) setSubscription(merged);
      setPaymentStatus('다운그레이드 예약이 취소되었습니다.');
      scheduleRefresh();
    } catch (err) {
      setPlanError(err?.message || '다운그레이드 취소 실패');
      setPaymentStatus('');
    } finally {
      setDowngradeLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isExternalPayment && (
        <Script
          src="https://js.tosspayments.com/v2/standard"
          strategy="afterInteractive"
          onLoad={() => setTossSdkReady(true)}
          onError={() => setBillingError('토스 SDK 로딩에 실패했습니다.')}
        />
      )}
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
                {isReserved && subscription?.reserved_next_billing_date && (
                  <p className="mt-1 text-xs text-blue-700">
                    다음 청구일에 다운그레이드 예정: <span className="font-semibold">{subscription.reserved_next_billing_date}</span>
                  </p>
                )}
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
        {isReserved && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            다운그레이드가 다음 청구 주기에 예약되었습니다
            {subscription?.reserved_next_billing_date ? ` (다음 청구일: ${subscription.reserved_next_billing_date})` : ''}. 아래에서 예약을
            취소할 수 있습니다.
          </div>
        )}
        {isExternalPayment && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            결제는 메인 도메인(goatpbn.com)에서 진행됩니다. 아래 버튼을 눌러 결제를 진행해주세요.
            <div className="mt-3">
              <TailwindButton size="lg" variant="primary" onClick={() => openExternalPayment('basic')}>
                메인 사이트에서 결제하기
              </TailwindButton>
            </div>
          </div>
        )}
        {/* 한글 주석: 요청에 따라 PG 안내 문구 제거 */}
        {paymentStatus && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">{paymentStatus}</div>
        )}
        {billingError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{billingError}</div>}
        {plansFetchError && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">{plansFetchError}</div>
        )}
        {upgradeError && <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">{upgradeError}</div>}
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
                      {['basic', 'pro'].includes(plan.slug) ? 'KRW' : plan.currency} {getPlanDisplayAmount(plan)?.toLocaleString() ?? 'TBD'}
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
                  {renderPlanActionButton(plan)}
                </div>
              ))}
          {!plansLoading && plans.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">등록된 PayPal 플랜이 없습니다.</div>
          )}
        </div>
      </MainCard>
      {upgradeConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">업그레이드 결제 확인</h3>
            <p className="mt-2 text-sm text-gray-600">등록된 카드로 즉시 차액이 결제됩니다. 아래 내용을 확인해주세요.</p>
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p>
                플랜: <span className="font-semibold">프로</span>
              </p>
              <p>
                결제 금액: <span className="font-semibold">{formatAmountKRW(upgradeQuote?.amount)}</span>
              </p>
              <p>
                남은 기간: <span className="font-semibold">{Number.isFinite(daysRemaining) ? `${daysRemaining}일` : '확인 중'}</span>
              </p>
              <p className="mt-2 text-xs text-gray-500">잔여 기간 기준으로 차액이 계산되며, 결제 즉시 프로 플랜이 적용됩니다.</p>
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300"
                checked={upgradeConfirmChecked}
                onChange={(e) => setUpgradeConfirmChecked(e.target.checked)}
              />
              <span>업그레이드 시 즉시 결제됨을 확인했습니다.</span>
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => setUpgradeConfirmOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={confirmUpgradeCharge}
                disabled={!upgradeConfirmChecked || upgradeLoading}
              >
                {upgradeLoading ? '처리 중...' : '결제 진행'}
              </button>
            </div>
          </div>
        </div>
      )}
      <MainCard title="인보이스">
        {invoiceLoading ? (
          <p className="text-sm text-gray-600">인보이스를 불러오는 중입니다...</p>
        ) : invoiceError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{invoiceError}</div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-gray-600">인보이스가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">인보이스 번호</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">발행일</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">금액</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">상태</th>
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
                            locale: 'ko-KR'
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
