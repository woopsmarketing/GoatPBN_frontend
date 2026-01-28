// v1.1 - goatpbn.com 결제 실패 안내 스크립트 (2026.01.21)
// 기능 요약: 실패 사유를 표시하고 재시도 경로를 제공합니다.
// 사용 예시: <script type="module" src="/assets/fail.js"></script>

// v1.1 - utils 버전 갱신 및 SSO 토큰 정리 반영 (2026.01.28)
// 기능 요약: 결제 실패 메시지 표시
import { resolveConfig, parseQuery } from './utils.js?v=18';

const createFailController = (userConfig = {}) => {
  const config = resolveConfig(userConfig);

  const init = () => {
    const query = parseQuery();
    const code = query?.code || 'UNKNOWN';
    const message = query?.message || '결제가 취소되었거나 실패했습니다.';
    const detailEl = document.querySelector('[data-goatpbn-fail-detail]');
    if (detailEl) {
      detailEl.textContent = `code: ${code} / message: ${message}`;
    }

    const retryButton = document.querySelector('[data-goatpbn-retry]');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        window.location.href = config.pricingUrl;
      });
    }
  };

  return { init };
};

const controller = createFailController(window.GOATPBN_CHECKOUT_CONFIG || {});
window.GoatPbnFail = {
  init: controller.init
};

document.addEventListener('DOMContentLoaded', () => {
  controller.init();
});
