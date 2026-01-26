// v1.4 - app 도메인 정규화 추가 (2026.01.23)
// 기능 요약: Supabase 로그인 여부에 따라 헤더 메뉴를 토글하고 로그아웃을 처리
// 사용 예시: <script type="module" src="/assets/header-auth.js?v=1"></script>

import {
  resolveConfig,
  validateConfigWithKeys,
  getSessionFromAnyStorage,
  signOutFromAllStorages,
  bindSsoLinks,
  resolveLocale,
  isEnglishLocale,
  normalizeAppUrl
} from './utils.js?v=15';

const createHeaderAuthController = (userConfig = {}, deps = {}) => {
  const config = resolveConfig(userConfig);
  const { ok, missing } = validateConfigWithKeys(config, ['supabaseUrl', 'supabaseAnonKey']);
  const locale = resolveLocale();
  const isEnglish = isEnglishLocale();
  const localeTextMap = {
    ko: {
      login: '로그인',
      signup: '회원가입',
      mypage: '마이페이지',
      dashboard: '대시보드',
      logout: '로그아웃'
    },
    en: {
      login: 'Login',
      signup: 'Sign up',
      mypage: 'My page',
      dashboard: 'Dashboard',
      logout: 'Logout'
    }
  };

  // 한글 주석: 언어별 텍스트를 반환합니다.
  const resolveText = (key) => {
    const table = localeTextMap[locale] || localeTextMap.ko;
    return table?.[key] || '';
  };

  // 한글 주석: URL에 lang 파라미터를 붙입니다(영문 페이지 전용).
  const appendLangParam = (url) => {
    try {
      if (!isEnglish) return url;
      const parsed = new URL(url, window.location.origin);
      if (!parsed.searchParams.get('lang')) {
        parsed.searchParams.set('lang', 'en');
      }
      return parsed.toString();
    } catch (err) {
      console.warn('lang 파라미터 추가 실패:', err);
      return url;
    }
  };

  // 한글 주석: locale에 맞는 대시보드 URL을 계산합니다.
  const resolveDashboardUrl = () => {
    if (isEnglish) {
      return normalizeAppUrl(config.appDashboardUrlEn || 'https://app.goatpbn.com/en/dashboard');
    }
    return normalizeAppUrl(config.appDashboardUrlKo || 'https://app.goatpbn.com/ko/dashboard');
  };

  // 한글 주석: locale에 맞는 홈 URL을 계산합니다.
  const resolveHomeUrl = () => {
    if (isEnglish) {
      try {
        return new URL('/en/', config.homeUrl || window.location.origin).toString();
      } catch (err) {
        console.warn('홈 URL 생성 실패:', err);
      }
    }
    return config.homeUrl || window.location.origin;
  };

  // 한글 주석: locale에 맞는 링크/라벨을 설정합니다.
  const applyLocaleLinks = () => {
    const loginLink = document.querySelector('[data-goatpbn-login-link]');
    const signupLink = document.querySelector('[data-goatpbn-signup-link]');
    const mypageLink = document.querySelector('[data-goatpbn-mypage-link]');
    const dashboardLink = document.querySelector('[data-goatpbn-dashboard-link]');
    const logoutButton = document.querySelector('[data-goatpbn-logout]');

    if (loginLink) {
      loginLink.textContent = resolveText('login');
      loginLink.setAttribute('href', appendLangParam(config.loginUrl || 'https://goatpbn.com/login'));
    }
    if (signupLink) {
      signupLink.textContent = resolveText('signup');
      signupLink.setAttribute('href', appendLangParam(config.signupUrl || 'https://goatpbn.com/register'));
    }
    if (mypageLink) {
      mypageLink.textContent = resolveText('mypage');
      mypageLink.setAttribute('href', appendLangParam(config.mypageUrl || 'https://goatpbn.com/mypage'));
    }
    if (dashboardLink) {
      dashboardLink.textContent = resolveText('dashboard');
      const dashboardUrl = resolveDashboardUrl();
      dashboardLink.setAttribute('href', dashboardUrl);
      dashboardLink.setAttribute('data-goatpbn-target', dashboardUrl);
    }
    if (logoutButton) {
      logoutButton.textContent = resolveText('logout');
    }
  };
  // 한글 주석: DOM 텍스트 업데이트 유틸
  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  };

  // 한글 주석: 로그인/비로그인 상태에 따라 메뉴를 토글합니다.
  const toggleViews = (isLoggedIn) => {
    const loggedInView = document.querySelector('[data-goatpbn-header-logged]');
    const loggedOutView = document.querySelector('[data-goatpbn-header-guest]');
    if (loggedInView) {
      loggedInView.classList.toggle('hidden', !isLoggedIn);
      loggedInView.classList.toggle('goatpbn-hidden', !isLoggedIn);
    }
    if (loggedOutView) {
      loggedOutView.classList.toggle('hidden', isLoggedIn);
      loggedOutView.classList.toggle('goatpbn-hidden', isLoggedIn);
    }
  };

  // 한글 주석: 로그아웃 처리 후 홈으로 이동합니다.
  const handleLogout = async () => {
    try {
      await signOutFromAllStorages(config, deps);
      toggleViews(false);
      setText('[data-goatpbn-user-email]', '');
      const redirectUrl = config.logoutRedirectUrl || resolveHomeUrl();
      window.location.href = redirectUrl;
    } catch (err) {
      console.error('로그아웃 실패:', err);
    }
  };

  const init = async () => {
    if (!ok) {
      console.warn('헤더 위젯 설정 누락:', missing.join(', '));
      return;
    }

    applyLocaleLinks();
    const logoutButton = document.querySelector('[data-goatpbn-logout]');
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);

    try {
      const { user } = await getSessionFromAnyStorage(config, deps);
      if (!user) {
        toggleViews(false);
        return;
      }
      toggleViews(true);
      setText('[data-goatpbn-user-email]', user.email || '사용자');
      await bindSsoLinks(config, deps);
    } catch (err) {
      console.warn('헤더 로그인 상태 확인 실패:', err);
    }
  };

  return { init };
};

const controller = createHeaderAuthController(window.GOATPBN_CHECKOUT_CONFIG || {});
document.addEventListener('DOMContentLoaded', () => {
  controller.init().catch((err) => console.error('header auth init 실패:', err));
});
