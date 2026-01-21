// v1.0 - goatpbn.com 결제 설정 점검 CLI (2026.01.20)
// 기능 요약: 운영 전 필수 설정 키 체크 안내 출력
// 사용 예시: node tools/validate-config.js

const REQUIRED_KEYS = ['supabaseUrl', 'supabaseAnonKey', 'tossClientKey', 'apiBaseUrl'];

// 한글 주석: 간단한 CLI 실행 진입점
const run = () => {
  console.log('GoatPBN Checkout 설정 점검');
  console.log('- 필수 설정 키:', REQUIRED_KEYS.join(', '));
  console.log('- WordPress 페이지 상단에 window.GOATPBN_CHECKOUT_CONFIG를 설정하세요.');
};

if (require.main === module) {
  run();
}
