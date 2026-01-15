// v1.2 - 기본 구독 경로를 한국어 구독 페이지로 리다이렉트 (2026.01.15)
// 기능 요약: /subscription 요청을 /ko/subscription으로 리다이렉트
// 사용 예시: /subscription 접속 시 /ko/subscription으로 이동

import { redirect } from 'next/navigation';

export default function SubscriptionPage() {
  // 한글 주석: 기본 경로는 한국어 구독 페이지로 즉시 이동합니다.
  redirect('/ko/subscription');
}
