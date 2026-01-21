// v1.0 - goatpbn.com 결제 성공 처리 스크립트 (2026.01.20)
// 기능 요약: authKey/customerKey로 빌링 발급 및 구독 반영 요청
// 사용 예시: <script type="module" src="/assets/success.js"></script>

import {
  resolveConfig,
  validateConfig,
  createSupabaseClient,
  getSessionUser,
  parseQuery,
  renderMessage,
  fallbackString
} from './utils.js';

// 한글 주석: 결제 성공 후 서버에 후처리를 요청합니다.
const createSuccessController = (userConfig = {}, deps = {}) => {
  const config = resolveConfig(userConfig);
  const { ok, missing } = validateConfig(config);
  let supabaseClient = null;

  const getSupabase = async () => {
    if (supabaseClient) return supabaseClient;
    supabaseClient = await createSupabaseClient(config, deps);
    return supabaseClient;
  };

  const setStatus = (text) => {
    const el = document.querySelector('[data-goatpbn-status]');
    if (el) el.textContent = text;
  };

  const setError = (text) => {
    const el = document.querySelector('[data-goatpbn-error]');
    if (el) el.textContent = text;
  };

  const setSummary = (text) => {
    const el = document.querySelector('[data-goatpbn-summary]');
    if (el) el.textContent = text;
  };

  // 한글 주석: 결제 후처리를 호출합니다.
  const handleSuccess = async () => {
    if (!ok) {
      renderMessage(config.selectors.messageBox, `설정 누락: ${missing.join(', ')}`, 'error');
      setError('설정이 누락되었습니다. 관리자에게 문의해주세요.');
      return;
    }

    const query = parseQuery();
    const authKey = fallbackString(query.authKey, '');
    const customerKey = fallbackString(query.customerKey, '');
    const planSlug = fallbackString(query.plan, '');
    const amountRaw = query.amount ? Number(query.amount) : null;

    if (!authKey || !customerKey) {
      setError('결제 인증 정보가 부족합니다.');
      return;
    }

    let storedPlan = '';
    try {
      storedPlan = sessionStorage.getItem('toss_target_plan') || '';
    } catch (err) {
      console.warn('plan 저장값 읽기 실패:', err);
    }
    const finalPlanSlug = planSlug || storedPlan || '';
    if (!finalPlanSlug) {
      setError('플랜 정보를 확인할 수 없습니다.');
      return;
    }

    setStatus('결제 정보를 확인하는 중입니다...');
    try {
      const supabase = await getSupabase();
      const user = await getSessionUser(supabase);
      const userId = user?.id || customerKey;

      const planConfig = config?.planMap?.[finalPlanSlug] || {};
      const orderName = planConfig?.orderName || `GoatPBN ${finalPlanSlug.toUpperCase()} 정기결제`;
      const payload = {
        auth_key: authKey,
        customer_key: customerKey,
        plan_slug: finalPlanSlug,
        amount: Number.isFinite(amountRaw) ? amountRaw : null,
        order_name: orderName,
        customer_email: user?.email || undefined,
        customer_name:
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          (user?.email ? user.email.split('@')[0] : undefined)
      };

      const resp = await fetch(`${config.apiBaseUrl.replace(/\/$/, '')}/api/payments/toss/billing/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(payload)
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.detail || data?.error || '결제 후처리에 실패했습니다.');
      }

      setStatus('정기결제가 완료되었습니다.');
      setSummary(`플랜: ${finalPlanSlug.toUpperCase()} / 상태: ${data?.status || data?.payment?.status || '확인 중'}`);

      if (config.afterSuccessRedirectUrl) {
        setTimeout(() => {
          window.location.href = config.afterSuccessRedirectUrl;
        }, 2000);
      }
    } catch (err) {
      console.error('결제 성공 처리 실패:', err);
      setError(err?.message || '결제 처리 중 오류가 발생했습니다.');
    }
  };

  const init = async () => {
    await handleSuccess();
  };

  return { init, handleSuccess };
};

const controller = createSuccessController(window.GOATPBN_CHECKOUT_CONFIG || {});
window.GoatPbnSuccess = {
  init: controller.init
};

document.addEventListener('DOMContentLoaded', () => {
  controller.init().catch((err) => console.error('success init 실패:', err));
});
