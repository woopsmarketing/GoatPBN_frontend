// v1.0 - /en 로그인 페이지 추가 (2025.11.17)
// 기능 요약: 영어 로그인 화면을 /en 경로에서 제공

import LoginPageTemplate from '@/components/auth/LoginPageTemplate';

export default function EnLoginPage() {
  return <LoginPageTemplate locale="en" />;
}

