// v1.6 - 영문 페이지 메뉴 링크 보정 (2026.01.29)
// 기능 요약: Supabase 로그인 여부에 따라 헤더 메뉴를 토글하고 영문 링크를 보정
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
} from './utils.js?v=18';

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

  // 한글 주석: 헤더 인증 영역 링크인지 확인합니다.
  const isHeaderAuthLink = (link) => {
    if (!link) return false;
    return !!link.closest('[data-goatpbn-header-guest], [data-goatpbn-header-logged]');
  };

  // 한글 주석: 언어별 헤더 메뉴 링크를 안전하게 보정합니다.
  const normalizeEnglishNavHref = (rawHref) => {
    try {
      if (!rawHref || !isEnglish) return rawHref;
      const url = new URL(rawHref, window.location.origin);
      if (url.origin !== window.location.origin) return rawHref;

      const pathname = url.pathname || '/';
      const lowerPath = pathname.toLowerCase();
      const needsLangParamPaths = ['/login', '/register', '/mypage'];

      if (needsLangParamPaths.some((path) => lowerPath.startsWith(path))) {
        return appendLangParam(url.toString());
      }

      if (pathname === '/' || pathname === '') {
        url.pathname = '/en/';
        return url.toString();
      }

      return rawHref;
    } catch (err) {
      console.warn('영문 메뉴 링크 보정 실패:', err);
      return rawHref;
    }
  };

  // 한글 주석: 헤더 영역의 메뉴 링크를 영어 페이지 기준으로 맞춥니다.
  const applyEnglishNavLinks = () => {
    if (!isEnglish || typeof document === 'undefined') return;
    const headerLinks = document.querySelectorAll('.elementor-location-header a[href], nav a[href]');
    if (!headerLinks.length) return;

    headerLinks.forEach((link) => {
      try {
        const rawHref = link.getAttribute('href') || '';
        if (!rawHref) return;
        if (isHeaderAuthLink(link)) return;
        if (rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) {
          return;
        }
        const nextHref = normalizeEnglishNavHref(rawHref);
        if (nextHref && nextHref !== rawHref) {
          link.setAttribute('href', nextHref);
        }
      } catch (err) {
        console.warn('헤더 메뉴 링크 처리 실패:', err);
      }
    });
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

  // 한글 주석: data-goatpbn-text 속성을 가진 요소들의 텍스트를 locale에 맞게 교체합니다.
  const applyLocaleTexts = () => {
    document.querySelectorAll('[data-goatpbn-text]').forEach((el) => {
      const key = el.getAttribute('data-goatpbn-text');
      if (key) {
        const text = resolveText(key);
        if (text) el.textContent = text;
      }
    });
  };

  const init = async () => {
    if (!ok) {
      console.warn('헤더 위젯 설정 누락:', missing.join(', '));
      return;
    }

    applyLocaleLinks();
    applyEnglishNavLinks(); // 한글 주석: 영어 페이지 메뉴 링크 보정
    applyLocaleTexts(); // 한글 주석: 다국어 텍스트 적용
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
