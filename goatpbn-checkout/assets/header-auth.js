// v1.2 - goatpbn.com 헤더 로그인 위젯 스크립트 (2026.01.21)
// 기능 요약: Supabase 로그인 여부에 따라 헤더 메뉴를 토글하고 로그아웃을 처리
// 사용 예시: <script type="module" src="/assets/header-auth.js?v=1"></script>

import {
  resolveConfig,
  validateConfigWithKeys,
  getSessionFromAnyStorage,
  signOutFromAllStorages,
  bindSsoLinks
} from './utils.js?v=11';

const createHeaderAuthController = (userConfig = {}, deps = {}) => {
  const config = resolveConfig(userConfig);
  const { ok, missing } = validateConfigWithKeys(config, ['supabaseUrl', 'supabaseAnonKey']);
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
      const redirectUrl = config.logoutRedirectUrl || config.homeUrl || window.location.origin;
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
