// v1.7 - goatpbn.com 마이페이지 스크립트 (2026.01.22)
// 기능 요약: 구독 취소 처리 및 상태별 버튼 제어
// 사용 예시: <script type="module" src="/assets/mypage.js"></script>

import {
  resolveConfig,
  validateConfigWithKeys,
  createSupabaseClient,
  getSessionFromAnyStorage,
  renderMessage,
  bindSsoLinks
} from './utils.js?v=11';

const createMypageController = (userConfig = {}, deps = {}) => {
  const config = resolveConfig(userConfig);
  const { ok, missing } = validateConfigWithKeys(config, ['supabaseUrl', 'supabaseAnonKey']);
  let supabaseClient = null;
  let currentPlanSlug = '';
  let currentUserId = '';
  let activeSupabase = null;

  const getSupabase = async () => {
    if (supabaseClient) return supabaseClient;
    supabaseClient = await createSupabaseClient(config, deps);
    return supabaseClient;
  };

  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  };

  const fetchSubscriptionRow = async (userId, supabase) => {
    const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data || null;
  };

  const fetchUserSubscriptionRow = async (userId, supabase) => {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('plan_id, status, next_billing_date')
      .eq('user_id', userId)
      .in('status', ['active', 'approval_pending'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) {
      console.warn('user_subscriptions 조회 실패:', error.message);
    }
    return Array.isArray(data) ? data[0] : null;
  };

  const fetchPlanSlugById = async (planId, supabase) => {
    if (!planId) return '';
    try {
      const { data, error } = await supabase.from('billing_plans').select('slug').eq('id', planId).limit(1);
      if (error) throw error;
      return Array.isArray(data) ? data[0]?.slug || '' : '';
    } catch (err) {
      console.warn('billing_plans 조회 실패:', err);
      return '';
    }
  };

  const resolvePlanLabel = (planSlug) => {
    const normalized = String(planSlug || '').toLowerCase();
    if (!normalized || normalized === 'free') return '무료';
    return normalized.toUpperCase();
  };

  // 한글 주석: 상태 문자열을 표준화합니다.
  const normalizeStatus = (status) => String(status || '').toLowerCase();

  const updatePlanButtons = (currentPlanSlug) => {
    const normalized = String(currentPlanSlug || '').toLowerCase();
    const planButtons = document.querySelectorAll('[data-goatpbn-plan-action]');
    planButtons.forEach((btn) => {
      const plan = String(btn.getAttribute('data-plan') || '').toLowerCase();
      if (!plan) return;
      if (normalized && plan === normalized) {
        btn.classList.add('hidden');
        return;
      }
      btn.classList.remove('hidden');
      if (plan === 'pro') {
        btn.textContent = '프로로 업그레이드';
      } else if (plan === 'basic') {
        btn.textContent = normalized === 'pro' ? '다음 달부터 베이직으로 변경' : '베이직으로 변경';
      }
    });
  };

  // 한글 주석: 다운그레이드 예약 안내 문구를 표시합니다.
  const updateDowngradeNotice = (currentPlan, reservedPlan, nextBillingDate) => {
    const noticeEl = document.querySelector('[data-goatpbn-downgrade]');
    if (!noticeEl) return;
    const normalizedCurrent = String(currentPlan || '').toLowerCase();
    const normalizedReserved = String(reservedPlan || '').toLowerCase();
    const isScheduled = normalizedCurrent && normalizedReserved && normalizedCurrent !== normalizedReserved;

    if (!isScheduled) {
      noticeEl.textContent = '';
      noticeEl.classList.add('hidden');
      updateCancelButton(false);
      return;
    }

    let dateLabel = '';
    if (nextBillingDate) {
      try {
        const date = new Date(nextBillingDate);
        if (!Number.isNaN(date.getTime())) {
          dateLabel = ` (적용 예정일: ${date.toLocaleDateString('ko-KR')})`;
        }
      } catch (err) {
        console.warn('다운그레이드 예정일 파싱 실패:', err);
      }
    }

    const planLabel = resolvePlanLabel(normalizedReserved);
    noticeEl.textContent = `다음 결제부터 ${planLabel} 예정입니다.${dateLabel}`;
    noticeEl.classList.remove('hidden');
    updateCancelButton(true);
  };

  // 한글 주석: 다운그레이드 예약 취소 버튼을 제어합니다.
  const updateCancelButton = (isVisible) => {
    const cancelButton = document.querySelector('[data-goatpbn-cancel-downgrade]');
    if (!cancelButton) return;
    cancelButton.classList.toggle('hidden', !isVisible);
    cancelButton.disabled = !isVisible;
  };

  // 한글 주석: 구독 취소 버튼 노출 여부를 제어합니다.
  const updateCancelSubscriptionButton = (planSlug, status) => {
    const cancelButton = document.querySelector('[data-goatpbn-cancel-subscription]');
    if (!cancelButton) return;
    const normalizedPlan = String(planSlug || '').toLowerCase();
    const normalizedStatus = normalizeStatus(status);
    const isPaidPlan = normalizedPlan === 'basic' || normalizedPlan === 'pro';
    const isCanceled = normalizedStatus === 'canceled' || normalizedStatus === 'cancelled';
    const shouldShow = isPaidPlan && !isCanceled;
    cancelButton.classList.toggle('hidden', !shouldShow);
    cancelButton.disabled = !shouldShow;
  };

  const startCheckoutFlow = (planSlug) => {
    const checkout = window.GoatPbnCheckout;
    if (!checkout?.startCheckout) {
      renderMessage(config.selectors.messageBox, '결제 모듈을 찾을 수 없습니다. 잠시 후 다시 시도해주세요.', 'error');
      return;
    }
    checkout.startCheckout(planSlug);
  };

  const scheduleDowngrade = async () => {
    if (!currentUserId) return;
    renderMessage(config.selectors.messageBox, '다운그레이드를 예약하는 중입니다...', 'info');
    try {
      const apiBase = String(config.apiBaseUrl || '').replace(/\/+$/, '');
      if (!apiBase) throw new Error('API 주소가 설정되지 않았습니다.');
      const resp = await fetch(`${apiBase}/api/payments/toss/downgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify({ target_plan_slug: 'basic' })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.detail || data?.error || '다운그레이드 예약 실패');
      }
      renderMessage(config.selectors.messageBox, '다음 결제 주기부터 베이직으로 변경됩니다.', 'info');
      if (activeSupabase) {
        await loadSubscriptionSummary(currentUserId, activeSupabase);
      }
    } catch (err) {
      renderMessage(config.selectors.messageBox, err?.message || '다운그레이드 예약 실패', 'error');
    }
  };

  // 한글 주석: 다운그레이드 예약을 취소합니다.
  const cancelDowngrade = async () => {
    if (!currentUserId) return;
    renderMessage(config.selectors.messageBox, '다운그레이드 예약을 취소하는 중입니다...', 'info');
    try {
      const apiBase = String(config.apiBaseUrl || '').replace(/\/+$/, '');
      if (!apiBase) throw new Error('API 주소가 설정되지 않았습니다.');
      const resp = await fetch(`${apiBase}/api/payments/toss/cancel-downgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        }
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.detail || data?.error || '다운그레이드 예약 취소 실패');
      }
      renderMessage(config.selectors.messageBox, '다운그레이드 예약이 취소되었습니다.', 'info');
      if (activeSupabase) {
        await loadSubscriptionSummary(currentUserId, activeSupabase);
      }
    } catch (err) {
      renderMessage(config.selectors.messageBox, err?.message || '다운그레이드 예약 취소 실패', 'error');
    }
  };

  // 한글 주석: 구독 취소 요청을 처리합니다.
  const cancelSubscription = async () => {
    if (!currentUserId) return;
    const confirmed = window.confirm('구독을 취소하시겠습니까? 결제 갱신이 중단됩니다.');
    if (!confirmed) return;
    renderMessage(config.selectors.messageBox, '구독 취소를 진행하는 중입니다...', 'info');
    try {
      const apiBase = String(config.apiBaseUrl || '').replace(/\/+$/, '');
      if (!apiBase) throw new Error('API 주소가 설정되지 않았습니다.');
      const resp = await fetch(`${apiBase}/api/payments/toss/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        }
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.detail || data?.error || '구독 취소 실패');
      }
      renderMessage(config.selectors.messageBox, '구독 취소가 완료되었습니다.', 'info');
      if (activeSupabase) {
        await loadSubscriptionSummary(currentUserId, activeSupabase);
      }
    } catch (err) {
      renderMessage(config.selectors.messageBox, err?.message || '구독 취소 실패', 'error');
    }
  };

  const bindPlanActionButtons = () => {
    const planButtons = document.querySelectorAll('[data-goatpbn-plan-action]');
    planButtons.forEach((btn) => {
      if (btn.getAttribute('data-goatpbn-plan-bound') === '1') return;
      btn.setAttribute('data-goatpbn-plan-bound', '1');
      btn.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          const plan = String(btn.getAttribute('data-plan') || '').toLowerCase();
          if (!plan) return;
          if (currentPlanSlug === 'pro' && plan === 'basic') {
            scheduleDowngrade();
            return;
          }
          startCheckoutFlow(plan);
        },
        true
      );
    });
  };

  const bindCancelButton = () => {
    const cancelButton = document.querySelector('[data-goatpbn-cancel-downgrade]');
    if (!cancelButton || cancelButton.getAttribute('data-goatpbn-cancel-bound') === '1') return;
    cancelButton.setAttribute('data-goatpbn-cancel-bound', '1');
    cancelButton.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelDowngrade();
      },
      true
    );
  };

  // 한글 주석: 구독 취소 버튼 클릭을 연결합니다.
  const bindCancelSubscriptionButton = () => {
    const cancelButton = document.querySelector('[data-goatpbn-cancel-subscription]');
    if (!cancelButton || cancelButton.getAttribute('data-goatpbn-cancel-subscription-bound') === '1') return;
    cancelButton.setAttribute('data-goatpbn-cancel-subscription-bound', '1');
    cancelButton.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelSubscription();
      },
      true
    );
  };

  const loadSubscriptionSummary = async (userId, supabase) => {
    try {
      const subscriptionRow = await fetchSubscriptionRow(userId, supabase);
      const userSubRow = await fetchUserSubscriptionRow(userId, supabase);
      const planSlugFromUserSub = await fetchPlanSlugById(userSubRow?.plan_id, supabase);
      const resolvedPlanSlug = String(subscriptionRow?.plan || planSlugFromUserSub || 'free').toLowerCase();
      const resolvedStatus = subscriptionRow?.status || userSubRow?.status || '구독 정보가 없습니다.';
      const reservedPlanSlug = String(planSlugFromUserSub || '').toLowerCase();
      currentPlanSlug = resolvedPlanSlug;

      setText('[data-goatpbn-plan]', resolvePlanLabel(resolvedPlanSlug));
      setText('[data-goatpbn-status]', resolvedStatus);

      const total = Number(subscriptionRow?.credits_total ?? 0);
      const used = Math.min(Number(subscriptionRow?.credits_used ?? 0), total);
      const remaining = Math.max(Number(subscriptionRow?.credits_remaining ?? total - used), 0);
      setText('[data-goatpbn-credits-total]', total.toLocaleString());
      setText('[data-goatpbn-credits-used]', used.toLocaleString());
      setText('[data-goatpbn-credits-remaining]', remaining.toLocaleString());

      updatePlanButtons(resolvedPlanSlug);
      updateDowngradeNotice(resolvedPlanSlug, reservedPlanSlug, userSubRow?.next_billing_date);
      updateCancelSubscriptionButton(resolvedPlanSlug, resolvedStatus);
      bindPlanActionButtons();
      bindCancelButton();
      bindCancelSubscriptionButton();
    } catch (err) {
      console.warn('구독 정보 조회 실패:', err);
      renderMessage(config.selectors.messageBox, '구독 정보를 불러오지 못했습니다.', 'error');
    }
  };

  const init = async () => {
    if (!ok) {
      renderMessage(config.selectors.messageBox, `설정 누락: ${missing.join(', ')}`, 'error');
      return;
    }
    try {
      await bindSsoLinks(config, deps);
      const { user, supabase: sessionSupabase } = await getSessionFromAnyStorage(config, deps);
      const supabase = sessionSupabase || (await getSupabase());
      activeSupabase = supabase;
      if (!user) {
        setText('[data-goatpbn-email]', '로그인이 필요합니다.');
        setText('[data-goatpbn-plan]', '—');
        setText('[data-goatpbn-status]', '로그인 후 이용 가능합니다.');
        const planButtons = document.querySelectorAll('[data-goatpbn-plan-action]');
        planButtons.forEach((btn) => btn.classList.add('hidden'));
        const ssoLinks = document.querySelectorAll('[data-goatpbn-sso]');
        ssoLinks.forEach((link) => link.classList.add('hidden'));
      updateCancelSubscriptionButton('', 'canceled');
        return;
      }
      currentUserId = user.id;
      setText('[data-goatpbn-email]', user.email || '사용자');
      await loadSubscriptionSummary(user.id, supabase);
    } catch (err) {
      console.error('마이페이지 초기화 실패:', err);
      renderMessage(config.selectors.messageBox, '마이페이지 초기화 중 오류가 발생했습니다.', 'error');
    }
  };

  return { init };
};

const controller = createMypageController(window.GOATPBN_CHECKOUT_CONFIG || {});
document.addEventListener('DOMContentLoaded', () => {
  controller.init().catch((err) => console.error('mypage init 실패:', err));
});
