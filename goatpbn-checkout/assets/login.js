// v1.6 - /en 기본 리다이렉트 보강 (2026.01.23)
// 기능 요약: Google OAuth + 이메일/비밀번호 로그인/회원가입 지원
// 사용 예시: <script type="module" src="/assets/login.js"></script>

import {
  resolveConfig,
  validateConfigWithKeys,
  createSupabaseClient,
  getSessionFromAnyStorage,
  parseQuery,
  renderMessage,
  buildSsoUrl,
  resolveLocale
} from './utils.js?v=13';

// 한글 주석: 의존성 주입을 고려한 로그인 컨트롤러
const createLoginController = (userConfig = {}, deps = {}) => {
  const config = resolveConfig(userConfig);
  const { ok, missing } = validateConfigWithKeys(config, ['supabaseUrl', 'supabaseAnonKey']);
  let supabaseClient = null;
  const supabaseClientMap = {};
  const locale = resolveLocale();
  const localeTextMap = {
    ko: {
      pageTitleLogin: 'GoatPBN 로그인',
      pageTitleSignup: 'GoatPBN 회원가입',
      title: '로그인',
      subtitle: '로그인 후 결제를 진행하세요.',
      googleLogin: '3초 구글로 로그인',
      googleSignup: '3초 구글로 회원가입',
      dividerLogin: '또는 이메일 로그인',
      dividerSignup: '또는 이메일 회원가입',
      emailLabel: '이메일',
      emailPlaceholder: 'email@goatpbn.com',
      passwordLabel: '비밀번호',
      passwordPlaceholder: '비밀번호를 입력하세요',
      passwordConfirmLabel: '비밀번호 확인',
      passwordConfirmPlaceholder: '비밀번호를 다시 입력하세요',
      rememberLabel: '로그인 유지',
      loginButton: '로그인',
      signupButton: '회원가입',
      noAccount: '아직 계정이 없나요?',
      haveAccount: '이미 계정이 있나요?',
      signupLink: '회원가입',
      loginLink: '로그인',
      loggedTitle: '이미 로그인되어 있습니다',
      loggedButton: '계속 진행하기',
      loggedMessage: (email) => `${email} 계정으로 이미 로그인되어 있습니다.`
    },
    en: {
      pageTitleLogin: 'GoatPBN Sign in',
      pageTitleSignup: 'GoatPBN Sign up',
      title: 'Sign in',
      subtitle: 'Sign in to continue.',
      googleLogin: 'Sign in with Google',
      googleSignup: 'Sign up with Google',
      dividerLogin: 'Or sign in with email',
      dividerSignup: 'Or sign up with email',
      emailLabel: 'Email',
      emailPlaceholder: 'email@goatpbn.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      passwordConfirmLabel: 'Confirm password',
      passwordConfirmPlaceholder: 'Re-enter your password',
      rememberLabel: 'Keep me signed in',
      loginButton: 'Sign in',
      signupButton: 'Sign up',
      noAccount: 'New to GOATPBN?',
      haveAccount: 'Already have an account?',
      signupLink: 'Sign up',
      loginLink: 'Sign in',
      loggedTitle: 'You are already signed in',
      loggedButton: 'Continue',
      loggedMessage: (email) => `You are already signed in as ${email}.`
    }
  };
  const localeMessageMap = {
    ko: {
      missingConfig: (items) => `설정 누락: ${items.join(', ')}`,
      loginFailed: '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.',
      emailPasswordRequired: '이메일과 비밀번호를 입력해주세요.',
      signupRequired: '회원가입 정보를 모두 입력해주세요.',
      passwordMismatch: '비밀번호가 일치하지 않습니다.',
      signupRequested: '회원가입 요청이 완료되었습니다. 이메일 인증 후 다시 로그인해주세요.',
      signupFailed: '회원가입에 실패했습니다.'
    },
    en: {
      missingConfig: (items) => `Missing config: ${items.join(', ')}`,
      loginFailed: 'Login failed. Please try again.',
      emailPasswordRequired: 'Please enter your email and password.',
      signupRequired: 'Please fill in all signup fields.',
      passwordMismatch: 'Passwords do not match.',
      signupRequested: 'Signup request submitted. Please verify your email and sign in again.',
      signupFailed: 'Signup failed. Please try again.'
    }
  };

  // 한글 주석: locale 텍스트 테이블을 반환합니다.
  const getLocaleTexts = () => localeTextMap[locale] || localeTextMap.ko;
  const getLocaleMessages = () => localeMessageMap[locale] || localeMessageMap.ko;

  // 한글 주석: data-goatpbn-i18n 속성 기반으로 문구를 교체합니다.
  const applyLocaleTexts = () => {
    if (typeof document === 'undefined') return;
    const texts = getLocaleTexts();
    document.documentElement.setAttribute('lang', locale);
    const isSignupPage = !!document.querySelector('[data-goatpbn-signup-form]') && !document.querySelector('[data-goatpbn-login-form]');
    document.title = isSignupPage ? texts.pageTitleSignup : texts.pageTitleLogin;
    document.querySelectorAll('[data-goatpbn-i18n]').forEach((el) => {
      const key = el.getAttribute('data-goatpbn-i18n');
      if (key && texts[key]) el.textContent = texts[key];
    });
    document.querySelectorAll('[data-goatpbn-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-goatpbn-i18n-placeholder');
      if (key && texts[key]) el.setAttribute('placeholder', texts[key]);
    });
  };

  // 한글 주석: locale에 맞게 로그인/회원가입 링크를 업데이트합니다.
  const applyLocaleLinks = () => {
    if (typeof document === 'undefined') return;
    if (locale !== 'en') return;
    const loginLink = document.querySelector('[data-goatpbn-login-link]');
    const signupLink = document.querySelector('[data-goatpbn-signup-link]');
    const applyLangParam = (link) => {
      if (!link) return;
      try {
        const url = new URL(link.getAttribute('href') || '', window.location.origin);
        if (!url.searchParams.get('lang')) {
          url.searchParams.set('lang', 'en');
        }
        link.setAttribute('href', url.toString());
      } catch (err) {
        console.warn('로그인/회원가입 링크 갱신 실패:', err);
      }
    };
    applyLangParam(loginLink);
    applyLangParam(signupLink);
  };

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
      // 한글 주석: 영어 페이지에서 기본 리다이렉트에는 lang=en을 추가합니다.
      if (!rawReturnTo && locale === 'en' && !target.searchParams.get('lang')) {
        target.searchParams.set('lang', 'en');
      }
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

  // 한글 주석: 외부 도메인 이동 시 SSO 토큰을 붙인 URL을 생성합니다.
  const buildSsoReturnUrl = async (returnTo) => {
    try {
      if (!returnTo) return returnTo;
      if (typeof window === 'undefined') return returnTo;
      const target = new URL(returnTo);
      if (target.origin === window.location.origin) return returnTo;
      const { session } = await getSessionFromAnyStorage(config, deps);
      if (!session?.access_token) return returnTo;
      return buildSsoUrl(returnTo, session);
    } catch (err) {
      console.warn('SSO return_to 생성 실패:', err);
      return returnTo;
    }
  };

  // 한글 주석: 로그인 버튼 클릭 시 OAuth를 시작합니다.
  const handleLogin = async () => {
    if (!ok) {
      const messages = getLocaleMessages();
      renderMessage(config.selectors.messageBox, messages.missingConfig(missing), 'error');
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
      const messages = getLocaleMessages();
      renderMessage(config.selectors.messageBox, messages.loginFailed, 'error');
    }
  };

  // 한글 주석: 이메일/비밀번호 로그인 처리
  const handleEmailLogin = async (event) => {
    event.preventDefault();
    if (!ok) {
      const messages = getLocaleMessages();
      renderMessage(config.selectors.messageBox, messages.missingConfig(missing), 'error');
      return;
    }

    const emailInput = document.querySelector('[data-goatpbn-email]');
    const passwordInput = document.querySelector('[data-goatpbn-password]');
    const email = emailInput?.value?.trim() || '';
    const password = passwordInput?.value?.trim() || '';

    if (!email || !password) {
      const messages = getLocaleMessages();
      renderMessage(config.selectors.messageBox, messages.emailPasswordRequired, 'error');
      return;
    }

    try {
      const supabase = await getSupabaseForAuth(getRememberMe());
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const returnTo = buildReturnToUrl();
      const ssoReturnTo = await buildSsoReturnUrl(returnTo);
      window.location.href = ssoReturnTo;
    } catch (err) {
      console.error('이메일 로그인 실패:', err);
      const messages = getLocaleMessages();
      renderMessage(config.selectors.messageBox, err?.message || messages.loginFailed, 'error');
    }
  };

  // 한글 주석: 이메일/비밀번호 회원가입 처리
  const handleEmailSignup = async (event) => {
    event.preventDefault();
    if (!ok) {
      const messages = getLocaleMessages();
      renderMessage(config.selectors.messageBox, messages.missingConfig(missing), 'error');
      return;
    }

    const emailInput = document.querySelector('[data-goatpbn-signup-email]');
    const passwordInput = document.querySelector('[data-goatpbn-signup-password]');
    const confirmInput = document.querySelector('[data-goatpbn-signup-password-confirm]');
    const email = emailInput?.value?.trim() || '';
    const password = passwordInput?.value?.trim() || '';
    const confirmPassword = confirmInput?.value?.trim() || '';

    if (!email || !password || !confirmPassword) {
      const messages = getLocaleMessages();
      renderMessage(config.selectors.messageBox, messages.signupRequired, 'error');
      return;
    }

    if (password !== confirmPassword) {
      const messages = getLocaleMessages();
      renderMessage(config.selectors.messageBox, messages.passwordMismatch, 'error');
      return;
    }

    try {
      const supabase = await getSupabaseForAuth(getRememberMe());
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: buildReturnToUrl() }
      });
      if (error) throw error;
      if (data?.session) {
        const returnTo = buildReturnToUrl();
        const ssoReturnTo = await buildSsoReturnUrl(returnTo);
        window.location.href = ssoReturnTo;
        return;
      }
      const messages = getLocaleMessages();
      renderMessage(config.selectors.messageBox, messages.signupRequested, 'info');
    } catch (err) {
      console.error('회원가입 실패:', err);
      const messages = getLocaleMessages();
      renderMessage(config.selectors.messageBox, err?.message || messages.signupFailed, 'error');
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
      const finalReturnTo = await buildSsoReturnUrl(returnTo);
      const shouldAutoContinue =
        storedReturnTo &&
        (storedReturnTo.includes('auto_checkout=1') || storedReturnTo.includes('auto_coupon=1') || storedReturnTo.includes('coupon='));
      const continueButton = document.querySelector('[data-goatpbn-continue]');
      const loggedMessage = document.querySelector('[data-goatpbn-logged-message]');
      if (shouldAutoContinue) {
        clearStoredReturnTo();
        window.location.href = finalReturnTo;
        return;
      }

      if (loginView) loginView.classList.add('hidden');
      if (loggedView) loggedView.classList.remove('hidden');
      if (loggedMessage) {
        const displayName = user?.email || 'user';
        const texts = getLocaleTexts();
        loggedMessage.textContent = texts.loggedMessage(displayName);
      }
      if (continueButton) {
        continueButton.addEventListener('click', () => {
          clearStoredReturnTo();
          window.location.href = finalReturnTo;
        });
      }
    } catch (err) {
      console.warn('로그인 상태 확인 실패:', err);
    }
  };

  const init = async () => {
    if (!ok) {
      const messages = getLocaleMessages();
      renderMessage(config.selectors.messageBox, messages.missingConfig(missing), 'error');
    }
    applyLocaleTexts();
    applyLocaleLinks();
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
