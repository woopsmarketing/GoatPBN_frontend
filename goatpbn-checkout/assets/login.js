// v1.0 - goatpbn.com 로그인 페이지 스크립트 (2026.01.20)
// 기능 요약: Supabase Google OAuth 로그인 후 원래 페이지로 복귀
// 사용 예시: <script type="module" src="/assets/login.js"></script>

import { resolveConfig, validateConfig, createSupabaseClient, getSessionUser, parseQuery, renderMessage } from './utils.js';

// 한글 주석: 의존성 주입을 고려한 로그인 컨트롤러
const createLoginController = (userConfig = {}, deps = {}) => {
  const config = resolveConfig(userConfig);
  const { ok, missing } = validateConfig(config);
  let supabaseClient = null;

  const getSupabase = async () => {
    if (supabaseClient) return supabaseClient;
    supabaseClient = await createSupabaseClient(config, deps);
    return supabaseClient;
  };

  // 한글 주석: 로그인 완료 후 이동할 URL을 생성합니다.
  const buildReturnToUrl = () => {
    const query = parseQuery();
    const rawReturnTo = query?.return_to;
    const plan = query?.plan || '';
    try {
      const target = rawReturnTo ? new URL(rawReturnTo) : new URL(config.pricingUrl);
      if (plan) target.searchParams.set('plan', plan);
      target.searchParams.set('auto_checkout', '1');
      return target.toString();
    } catch (err) {
      console.warn('return_to 파싱 실패:', err);
      return config.pricingUrl;
    }
  };

  // 한글 주석: 로그인 버튼 클릭 시 OAuth를 시작합니다.
  const handleLogin = async () => {
    if (!ok) {
      renderMessage(config.selectors.messageBox, `설정 누락: ${missing.join(', ')}`, 'error');
      return;
    }
    try {
      const supabase = await getSupabase();
      const redirectTo = buildReturnToUrl();
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });
    } catch (err) {
      console.error('로그인 실패:', err);
      renderMessage(config.selectors.messageBox, '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    }
  };

  // 한글 주석: 이미 로그인된 경우 안내 메시지를 보여줍니다.
  const handleAlreadyLoggedIn = async () => {
    try {
      const supabase = await getSupabase();
      const user = await getSessionUser(supabase);
      if (!user) return;
      const returnTo = buildReturnToUrl();
      const continueButton = document.querySelector('[data-goatpbn-continue]');
      renderMessage(config.selectors.messageBox, '이미 로그인되어 있습니다. 계속 진행해주세요.', 'info');
      if (continueButton) {
        continueButton.addEventListener('click', () => {
          window.location.href = returnTo;
        });
      }
    } catch (err) {
      console.warn('로그인 상태 확인 실패:', err);
    }
  };

  const init = async () => {
    if (!ok) {
      renderMessage(config.selectors.messageBox, `설정 누락: ${missing.join(', ')}`, 'error');
    }
    const loginButton = document.querySelector('[data-goatpbn-login]');
    if (loginButton) loginButton.addEventListener('click', handleLogin);
    await handleAlreadyLoggedIn();
  };

  return { init, handleLogin };
};

// 한글 주석: 전역 초기화
const controller = createLoginController(window.GOATPBN_CHECKOUT_CONFIG || {});
window.GoatPbnLogin = {
  init: controller.init,
  login: controller.handleLogin
};

document.addEventListener('DOMContentLoaded', () => {
  controller.init().catch((err) => console.error('login init 실패:', err));
});
