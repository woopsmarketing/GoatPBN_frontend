// v1.0 - /ko 로그인 페이지 추가 (2025.11.17)
// 기능 요약: 한국어 로그인 화면을 /ko 경로에서 제공

import LoginPageTemplate from '@/components/auth/LoginPageTemplate';

export default function KoLoginPage() {
  return <LoginPageTemplate locale="ko" />;
}

