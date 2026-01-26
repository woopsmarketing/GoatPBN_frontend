// v0.2 - 라이브 키 안내 문구 추가 (2026.01.26)
// 기능 요약: WordPress에 올릴 정적 페이지의 환경 설정을 제공합니다.
// 사용 예시: window.GOATPBN_CONFIG.API_BASE_URL

// 한글 주석: 필요한 값을 실제 키/URL로 교체해주세요.
window.GOATPBN_CONFIG = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'public-anon-key',
  API_BASE_URL: 'https://app.goatpbn.com',
  TOSS_CLIENT_KEY: 'live_ck_LlDJaYngrojJW2wA2nnlVezGdRpX',
  TOSS_TENANT_KEY: 'tenant_key_goatpbn_ko',
  TOSS_CONFIRM_API: 'https://your-project.supabase.co/functions/v1/confirm',
  PLAN_CONFIG: {
    basic: { amount: 20000, orderName: 'GoatPBN Basic 1개월' },
    pro: { amount: 50000, orderName: 'GoatPBN Pro 1개월' }
  },
  APP_REDIRECT_URL: 'https://app.goatpbn.com/ko/subscription',
  DEFAULT_LOCALE: 'ko',
  ALWAYS_SHOW_CHECKOUT: false
};
