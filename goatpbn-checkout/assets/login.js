// v1.3 - goatpbn.com 로그인 페이지 스크립트 (2026.01.21)
// 기능 요약: Google OAuth + 이메일/비밀번호 로그인/회원가입 지원
// 사용 예시: <script type="module" src="/assets/login.js"></script>

import {
  resolveConfig,
  validateConfigWithKeys,
  createSupabaseClient,
  getSessionFromAnyStorage,
  parseQuery,
  renderMessage
} from './utils.js?v=11';

// 한글 주석: 의존성 주입을 고려한 로그인 컨트롤러
const createLoginController = (userConfig = {}, deps = {}) => {
  const config = resolveConfig(userConfig);
  const { ok, missing } = validateConfigWithKeys(config, ['supabaseUrl', 'supabaseAnonKey']);
  let supabaseClient = null;
  const supabaseClientMap = {};

  const getSupabase = async () => {
    if (supabaseClient) return supabaseClient;
    supabaseClient = await createSupabaseClient(config, deps);
    return supabaseClient;
  };

  // 한글 주석: 로그인 유지 옵션에 따라 저장소를 결정합니다.
  const resolveAuthStorage = (rememberMe) => {
    try {
      if (rememberMe && window.localStorage) return window.localStorage;
      if (!rememberMe && window.sessionStorage) return window.sessionStorage;
    } catch (err) {
      console.warn('스토리지 접근 실패:', err);
    }
    return window.localStorage;
  };

  // 한글 주석: 로그인용 Supabase 클라이언트를 생성(스토리지 옵션 반영)
  const getSupabaseForAuth = async (rememberMe) => {
    const key = rememberMe ? 'remember' : 'session';
    if (supabaseClientMap[key]) return supabaseClientMap[key];
    const storage = resolveAuthStorage(rememberMe);
    supabaseClientMap[key] = await createSupabaseClient(config, deps, {
      auth: {
        storage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return supabaseClientMap[key];
  };

  // 한글 주석: 로그인 유지 체크값을 읽어옵니다.
  const getRememberMe = () => {
    const checkbox = document.querySelector('[data-goatpbn-remember]');
    return checkbox ? checkbox.checked : true;
  };

  // 한글 주석: 로그인/회원가입 뷰를 전환합니다.
  const setViewMode = (view) => {
    const root = document.querySelector('[data-goatpbn-auth]');
    if (!root) return;
    const loginForm = root.querySelector('[data-goatpbn-login-form]');
    const signupForm = root.querySelector('[data-goatpbn-signup-form]');
    const loginTab = root.querySelector('[data-goatpbn-tab="login"]');
    const signupTab = root.querySelector('[data-goatpbn-tab="signup"]');
    const hasLoginForm = !!loginForm;
    const hasSignupForm = !!signupForm;
    if (!hasLoginForm && !hasSignupForm) return;
    let nextView = view === 'signup' ? 'signup' : 'login';
    if (!hasSignupForm) nextView = 'login';
    if (!hasLoginForm) nextView = 'signup';
    root.setAttribute('data-goatpbn-view', nextView);
    if (loginForm) loginForm.classList.toggle('is-hidden', nextView !== 'login');
    if (signupForm) signupForm.classList.toggle('is-hidden', nextView !== 'signup');
    if (loginTab) loginTab.classList.toggle('is-active', nextView === 'login');
    if (signupTab) signupTab.classList.toggle('is-active', nextView === 'signup');
  };

  // 한글 주석: 로그인 완료 후 이동할 URL을 생성합니다.
  const buildReturnToUrl = () => {
    const query = parseQuery();
    const rawReturnTo = query?.return_to;
    const plan = query?.plan || '';
    const shouldAutoCheckout = query?.auto_checkout === '1' || !!rawReturnTo || !!plan;
    try {
      const fallbackUrl = config.mypageUrl || config.pricingUrl || window.location.origin;
      const target = rawReturnTo ? new URL(rawReturnTo) : new URL(fallbackUrl);
      if (plan) target.searchParams.set('plan', plan);
      if (shouldAutoCheckout) target.searchParams.set('auto_checkout', '1');
      return target.toString();
    } catch (err) {
      console.warn('return_to 파싱 실패:', err);
      return config.mypageUrl || config.pricingUrl || window.location.origin;
    }
  };

  // 한글 주석: 로그인 후 돌아갈 URL을 저장합니다. (OAuth 리다이렉트 후 복원)
  const storeReturnTo = (url) => {
    try {
      if (!url) return;
      sessionStorage.setItem('goatpbn_return_to', url);
    } catch (err) {
      console.warn('return_to 저장 실패:', err);
    }
  };

  const readStoredReturnTo = () => {
    try {
      return sessionStorage.getItem('goatpbn_return_to') || '';
    } catch (err) {
      console.warn('return_to 읽기 실패:', err);
      return '';
    }
  };

  const clearStoredReturnTo = () => {
    try {
      sessionStorage.removeItem('goatpbn_return_to');
    } catch (err) {
      console.warn('return_to 삭제 실패:', err);
    }
  };

  // 한글 주석: 로그인 버튼 클릭 시 OAuth를 시작합니다.
  const handleLogin = async () => {
    if (!ok) {
      renderMessage(config.selectors.messageBox, `설정 누락: ${missing.join(', ')}`, 'error');
      return;
    }
    try {
      const supabase = await getSupabaseForAuth(getRememberMe());
      const returnTo = buildReturnToUrl();
      storeReturnTo(returnTo);
      let redirectTo = config.loginUrl || `${window.location.origin}/login`;
      try {
        const loginRedirect = new URL(redirectTo);
        loginRedirect.searchParams.set('return_to', returnTo);
        redirectTo = loginRedirect.toString();
      } catch (err) {
        console.warn('redirectTo 구성 실패:', err);
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true
        }
      });
      if (error) throw error;
      if (!data?.url) {
        throw new Error('OAuth URL 생성에 실패했습니다. Redirect URL을 확인해주세요.');
      }
      window.location.href = data.url;
    } catch (err) {
      console.error('로그인 실패:', err);
      renderMessage(config.selectors.messageBox, '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    }
  };

  // 한글 주석: 이메일/비밀번호 로그인 처리
  const handleEmailLogin = async (event) => {
    event.preventDefault();
    if (!ok) {
      renderMessage(config.selectors.messageBox, `설정 누락: ${missing.join(', ')}`, 'error');
      return;
    }

    const emailInput = document.querySelector('[data-goatpbn-email]');
    const passwordInput = document.querySelector('[data-goatpbn-password]');
    const email = emailInput?.value?.trim() || '';
    const password = passwordInput?.value?.trim() || '';

    if (!email || !password) {
      renderMessage(config.selectors.messageBox, '이메일과 비밀번호를 입력해주세요.', 'error');
      return;
    }

    try {
      const supabase = await getSupabaseForAuth(getRememberMe());
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = buildReturnToUrl();
    } catch (err) {
      console.error('이메일 로그인 실패:', err);
      renderMessage(config.selectors.messageBox, err?.message || '로그인에 실패했습니다.', 'error');
    }
  };

  // 한글 주석: 이메일/비밀번호 회원가입 처리
  const handleEmailSignup = async (event) => {
    event.preventDefault();
    if (!ok) {
      renderMessage(config.selectors.messageBox, `설정 누락: ${missing.join(', ')}`, 'error');
      return;
    }

    const emailInput = document.querySelector('[data-goatpbn-signup-email]');
    const passwordInput = document.querySelector('[data-goatpbn-signup-password]');
    const confirmInput = document.querySelector('[data-goatpbn-signup-password-confirm]');
    const email = emailInput?.value?.trim() || '';
    const password = passwordInput?.value?.trim() || '';
    const confirmPassword = confirmInput?.value?.trim() || '';

    if (!email || !password || !confirmPassword) {
      renderMessage(config.selectors.messageBox, '회원가입 정보를 모두 입력해주세요.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      renderMessage(config.selectors.messageBox, '비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    try {
      const supabase = await getSupabaseForAuth(getRememberMe());
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: buildReturnToUrl() }
      });
      if (error) throw error;
      renderMessage(config.selectors.messageBox, '회원가입 요청이 완료되었습니다. 이메일 인증 후 다시 로그인해주세요.', 'info');
    } catch (err) {
      console.error('회원가입 실패:', err);
      renderMessage(config.selectors.messageBox, err?.message || '회원가입에 실패했습니다.', 'error');
    }
  };

  // 한글 주석: 이미 로그인된 경우 안내 메시지를 보여줍니다.
  const handleAlreadyLoggedIn = async () => {
    try {
      const { user } = await getSessionFromAnyStorage(config, deps);
      // 한글 주석: OAuth 해시 토큰이 URL에 남아있으면 제거합니다.
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        try {
          const cleanUrl = `${window.location.pathname}${window.location.search}`;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (err) {
          console.warn('URL 해시 제거 실패:', err);
        }
      }
      const loginView = document.querySelector('[data-goatpbn-login-view]');
      const loggedView = document.querySelector('[data-goatpbn-logged-view]');
      if (!user) {
        if (loginView) loginView.classList.remove('hidden');
        if (loggedView) loggedView.classList.add('hidden');
        return;
      }

      const storedReturnTo = readStoredReturnTo();
      const returnTo = storedReturnTo || buildReturnToUrl();
      const shouldAutoContinue = storedReturnTo && storedReturnTo.includes('auto_checkout=1');
      const continueButton = document.querySelector('[data-goatpbn-continue]');
      const loggedMessage = document.querySelector('[data-goatpbn-logged-message]');
      if (shouldAutoContinue) {
        clearStoredReturnTo();
        window.location.href = returnTo;
        return;
      }

      if (loginView) loginView.classList.add('hidden');
      if (loggedView) loggedView.classList.remove('hidden');
      if (loggedMessage) {
        const displayName = user?.email || '사용자';
        loggedMessage.textContent = `${displayName} 계정으로 이미 로그인되어 있습니다.`;
      }
      if (continueButton) {
        continueButton.addEventListener('click', () => {
          clearStoredReturnTo();
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
    const tabButtons = document.querySelectorAll('[data-goatpbn-tab]');
    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const view = button.getAttribute('data-goatpbn-tab') || 'login';
        setViewMode(view);
      });
    });
    const loginForm = document.querySelector('[data-goatpbn-login-form]');
    if (loginForm) loginForm.addEventListener('submit', handleEmailLogin);
    const signupForm = document.querySelector('[data-goatpbn-signup-form]');
    if (signupForm) signupForm.addEventListener('submit', handleEmailSignup);
    const query = parseQuery();
    const initialView =
      document.querySelector('[data-goatpbn-auth]')?.getAttribute('data-goatpbn-view') ||
      query?.view ||
      query?.mode ||
      (query?.signup === '1' ? 'signup' : 'login');
    setViewMode(initialView);
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
