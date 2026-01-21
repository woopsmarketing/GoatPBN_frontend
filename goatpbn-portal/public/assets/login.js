// v0.1 - 로그인 페이지 로직 (2026.01.20)
// 기능 요약: 구글 로그인 및 로그인 상태에 따른 리다이렉트를 처리합니다.
// 사용 예시: /login.html?return_to=/checkout/pricing.html&plan=basic&autoPay=1

const initLoginPage = () => {
  try {
    bindLoginButton();
    handleExistingSession();
  } catch (err) {
    const message = err instanceof Error ? err.message : '로그인 페이지 초기화 중 오류가 발생했습니다.';
    showError(message);
  }
};

// 한글 주석: 로그인 버튼 이벤트를 연결합니다.
const bindLoginButton = () => {
  const loginButton = document.querySelector('#google-login-button');
  if (!loginButton) return;
  loginButton.addEventListener('click', async () => {
    try {
      clearMessages();
      setStatus('구글 로그인으로 이동 중입니다...');
      const redirectTo = window.location.origin + window.location.pathname + window.location.search;
      await GoatAuth.signInWithGoogle(redirectTo);
    } catch (err) {
      const message = err instanceof Error ? err.message : '구글 로그인 요청에 실패했습니다.';
      showError(message);
    }
  });
};

// 한글 주석: 이미 로그인된 사용자는 즉시 다음 단계로 이동합니다.
const handleExistingSession = async () => {
  const user = await GoatAuth.getCurrentUser();
  if (!user) return;
  setStatus('이미 로그인되어 있습니다. 이동 중입니다...');
  redirectToNext();
};

// 한글 주석: 로그인 완료 후 이동할 URL을 계산합니다.
const buildNextUrl = () => {
  const returnTo = GoatUtils.getQueryParam('return_to');
  const plan = GoatUtils.getQueryParam('plan');
  const autoPay = GoatUtils.getQueryParam('autoPay');

  const sanitized = GoatUtils.sanitizeReturnTo(returnTo);
  const basePath = GoatUtils.getBasePath();
  const defaultPath = `${basePath}/pricing.html`;
  const nextUrl = new URL(window.location.origin + (sanitized || defaultPath));

  if (plan) nextUrl.searchParams.set('plan', plan);
  if (autoPay === '1') nextUrl.searchParams.set('autoPay', '1');
  return nextUrl.toString();
};

// 한글 주석: 다음 페이지로 이동합니다.
const redirectToNext = () => {
  const nextUrl = buildNextUrl();
  window.location.href = nextUrl;
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
  GoatUtils.setText('#status-message', '');
  GoatUtils.setText('#error-message', '');
};

// 한글 주석: DOM 로드 후 초기화합니다.
document.addEventListener('DOMContentLoaded', initLoginPage);
