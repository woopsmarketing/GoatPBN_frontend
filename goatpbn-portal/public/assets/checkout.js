// v0.1 - pricing 결제 실행 로직 (2026.01.20)
// 기능 요약: Try out 클릭 시 로그인 확인 후 토스 결제를 시작합니다.
// 사용 예시: data-plan="basic" 버튼을 클릭하면 결제 흐름이 시작됩니다.

const initPricingPage = () => {
  try {
    const config = GoatUtils.getConfig();
    bindPlanButtons(config);
    hydratePlanPrices(config);
    handleAutoPay(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : '초기화 중 오류가 발생했습니다.';
    showError(message);
  }
};

// 한글 주석: 플랜 금액 표시를 화면에 반영합니다.
const hydratePlanPrices = (config) => {
  const priceNodes = document.querySelectorAll('[data-plan-price]');
  priceNodes.forEach((node) => {
    const plan = node.getAttribute('data-plan-price');
    const amount = config?.PLAN_CONFIG?.[plan]?.amount;
    node.textContent = GoatUtils.formatKRW(amount);
  });
};

// 한글 주석: Try out 버튼 클릭 이벤트를 바인딩합니다.
const bindPlanButtons = (config) => {
  const buttons = document.querySelectorAll('[data-plan]');
  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const planSlug = button.getAttribute('data-plan');
      if (!planSlug) return;
      await handlePlanClick(planSlug, config);
    });
  });
};

// 한글 주석: autoPay 파라미터가 있으면 바로 결제를 시도합니다.
const handleAutoPay = async (config) => {
  const autoPay = GoatUtils.getQueryParam('autoPay') === '1';
  const plan = GoatUtils.getQueryParam('plan');
  if (!autoPay || !plan) return;
  await handlePlanClick(plan, config);
};

// 한글 주석: 실제 결제 시작을 담당합니다.
const handlePlanClick = async (planSlug, config) => {
  try {
    clearMessages();
    setStatus('로그인 정보를 확인 중입니다...');
    const user = await GoatAuth.getCurrentUser();
    if (!user) {
      const currentUrl = window.location.pathname + window.location.search;
      GoatAuth.redirectToLogin(currentUrl, planSlug, true);
      return;
    }

    const planConfig = config?.PLAN_CONFIG?.[planSlug];
    if (!planConfig?.amount) {
      showError('플랜 금액 설정이 없습니다. 관리자에게 문의해주세요.');
      return;
    }

    setStatus('결제 가능 상태를 확인 중입니다...');
    const billingStatus = await fetchBillingStatus(config, user.id);
    const alwaysShowCheckout = Boolean(config.ALWAYS_SHOW_CHECKOUT);

    if (billingStatus?.has_billing_key && !alwaysShowCheckout) {
      setStatus('등록된 카드로 결제를 진행합니다...');
      const chargeResult = await chargeWithBillingKey(config, user, planSlug, planConfig);
      if (!chargeResult) return;
      redirectToSuccess({ mode: 'charge', plan: planSlug, amount: planConfig.amount });
      return;
    }

    await requestBillingAuth(config, user, planSlug, planConfig);
  } catch (err) {
    const message = err instanceof Error ? err.message : '결제 준비 중 오류가 발생했습니다.';
    showError(message);
  }
};

// 한글 주석: 빌링 상태를 조회합니다.
const fetchBillingStatus = async (config, userId) => {
  const url = `${config.API_BASE_URL.replace(/\/+$/, '')}/api/payments/toss/billing/status`;
  const result = await GoatUtils.requestJson(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId
    }
  });
  if (!result.ok) {
    throw new Error(result.error || '빌링 상태 조회에 실패했습니다.');
  }
  return result.data || {};
};

// 한글 주석: 기존 빌링키로 즉시 결제를 요청합니다.
const chargeWithBillingKey = async (config, user, planSlug, planConfig) => {
  const url = `${config.API_BASE_URL.replace(/\/+$/, '')}/api/payments/toss/billing/charge`;
  const payload = {
    plan_slug: planSlug,
    amount: planConfig.amount,
    order_name: planConfig.orderName,
    customer_email: user.email || undefined,
    customer_name: user.user_metadata?.full_name || user.user_metadata?.name || undefined
  };
  const result = await GoatUtils.requestJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': user.id
    },
    body: JSON.stringify(payload)
  });
  if (!result.ok) {
    showError(result.error || '정기결제 승인에 실패했습니다.');
    return null;
  }
  return result.data;
};

// 한글 주석: 토스 결제창(빌링 인증)을 호출합니다.
const requestBillingAuth = async (config, user, planSlug, planConfig) => {
  if (!window.TossPayments) {
    showError('토스 결제 SDK가 로드되지 않았습니다.');
    return;
  }
  const successUrl = GoatUtils.buildPageUrl('success.html', {
    plan: planSlug,
    amount: planConfig.amount
  });
  const failUrl = GoatUtils.buildPageUrl('fail.html', { plan: planSlug });
  if (!successUrl || !failUrl) {
    showError('결제 URL 생성에 실패했습니다.');
    return;
  }

  try {
    sessionStorage.setItem('toss_target_plan', planSlug);
  } catch (err) {
    console.warn('플랜 저장 실패:', err);
  }

  setStatus('결제창을 여는 중입니다...');
  try {
    const tossPayments = window.TossPayments(config.TOSS_CLIENT_KEY);
    const payment = tossPayments.payment({ customerKey: user.id });
    await payment.requestBillingAuth({
      method: 'CARD',
      successUrl,
      failUrl,
      customerEmail: user.email || undefined,
      customerName: user.user_metadata?.full_name || user.user_metadata?.name || undefined
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '결제창 호출에 실패했습니다.';
    showError(message);
  }
};

// 한글 주석: 성공 페이지로 이동합니다.
const redirectToSuccess = (query) => {
  const url = GoatUtils.buildPageUrl('success.html', query);
  if (!url) {
    showError('성공 페이지 URL 생성에 실패했습니다.');
    return;
  }
  window.location.href = url;
};

// 한글 주석: 화면 메시지 출력 유틸입니다.
const setStatus = (message) => {
  GoatUtils.setText('#status-message', message);
  GoatUtils.showElement('#status-box');
};

const showError = (message) => {
  GoatUtils.setText('#error-message', message);
  GoatUtils.showElement('#error-box');
};

const clearMessages = () => {
  GoatUtils.hideElement('#status-box');
  GoatUtils.hideElement('#error-box');
  GoatUtils.setText('#status-message', '');
  GoatUtils.setText('#error-message', '');
};

// 한글 주석: DOM 로드 후 초기화합니다.
document.addEventListener('DOMContentLoaded', initPricingPage);
