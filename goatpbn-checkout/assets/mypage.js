// v1.4 - goatpbn.com 마이페이지 스크립트 (2026.01.21)
// 기능 요약: 로그인 사용자 정보 및 구독 상태 조회
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

  const loadSubscriptionSummary = async (userId, supabase) => {
    try {
      const subscriptionRow = await fetchSubscriptionRow(userId, supabase);
      const userSubRow = await fetchUserSubscriptionRow(userId, supabase);
      const planSlugFromUserSub = await fetchPlanSlugById(userSubRow?.plan_id, supabase);
      const resolvedPlanSlug = String(subscriptionRow?.plan || planSlugFromUserSub || 'free').toLowerCase();
      const resolvedStatus = subscriptionRow?.status || userSubRow?.status || '구독 정보가 없습니다.';
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
      bindPlanActionButtons();
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
