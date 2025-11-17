// v1.1 - 다국어 로그인 템플릿 사용 (2025.11.17)
// 기능 요약: /auth/login 경로에서 한국어 로그인 화면 제공

import LoginPageTemplate from '@/components/auth/LoginPageTemplate';

export default function LoginPage() {
  return <LoginPageTemplate locale="ko" />;
}
