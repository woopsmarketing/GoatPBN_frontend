// v2.3 - 업그레이드 고정 차액 결제 흐름 추가 (2026.01.28)
// 기능 요약: 베이직 -> 프로 업그레이드는 billing/charge로 고정 차액 결제를 수행합니다.
// 사용 예시: <script type="module" src="/assets/checkout.js"></script>

import {
  resolveConfig,
  validateConfig,
  validateConfigWithKeys,
  createSupabaseClient,
  getSessionFromAnyStorage,
  ensureTossPayments,
  resolvePlanConfig,
  getDataAttr,
  parseQuery,
  renderMessage,
  fallbackString,
  buildSsoUrl,
  resolveLocale,
  normalizeAppUrl
} from './utils.js?v=17';

// 한글 주석: 외부 의존성 주입으로 테스트 가능하게 구성합니다.
const createCheckoutController = (userConfig = {}, deps = {}) => {
  const config = resolveConfig(userConfig);
  const paidValidation = validateConfig(config);
  const freeValidation = validateConfigWithKeys(config, ['supabaseUrl', 'supabaseAnonKey']);
  let supabaseClient = null;
  let cachedPlanSlug = '';
  let cachedPlanFetchedAt = 0;
  const PLAN_CACHE_TTL_MS = 30000;
  const FREE_LOADING_MESSAGES_LOGGED_IN = [
    '무료로 500크레딧을 받아보세요!',
    'app 대시보드 으로 이동합니다 :)',
    '쿠폰번호 작성까지 해드리겠습니다 :)'
  ];
  const FREE_LOADING_MESSAGES_LOGIN = ['로그인 페이지로 이동합니다 :)', '로그인 후 무료 쿠폰이 자동 적용됩니다 :)'];
  const TRIGGER_LOADING_ATTR = 'data-goatpbn-loading';

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
    const fallbackKo = normalizeAppUrl(fallbackString(config.appDashboardUrlKo, 'https://app.goatpbn.com/ko/dashboard'));
    const fallbackEn = normalizeAppUrl(fallbackString(config.appDashboardUrlEn, 'https://app.goatpbn.com/en/dashboard'));
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

  // 한글 주석: 무료 플로우용 로딩 오버레이를 생성합니다.
  const ensureFreeLoadingOverlay = () => {
    if (typeof document === 'undefined') return { overlay: null, messageEl: null };
    const overlayId = 'goatpbn-free-loading';
    let overlay = document.getElementById(overlayId);
    let messageEl = overlay?.querySelector?.('[data-goatpbn-loading-message]');
    if (overlay && messageEl) return { overlay, messageEl };

    overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = 'rgba(15, 23, 42, 0.45)';

    const card = document.createElement('div');
    card.style.background = '#ffffff';
    card.style.borderRadius = '16px';
    card.style.padding = '20px 24px';
    card.style.boxShadow = '0 12px 30px rgba(15, 23, 42, 0.2)';
    card.style.textAlign = 'center';
    card.style.minWidth = '240px';

    const spinner = document.createElement('div');
    spinner.style.width = '28px';
    spinner.style.height = '28px';
    spinner.style.border = '3px solid #e2e8f0';
    spinner.style.borderTop = '3px solid #2bb673';
    spinner.style.borderRadius = '50%';
    spinner.style.margin = '0 auto 12px auto';
    spinner.style.animation = 'goatpbn-spin 0.9s linear infinite';

    const style = document.createElement('style');
    style.textContent = '@keyframes goatpbn-spin {0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}';

    messageEl = document.createElement('div');
    messageEl.setAttribute('data-goatpbn-loading-message', '1');
    messageEl.style.fontSize = '13px';
    messageEl.style.fontWeight = '600';
    messageEl.style.color = '#0f172a';
    messageEl.style.lineHeight = '1.5';
    messageEl.textContent = '처리 중입니다...';

    card.appendChild(spinner);
    card.appendChild(messageEl);
    overlay.appendChild(card);
    overlay.appendChild(style);
    document.body.appendChild(overlay);

    return { overlay, messageEl };
  };

  // 한글 주석: 로딩 메시지를 순차적으로 표시합니다.
  const showFreeLoadingMessages = async (isLoggedIn) => {
    const { overlay, messageEl } = ensureFreeLoadingOverlay();
    if (!overlay || !messageEl) return;
    const messages = isLoggedIn ? FREE_LOADING_MESSAGES_LOGGED_IN : FREE_LOADING_MESSAGES_LOGIN;
    for (const message of messages) {
      messageEl.textContent = message;
      await new Promise((resolve) => setTimeout(resolve, 650));
    }
  };

  // 한글 주석: 플랜별로 필요한 설정만 검증합니다.
  const getValidationForPlan = (planSlug) => (planSlug === 'free' ? freeValidation : paidValidation);

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
      return window.confirm('프로 플랜으로 업그레이드하시겠습니까? 고정 차액 결제가 진행됩니다.');
    }

    return true;
  };

  // 한글 주석: 결제 버튼 중복 클릭을 방지합니다.
  const setTriggerLoading = (element, isLoading) => {
    if (!element) return;
    if (isLoading) {
      element.setAttribute(TRIGGER_LOADING_ATTR, '1');
    } else {
      element.removeAttribute(TRIGGER_LOADING_ATTR);
    }
  };

  // 한글 주석: 현재 버튼이 로딩 상태인지 확인합니다.
  const isTriggerLoading = (element) => element?.getAttribute?.(TRIGGER_LOADING_ATTR) === '1';

  // 한글 주석: 무료 플랜 진입(쿠폰 자동 입력)을 처리합니다.
  const startFreeFlow = async () => {
    try {
      if (!freeValidation.ok) {
        renderMessage(config.selectors.messageBox, `설정 누락: ${freeValidation.missing.join(', ')}`, 'error');
        return;
      }

      await getSupabase();
      const { user, session } = await getSessionFromAnyStorage(config, deps);
      const destinationUrl = buildFreeDashboardUrl();
      await showFreeLoadingMessages(!!user);
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
      if (isTriggerLoading(triggerElement)) return;
      setTriggerLoading(triggerElement, true);
      const normalizedPlanSlug = normalizePlanSlug(planSlug);
      const validation = getValidationForPlan(normalizedPlanSlug);
      if (!validation.ok) {
        renderMessage(config.selectors.messageBox, `설정 누락: ${validation.missing.join(', ')}`, 'error');
        return;
      }
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

      if (currentPlanSlug === 'basic' && normalizedPlanSlug === 'pro') {
        await requestUpgradeCharge(user, normalizedPlanSlug, triggerElement);
        return;
      }

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
    } finally {
      setTriggerLoading(triggerElement, false);
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

  // 한글 주석: 업그레이드(베이직 -> 프로)는 billing/charge로 고정 차액 결제를 시도합니다.
  const requestUpgradeCharge = async (user, planSlug, triggerElement) => {
    try {
      const apiBase = String(config.apiBaseUrl || '').replace(/\/+$/, '');
      if (!apiBase) {
        renderMessage(config.selectors.messageBox, 'API 주소가 설정되지 않았습니다.', 'error');
        return;
      }

      renderMessage(config.selectors.messageBox, '프로 업그레이드 결제를 진행 중입니다...', 'info');
      const resp = await fetch(`${apiBase}/api/payments/toss/billing/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ plan_slug: planSlug })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        if (resp.status === 404) {
          renderMessage(config.selectors.messageBox, '등록된 결제수단이 없어 결제창을 다시 열겠습니다.', 'info');
          await requestBillingAuth(user, planSlug, triggerElement);
          return;
        }
        throw new Error(data?.detail || data?.error || '업그레이드 결제에 실패했습니다.');
      }

      const paidAmount = Number(data?.payment?.totalAmount || data?.payment?.amount || 0);
      const amountLabel = paidAmount ? ` (${paidAmount.toLocaleString()}원)` : '';
      renderMessage(config.selectors.messageBox, `업그레이드 결제가 완료되었습니다${amountLabel}.`, 'info');

      setTimeout(() => {
        const redirectUrl = fallbackString(config.mypageUrl, fallbackString(config.afterSuccessRedirectUrl, ''));
        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error('업그레이드 결제 실패:', err);
      renderMessage(config.selectors.messageBox, err?.message || '업그레이드 결제에 실패했습니다.', 'error');
    }
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
      if (button.getAttribute('data-goatpbn-checkout-bound') === '1') return;
      button.setAttribute('data-goatpbn-checkout-bound', '1');
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const planSlug = getDataAttr(button, 'data-plan') || getDataAttr(button, 'data-plan-slug');
        startCheckout(planSlug, button);
      });
    });
  };

  // 한글 주석: 동적 렌더링 버튼을 위한 이벤트 위임 처리입니다.
  const bindCheckoutDelegation = () => {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', (event) => {
      const target = event.target?.closest?.(config.selectors.checkoutButton);
      if (!target) return;
      if (target.getAttribute('data-goatpbn-checkout-bound') === '1') return;
      event.preventDefault();
      const planSlug = getDataAttr(target, 'data-plan') || getDataAttr(target, 'data-plan-slug');
      startCheckout(planSlug, target);
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
    bindCheckoutButtons();
    bindCheckoutDelegation();
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
