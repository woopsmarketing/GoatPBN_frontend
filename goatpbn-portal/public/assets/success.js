// v0.1 - 결제 성공 후처리 (2026.01.20)
// 기능 요약: 토스 결제 완료 후 DB 반영 및 안내 메시지를 표시합니다.
// 사용 예시: /success.html?authKey=...&customerKey=...&plan=basic&amount=20000

const initSuccessPage = () => {
  try {
    const query = GoatUtils.getQueryParams();
    handleSuccessFlow(query);
  } catch (err) {
    const message = err instanceof Error ? err.message : '성공 페이지 초기화 중 오류가 발생했습니다.';
    showError(message);
  }
};

// 한글 주석: 결제 성공 타입을 분기 처리합니다.
const handleSuccessFlow = async (query) => {
  clearMessages();
  setStatus('결제 정보를 확인 중입니다...');

  if (query.mode === 'charge') {
    showChargeSuccess(query);
    return;
  }

  if (query.authKey && query.customerKey) {
    await handleBillingIssue(query);
    return;
  }

  if (query.paymentKey && query.orderId && query.amount) {
    await handlePaymentConfirm(query);
    return;
  }

  showError('결제 결과 정보를 찾을 수 없습니다.');
};

// 한글 주석: 빌링키 발급 성공 후 처리입니다.
const handleBillingIssue = async (query) => {
  try {
    const config = GoatUtils.getConfig();
    const planSlug = getPlanSlug(query.plan);
    const amount = Number(query.amount);
    if (!planSlug) throw new Error('플랜 정보가 누락되었습니다.');
    if (!Number.isFinite(amount)) throw new Error('결제 금액이 올바르지 않습니다.');

    const user = await GoatAuth.getCurrentUser();
    if (!user) {
      showError('로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      return;
    }

    setStatus('정기결제를 등록하는 중입니다...');
    const url = `${config.API_BASE_URL.replace(/\/+$/, '')}/api/payments/toss/billing/issue`;
    const payload = {
      auth_key: query.authKey,
      customer_key: query.customerKey,
      plan_slug: planSlug,
      amount,
      order_name: config?.PLAN_CONFIG?.[planSlug]?.orderName || `GoatPBN ${planSlug.toUpperCase()}`,
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
      throw new Error(result.error || '정기결제 등록에 실패했습니다.');
    }

    setStatus('정기결제가 완료되었습니다.');
    renderSummary({
      plan: planSlug,
      amount,
      status: result.data?.payment?.status || 'OK'
    });
    scheduleRedirect();
  } catch (err) {
    const message = err instanceof Error ? err.message : '정기결제 등록 중 오류가 발생했습니다.';
    showError(message);
  }
};

// 한글 주석: 일회성 결제 confirm 처리입니다.
const handlePaymentConfirm = async (query) => {
  try {
    const config = GoatUtils.getConfig();
    const planSlug = getPlanSlug(query.plan);
    const amount = Number(query.amount);
    if (!planSlug) throw new Error('플랜 정보를 확인할 수 없습니다.');
    if (!Number.isFinite(amount)) throw new Error('결제 금액이 올바르지 않습니다.');

    setStatus('결제 승인을 확인 중입니다...');
    const confirmResult = await callTossConfirm(config, {
      paymentKey: query.paymentKey,
      orderId: query.orderId,
      amount
    });

    if (!confirmResult || !['CONFIRMED', 'ALREADY_CONFIRMED'].includes(confirmResult.status)) {
      throw new Error(confirmResult?.message || '결제 확인에 실패했습니다.');
    }

    setStatus('결제 정보를 반영하는 중입니다...');
    const user = await GoatAuth.getCurrentUser();
    if (!user) {
      throw new Error('로그인 정보를 찾을 수 없습니다.');
    }

    const postProcessUrl = `${config.API_BASE_URL.replace(/\/+$/, '')}/api/payments/toss/confirm`;
    const postResult = await GoatUtils.requestJson(postProcessUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: user.id,
        plan_slug: planSlug,
        payment_key: query.paymentKey,
        order_id: query.orderId,
        amount,
        currency: 'KRW',
        status: confirmResult.status,
        raw_payload: confirmResult
      })
    });

    if (!postResult.ok) {
      throw new Error(postResult.error || '구독 반영에 실패했습니다.');
    }

    setStatus('결제가 완료되었습니다.');
    renderSummary({
      plan: planSlug,
      amount,
      status: confirmResult.status
    });
    scheduleRedirect();
  } catch (err) {
    const message = err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.';
    showError(message);
  }
};

// 한글 주석: Toss confirm API를 호출합니다.
const callTossConfirm = async (config, payload) => {
  const result = await GoatUtils.requestJson(config.TOSS_CONFIRM_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Key': config.TOSS_TENANT_KEY
    },
    body: JSON.stringify(payload)
  });
  if (!result.ok) {
    throw new Error(result.error || '결제 승인 확인에 실패했습니다.');
  }
  return result.data;
};

// 한글 주석: 플랜 슬러그를 안전하게 가져옵니다.
const getPlanSlug = (planFromQuery) => {
  if (planFromQuery) return planFromQuery;
  try {
    return sessionStorage.getItem('toss_target_plan') || '';
  } catch (err) {
    console.warn('플랜 정보 읽기 실패:', err);
    return '';
  }
};

// 한글 주석: 즉시 결제 완료 상태를 표시합니다.
const showChargeSuccess = (query) => {
  const amount = Number(query.amount);
  const planSlug = getPlanSlug(query.plan);
  setStatus('정기결제가 완료되었습니다.');
  renderSummary({
    plan: planSlug,
    amount,
    status: 'CHARGED'
  });
  scheduleRedirect();
};

// 한글 주석: 요약 정보를 화면에 표시합니다.
const renderSummary = ({ plan, amount, status }) => {
  GoatUtils.setText('#summary-plan', plan ? plan.toUpperCase() : '—');
  GoatUtils.setText('#summary-amount', GoatUtils.formatKRW(amount));
  GoatUtils.setText('#summary-status', status || '—');
  GoatUtils.showElement('#summary-box');
};

// 한글 주석: 앱으로 이동 안내를 스케줄링합니다.
const scheduleRedirect = () => {
  const config = GoatUtils.getConfig();
  GoatUtils.setText('#next-link', config.APP_REDIRECT_URL);
  GoatUtils.showElement('#next-box');
  setTimeout(() => {
    window.location.href = config.APP_REDIRECT_URL;
  }, 4000);
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
  GoatUtils.hideElement('#summary-box');
  GoatUtils.hideElement('#next-box');
  GoatUtils.setText('#status-message', '');
  GoatUtils.setText('#error-message', '');
};

// 한글 주석: DOM 로드 후 초기화합니다.
document.addEventListener('DOMContentLoaded', initSuccessPage);
