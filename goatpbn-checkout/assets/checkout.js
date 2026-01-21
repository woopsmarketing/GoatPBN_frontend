// v1.0 - goatpbn.com 결제 진입 스크립트 (2026.01.20)
// 기능 요약: Try out 클릭 → 로그인 확인 → 토스 결제창 요청
// 사용 예시: <script type="module" src="/assets/checkout.js"></script>

import {
  resolveConfig,
  validateConfig,
  createSupabaseClient,
  getSessionUser,
  ensureTossPayments,
  resolvePlanConfig,
  getDataAttr,
  parseQuery,
  renderMessage,
  fallbackString
} from './utils.js';

// 한글 주석: 외부 의존성 주입으로 테스트 가능하게 구성합니다.
const createCheckoutController = (userConfig = {}, deps = {}) => {
  const config = resolveConfig(userConfig);
  const { ok, missing } = validateConfig(config);
  let supabaseClient = null;

  // 한글 주석: Supabase 클라이언트를 재사용합니다.
  const getSupabase = async () => {
    if (supabaseClient) return supabaseClient;
    supabaseClient = await createSupabaseClient(config, deps);
    return supabaseClient;
  };

  // 한글 주석: 로그인 여부 확인 후 결제창을 호출합니다.
  const startCheckout = async (planSlug, triggerElement) => {
    try {
      if (!ok) {
        renderMessage(config.selectors.messageBox, `설정 누락: ${missing.join(', ')}`, 'error');
        return;
      }

      if (!planSlug) {
        renderMessage(config.selectors.messageBox, '플랜 정보가 없습니다. data-plan 속성을 확인해주세요.', 'error');
        return;
      }

      const supabase = await getSupabase();
      const user = await getSessionUser(supabase);
      if (!user) {
        redirectToLogin(planSlug);
        return;
      }

      await requestBillingAuth(user, planSlug, triggerElement);
    } catch (err) {
      console.error('결제 시작 실패:', err);
      renderMessage(config.selectors.messageBox, '결제창 호출에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    }
  };

  // 한글 주석: 로그인 페이지로 이동하면서 리턴 URL과 플랜 정보를 전달합니다.
  const redirectToLogin = (planSlug) => {
    try {
      const returnTo = new URL(window.location.href);
      returnTo.searchParams.set('auto_checkout', '1');
      returnTo.searchParams.set('plan', planSlug);
      const loginUrl = new URL(config.loginUrl);
      loginUrl.searchParams.set('return_to', returnTo.toString());
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
    const planSlug = String(query?.plan || '').trim();
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

  return { init, startCheckout };
};

// 한글 주석: 전역 초기화 (WordPress에서 바로 사용)
const controller = createCheckoutController(window.GOATPBN_CHECKOUT_CONFIG || {});
window.GoatPbnCheckout = {
  init: controller.init,
  startCheckout: controller.startCheckout
};

document.addEventListener('DOMContentLoaded', () => {
  controller.init().catch((err) => console.error('checkout init 실패:', err));
});
