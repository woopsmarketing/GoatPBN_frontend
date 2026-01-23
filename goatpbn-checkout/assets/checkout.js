// v1.7 - locale 감지 개선 및 무료 플랜 자동 쿠폰 이동 (2026.01.23)
// 기능 요약: 플랜 상태별 안내 팝업 추가 및 결제 진입 흐름 개선
// 사용 예시: <script type="module" src="/assets/checkout.js"></script>

import {
  resolveConfig,
  validateConfig,
  createSupabaseClient,
  getSessionFromAnyStorage,
  ensureTossPayments,
  resolvePlanConfig,
  getDataAttr,
  parseQuery,
  renderMessage,
  fallbackString,
  buildSsoUrl,
  resolveLocale
} from './utils.js?v=13';

// 한글 주석: 외부 의존성 주입으로 테스트 가능하게 구성합니다.
const createCheckoutController = (userConfig = {}, deps = {}) => {
  const config = resolveConfig(userConfig);
  const { ok, missing } = validateConfig(config);
  let supabaseClient = null;
  let cachedPlanSlug = '';
  let cachedPlanFetchedAt = 0;
  const PLAN_CACHE_TTL_MS = 30000;

  // 한글 주석: 플랜 슬러그를 소문자로 정규화합니다.
  const normalizePlanSlug = (planSlug) =>
    String(planSlug || '')
      .trim()
      .toLowerCase();

  // 한글 주석: 현재 페이지가 영어 버전인지 판단합니다.
  const isEnglishPage = () => resolveLocale() === 'en';

  // 한글 주석: 무료 쿠폰 코드와 대시보드 URL을 구성합니다.
  const resolveFreeCouponCode = () => fallbackString(config.freeCouponCode, 'BHWFREECREDIT');

  const resolveAppDashboardUrl = () => {
    const fallbackKo = fallbackString(config.appDashboardUrlKo, 'https://app.goatpbn.com/ko/dashboard');
    const fallbackEn = fallbackString(config.appDashboardUrlEn, 'https://ap9p.goatpbn.com/en/dashboard');
    return isEnglishPage() ? fallbackEn : fallbackKo;
  };

  const buildFreeDashboardUrl = () => {
    try {
      const url = new URL(resolveAppDashboardUrl());
      url.searchParams.set('auto_coupon', '1');
      url.searchParams.set('coupon', resolveFreeCouponCode());
      return url.toString();
    } catch (err) {
      console.warn('무료 플랜 이동 URL 생성 실패:', err);
      return resolveAppDashboardUrl();
    }
  };

  // 한글 주석: Supabase 클라이언트를 재사용합니다.
  const getSupabase = async () => {
    if (supabaseClient) return supabaseClient;
    supabaseClient = await createSupabaseClient(config, deps);
    return supabaseClient;
  };

  // 한글 주석: 현재 로그인 사용자의 플랜을 조회합니다.
  const getCurrentPlanSlug = async (userId) => {
    const now = Date.now();
    if (cachedPlanSlug && now - cachedPlanFetchedAt < PLAN_CACHE_TTL_MS) return cachedPlanSlug;
    try {
      const supabase = await getSupabase();
      const { data: subscriptionRow, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', userId)
        .maybeSingle();
      if (subscriptionError) throw subscriptionError;
      let planSlug = String(subscriptionRow?.plan || '').toLowerCase();

      if (!planSlug) {
        const { data: userSubRows, error: userSubError } = await supabase
          .from('user_subscriptions')
          .select('plan_id, status')
          .eq('user_id', userId)
          .in('status', ['active', 'approval_pending'])
          .order('created_at', { ascending: false })
          .limit(1);
        if (userSubError) throw userSubError;
        const planId = Array.isArray(userSubRows) ? userSubRows[0]?.plan_id : '';
        if (planId) {
          const { data: planRows, error: planError } = await supabase.from('billing_plans').select('slug').eq('id', planId).limit(1);
          if (planError) throw planError;
          planSlug = String(Array.isArray(planRows) ? planRows[0]?.slug || '' : '').toLowerCase();
        }
      }

      cachedPlanSlug = planSlug;
      cachedPlanFetchedAt = now;
      return planSlug;
    } catch (err) {
      console.warn('현재 플랜 조회 실패:', err);
      return '';
    }
  };

  // 한글 주석: 현재 플랜에 따른 확인/안내 팝업을 처리합니다.
  const confirmPlanAction = async (currentPlanSlug, targetPlanSlug) => {
    const normalizedCurrent = String(currentPlanSlug || '').toLowerCase();
    const normalizedTarget = String(targetPlanSlug || '').toLowerCase();
    if (!normalizedTarget) return true;

    const planLabel = (slug) => {
      if (slug === 'basic') return '베이직';
      if (slug === 'pro') return '프로';
      return slug ? slug.toUpperCase() : 'FREE';
    };

    if (normalizedCurrent && normalizedCurrent === normalizedTarget) {
      window.alert(`현재 ${planLabel(normalizedTarget)} 플랜입니다.`);
      return false;
    }

    if (normalizedCurrent === 'pro' && normalizedTarget === 'basic') {
      window.alert('이미 프로 플랜입니다. 베이직 변경은 마이페이지에서 다운그레이드 예약을 진행해주세요.');
      return false;
    }

    if (normalizedCurrent === 'basic' && normalizedTarget === 'pro') {
      return window.confirm('프로 플랜으로 업그레이드하시겠습니까? 결제창이 바로 열립니다.');
    }

    return true;
  };

  // 한글 주석: 무료 플랜 진입(쿠폰 자동 입력)을 처리합니다.
  const startFreeFlow = async () => {
    try {
      if (!ok) {
        renderMessage(config.selectors.messageBox, `설정 누락: ${missing.join(', ')}`, 'error');
        return;
      }

      await getSupabase();
      const { user, session } = await getSessionFromAnyStorage(config, deps);
      const destinationUrl = buildFreeDashboardUrl();
      if (!user) {
        redirectToLogin('free', { returnToOverride: destinationUrl, forceSignup: true });
        return;
      }

      const ssoUrl = buildSsoUrl(destinationUrl, session);
      window.location.href = ssoUrl;
    } catch (err) {
      console.error('무료 플랜 이동 실패:', err);
      renderMessage(config.selectors.messageBox, '무료 플랜 이동에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    }
  };

  // 한글 주석: 로그인 여부 확인 후 결제창을 호출합니다.
  const startCheckout = async (planSlug, triggerElement) => {
    try {
      if (!ok) {
        renderMessage(config.selectors.messageBox, `설정 누락: ${missing.join(', ')}`, 'error');
        return;
      }

      const normalizedPlanSlug = normalizePlanSlug(planSlug);
      if (!normalizedPlanSlug) {
        renderMessage(config.selectors.messageBox, '플랜 정보가 없습니다. data-plan 속성을 확인해주세요.', 'error');
        return;
      }

      if (normalizedPlanSlug === 'free') {
        await startFreeFlow();
        return;
      }

      await getSupabase();
      const { user } = await getSessionFromAnyStorage(config, deps);
      if (!user) {
        redirectToLogin(normalizedPlanSlug);
        return;
      }

      const currentPlanSlug = await getCurrentPlanSlug(user.id);
      const shouldProceed = await confirmPlanAction(currentPlanSlug, normalizedPlanSlug);
      if (!shouldProceed) return;

      await requestBillingAuth(user, normalizedPlanSlug, triggerElement);
    } catch (err) {
      const message = String(err?.message || '');
      const isCanceled =
        err?.code === 'USER_CANCEL' ||
        err?.code === 'USER_CANCELLED' ||
        message.includes('취소') ||
        message.toLowerCase().includes('cancel');
      if (isCanceled) {
        renderMessage(config.selectors.messageBox, '결제가 취소되었습니다.', 'info');
        return;
      }
      console.error('결제 시작 실패:', err);
      renderMessage(config.selectors.messageBox, '결제창 호출에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    }
  };

  // 한글 주석: 로그인/회원가입 페이지로 이동하면서 리턴 URL과 플랜 정보를 전달합니다.
  const redirectToLogin = (planSlug, options = {}) => {
    try {
      const normalizedPlanSlug = normalizePlanSlug(planSlug);
      const returnTo = options?.returnToOverride ? new URL(options.returnToOverride) : new URL(window.location.href);

      if (!options?.returnToOverride) {
        returnTo.searchParams.set('auto_checkout', '1');
        returnTo.searchParams.set('plan', normalizedPlanSlug);
      }

      const baseLoginUrl = options?.forceSignup ? config.signupUrl || config.loginUrl : config.loginUrl;
      if (!baseLoginUrl) {
        throw new Error('로그인 URL이 설정되어 있지 않습니다.');
      }
      const loginUrl = new URL(baseLoginUrl);
      loginUrl.searchParams.set('return_to', returnTo.toString());
      if (options?.forceSignup && baseLoginUrl === config.loginUrl) {
        loginUrl.searchParams.set('view', 'signup');
      }
      window.location.href = loginUrl.toString();
    } catch (err) {
      console.error('로그인 이동 실패:', err);
      renderMessage(config.selectors.messageBox, '로그인 페이지로 이동할 수 없습니다.', 'error');
    }
  };

  // 한글 주석: 토스 결제창을 호출합니다.
  const requestBillingAuth = async (user, planSlug, triggerElement) => {
    const supabase = await getSupabase();
    const planConfig = await resolvePlanConfig(planSlug, config, supabase);
    if (!planConfig?.amount) {
      renderMessage(config.selectors.messageBox, '결제 금액을 확인할 수 없습니다.', 'error');
      return;
    }

    const tossPaymentsFactory = await ensureTossPayments(config.tossClientKey, deps);
    const payment = tossPaymentsFactory(config.tossClientKey).payment({ customerKey: user.id });

    const successUrl = buildBillingSuccessUrl(planSlug, planConfig.amount);
    const failUrl = buildBillingFailUrl(planSlug);

    // 한글 주석: 결제 성공 페이지에서 플랜 식별을 돕기 위해 저장합니다.
    try {
      sessionStorage.setItem('toss_target_plan', planSlug);
    } catch (err) {
      console.warn('plan 저장 실패:', err);
    }

    const customerName = fallbackString(
      user?.user_metadata?.full_name || user?.user_metadata?.name,
      user?.email ? user.email.split('@')[0] : '고객'
    );

    await payment.requestBillingAuth({
      method: 'CARD',
      successUrl,
      failUrl,
      customerEmail: user?.email || undefined,
      customerName
    });
  };

  // 한글 주석: 결제 성공/실패 URL을 구성합니다.
  const buildBillingSuccessUrl = (planSlug, amount) => {
    try {
      const url = new URL(config.billingSuccessUrl);
      url.searchParams.set('plan', planSlug);
      url.searchParams.set('amount', String(amount));
      return url.toString();
    } catch (err) {
      console.error('successUrl 생성 실패:', err);
      return config.billingSuccessUrl;
    }
  };

  const buildBillingFailUrl = (planSlug) => {
    try {
      const url = new URL(config.billingFailUrl);
      url.searchParams.set('plan', planSlug);
      return url.toString();
    } catch (err) {
      console.error('failUrl 생성 실패:', err);
      return config.billingFailUrl;
    }
  };

  // 한글 주석: 버튼 클릭 이벤트를 연결합니다.
  const bindCheckoutButtons = () => {
    const buttons = document.querySelectorAll(config.selectors.checkoutButton);
    if (!buttons.length) return;
    buttons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const planSlug = getDataAttr(button, 'data-plan') || getDataAttr(button, 'data-plan-slug');
        startCheckout(planSlug, button);
      });
    });
  };

  // 한글 주석: 로그인 완료 후 자동 결제 실행을 처리합니다.
  const handleAutoCheckout = async () => {
    const query = parseQuery();
    if (query?.auto_checkout !== '1') return;
    const planSlug = normalizePlanSlug(query?.plan);
    if (!planSlug) return;
    await startCheckout(planSlug);
  };

  // 한글 주석: 초기화 진입점입니다.
  const init = async () => {
    if (!ok) {
      renderMessage(config.selectors.messageBox, `설정 누락: ${missing.join(', ')}`, 'error');
    }
    bindCheckoutButtons();
    await handleAutoCheckout();
  };

  return { init, startCheckout, startFreeFlow };
};

// 한글 주석: 전역 초기화 (WordPress에서 바로 사용)
const controller = createCheckoutController(window.GOATPBN_CHECKOUT_CONFIG || {});
window.GoatPbnCheckout = {
  init: controller.init,
  startCheckout: controller.startCheckout,
  startFreeFlow: controller.startFreeFlow
};

document.addEventListener('DOMContentLoaded', () => {
  controller.init().catch((err) => console.error('checkout init 실패:', err));
});
