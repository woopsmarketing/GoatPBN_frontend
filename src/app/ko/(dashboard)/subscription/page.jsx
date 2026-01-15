'use client';

// v1.6 - 토스 업그레이드/다운그레이드 연동 (2026.01.15)
// 기능 요약: Supabase 구독 상태 표시 + 인보이스 목록, 한국어 페이지는 토스페이먼츠 결제 버튼 사용 (PayPal CTA 숨김)

import { useEffect, useMemo, useRef, useState } from 'react';

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

const DEFAULT_TOSS_API_BASE = 'https://jjqugwegnpbwsxgclywg.supabase.co/functions/v1';
const DEFAULT_TOSS_TENANT_KEY = 'tenant_key_goatpbn_ko';
const DEFAULT_TOSS_CLIENT_KEY = 'test_ck_kYG57Eba3G9KALol59k6rpWDOxmA';

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
  const [tossScriptError, setTossScriptError] = useState('');
  const [tossPlanConfig, setTossPlanConfig] = useState(FALLBACK_TOSS_PLAN_CONFIG);
  const [tossConfigReady, setTossConfigReady] = useState(false);
  const [upgradeQuote, setUpgradeQuote] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [downgradeLoading, setDowngradeLoading] = useState(false);
  // 한글 주석: 토스페이먼츠 스니펫 중복 삽입을 막기 위한 플래그
  const tossScriptLoadedRef = useRef(false);
  // 한글 주석: 토스 결제 버튼 초기화 중복 방지
  const tossInitRef = useRef({ basic: false, pro: false });
  // 한글 주석: 토스 결제 버튼 렌더 타이밍 지연 대응을 위한 재시도 카운터
  const tossRetryRef = useRef({ basic: 0, pro: 0 });
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const returnUrl = `${origin}/ko/subscription?paypal_status=success`;
  const cancelUrl = `${origin}/ko/subscription?paypal_status=cancel`;
  const tossApiBase = process.env.NEXT_PUBLIC_TOSS_API_BASE || DEFAULT_TOSS_API_BASE;
  const tossTenantKey = process.env.NEXT_PUBLIC_TOSS_TENANT_KEY || DEFAULT_TOSS_TENANT_KEY;
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

  // 한글 주석: 화면에 표시할 토스 금액을 계산합니다.
  const getPlanDisplayAmount = (plan) => {
    if (plan.slug === 'pro' && isUpgradeFlow && upgradeQuote?.amount) return upgradeQuote.amount;
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
      } finally {
        if (active) setTossConfigReady(true);
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

  // 한글 주석: 업그레이드 차액이 준비되면 Pro 버튼을 재초기화합니다.
  useEffect(() => {
    if (!isUpgradeFlow) return;
    if (upgradeLoading) return;
    if (!upgradeQuote?.amount) return;
    // 한글 주석: 기존 Pro 버튼 초기화를 해제하고 차액 금액으로 다시 설정합니다.
    tossInitRef.current.pro = false;
    tossRetryRef.current.pro = 0;
    initTossButtons();
  }, [isUpgradeFlow, upgradeLoading, upgradeQuote]);

  // 한글 주석: 토스 결제 버튼을 실제로 초기화합니다.
  const initTossButtons = () => {
    if (typeof window === 'undefined') return;
    if (!window.TossPaymentWindow?.init) return;
    if (plansLoading) return;
    const baseConfig = {
      apiBase: tossApiBase,
      tenantKey: tossTenantKey,
      clientKey: tossClientKey,
      method: 'CARD'
    };
    ['basic', 'pro'].forEach((slug) => {
      if (tossInitRef.current[slug]) return;
      const plan = tossPlanConfig?.[slug];
      if (!plan?.amount) return;
      if (slug === 'pro' && isUpgradeFlow && upgradeLoading) return;
      const upgradeAmount = isUpgradeFlow && slug === 'pro' ? upgradeQuote?.amount : null;
      const upgradeOrderName = isUpgradeFlow && slug === 'pro' ? upgradeQuote?.order_name : null;
      const buttonSelector = `#toss-pay-${slug}`;
      const buttonElement = document.querySelector(buttonSelector);
      if (!buttonElement) {
        // 한글 주석: 버튼 DOM이 아직 없으면 잠시 후 재시도합니다.
        if (tossRetryRef.current[slug] < 5) {
          tossRetryRef.current[slug] += 1;
          setTimeout(initTossButtons, 300);
        }
        return;
      }
      const config = {
        ...baseConfig,
        amount: upgradeAmount || plan.amount,
        orderName: upgradeOrderName || plan.orderName,
        payButtonSelector: buttonSelector,
        customerKey: userId || undefined,
        metadata: {
          planSlug: slug,
          userId: userId || null,
          locale: 'ko',
          upgradeFrom: isUpgradeFlow && slug === 'pro' ? 'basic' : null,
          upgradeProrated: Boolean(upgradeAmount)
        }
      };
      try {
        window.TossPaymentWindow.init(config);
        tossInitRef.current[slug] = true;
      } catch (err) {
        console.error('토스 결제 버튼 초기화 실패:', err);
        setTossScriptError('토스 결제 버튼 초기화에 실패했습니다. 콘솔 로그를 확인해주세요.');
      }
    });
  };

  // 한글 주석: 토스페이먼츠 결제 스니펫을 클라이언트에서만 로드합니다.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!tossConfigReady) return;
    if (plansLoading) return;
    if (tossScriptLoadedRef.current) {
      initTossButtons();
      return;
    }
    const script = document.createElement('script');
    // 한글 주석: public/에 배포된 정적 스니펫을 현재 도메인 기준으로 로드합니다.
    script.src = `${origin}/toss-billing-snippet-payment-window.js`;
    script.onload = () => {
      tossScriptLoadedRef.current = true;
      initTossButtons();
    };
    script.onerror = () => {
      // 한글 주석: 스니펫 로딩 실패 시 안내 메시지를 노출합니다.
      setTossScriptError('토스 결제 스니펫 로딩에 실패했습니다. 파일 경로/배포 상태를 확인해주세요.');
    };
    document.body.appendChild(script);
    return () => {
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      tossScriptLoadedRef.current = false;
    };
  }, [
    origin,
    tossPlanConfig,
    userId,
    tossApiBase,
    tossTenantKey,
    tossClientKey,
    tossConfigReady,
    plansLoading,
    isUpgradeFlow,
    upgradeQuote,
    upgradeLoading
  ]);

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
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          한국어 페이지는 토스페이먼츠 결제만 지원합니다. (PayPal 결제는 영문 페이지 이용)
        </div>
        {tossScriptError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{tossScriptError}</div>
        )}
        {paymentStatus && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">{paymentStatus}</div>
        )}
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
                  {plan.slug === currentPlanSlug ? (
                    <TailwindButton size="lg" variant="secondary" className="mt-auto" disabled>
                      현재 플랜
                    </TailwindButton>
                  ) : currentPlanSlug === 'pro' && plan.slug === 'basic' ? (
                    isReserved ? (
                      <TailwindButton
                        size="lg"
                        variant="secondary"
                        className="mt-auto"
                        onClick={handleCancelDowngrade}
                        disabled={downgradeLoading}
                      >
                        {downgradeLoading ? '취소 중...' : '다운그레이드 예약 취소'}
                      </TailwindButton>
                    ) : (
                      <TailwindButton
                        size="lg"
                        variant="secondary"
                        className="mt-auto"
                        onClick={handleScheduleDowngrade}
                        disabled={downgradeLoading}
                      >
                        {downgradeLoading ? '예약 중...' : '다음 달부터 다운그레이드'}
                      </TailwindButton>
                    )
                  ) : ['basic', 'pro'].includes(plan.slug) ? (
                    <TailwindButton
                      id={`toss-pay-${plan.slug}`}
                      size="lg"
                      variant="primary"
                      className="mt-auto"
                      disabled={
                        !!tossScriptError ||
                        !tossPlanConfig?.[plan.slug]?.amount ||
                        (plan.slug === 'pro' && isUpgradeFlow && upgradeLoading)
                      }
                    >
                      간편결제하기
                    </TailwindButton>
                  ) : (
                    <TailwindButton size="lg" variant="secondary" className="mt-auto" disabled>
                      준비 중
                    </TailwindButton>
                  )}
                </div>
              ))}
          {!plansLoading && plans.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">등록된 PayPal 플랜이 없습니다.</div>
          )}
        </div>
      </MainCard>
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
