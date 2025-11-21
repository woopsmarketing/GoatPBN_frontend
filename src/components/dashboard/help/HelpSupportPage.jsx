'use client';

// v1.0 - 도움말 & 문의하기 페이지 공용 컴포넌트 (2025.11.21)
// 기능 요약: 온보딩 체크리스트와 지원 채널 안내를 묶어 차트 형태로 제공

import Link from 'next/link';

import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';

const CONTACT_LINK = 'https://totoggong.com/contact-us/';

const onboardingSteps = [
  {
    title: '1. 사이트 등록',
    description: '워드프레스 사이트 정보를 등록하고 연결 상태를 확인합니다.',
    action: { href: '/sites/add', label: '사이트 추가하러 가기' }
  },
  {
    title: '2. 캠페인 생성',
    description: '타겟 사이트와 키워드, 기간을 입력하고 자동 생성 일정을 설정합니다.',
    action: { href: '/campaigns/create', label: '캠페인 만들기' }
  },
  {
    title: '3. 진행 상황 모니터링',
    description: '로그와 사용량 대시보드를 통해 실시간으로 생성 현황을 확인합니다.',
    action: { href: '/logs', label: '로그 확인하기' }
  }
];

const supportChannels = [
  {
    title: '문서 & 가이드',
    description: '주요 기능별 설정 방법과 트러블슈팅 가이드 모음입니다.',
    link: { href: '/statistics', label: '대시보드 살펴보기' }
  },
  {
    title: '상담 요청',
    description: '상담 폼을 통해 플랜 변경, 기능 개선 제안 등을 남겨주세요.',
    link: { href: CONTACT_LINK, label: '상담 폼 열기', external: true }
  },
  {
    title: '긴급 지원',
    description: '콘텐츠 생성 실패, API 오류 등 빠른 조치가 필요한 경우 이메일을 이용하세요.',
    link: { href: 'mailto:contact@totoggong.com', label: '이메일 보내기', external: true }
  }
];

const faqs = [
  {
    question: '시간대 설정은 어디에서 변경하나요?',
    answer: '상단 프로필 > 설정 메뉴에서 자동 감지 토글과 함께 원하는 시간대를 직접 선택할 수 있습니다.'
  },
  {
    question: '크레딧이 부족할 때는 어떻게 해야 하나요?',
    answer: '구독 관리 페이지에서 현재 플랜과 잔여 크레딧을 확인하고, 상담 문의를 통해 상위 플랜으로 전환할 수 있습니다.'
  },
  {
    question: '캠페인 실패 로그는 어디서 확인하나요?',
    answer: '로그 페이지에서 상태가 실패로 표시된 항목을 필터링하고, 재시도 버튼으로 작업을 다시 실행할 수 있습니다.'
  }
];

export default function HelpSupportPage() {
  return (
    <div className="space-y-6">
      <MainCard title="도움말 & 문의하기">
        <div className="space-y-4 text-sm text-gray-600">
          <p>캠페인 시작에 필요한 기본 단계를 안내하고, 문제 발생 시 바로 연락할 수 있는 채널을 정리했습니다. 필요한 항목을 선택하여 빠르게 진행해 보세요.</p>
          <TailwindButton asChild size="lg" variant="primary">
            <Link href={CONTACT_LINK} target="_blank" rel="noopener noreferrer">
              상담 폼 바로가기
            </Link>
          </TailwindButton>
        </div>
      </MainCard>

      <MainCard title="온보딩 체크리스트">
        <div className="grid gap-4 md:grid-cols-3">
          {onboardingSteps.map((step) => (
            <div key={step.title} className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.description}</p>
              <TailwindButton asChild variant="outline">
                <Link href={step.action.href}>{step.action.label}</Link>
              </TailwindButton>
            </div>
          ))}
        </div>
      </MainCard>

      <MainCard title="지원 채널 안내">
        <div className="grid gap-4 md:grid-cols-3">
          {supportChannels.map((channel) => (
            <div key={channel.title} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{channel.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{channel.description}</p>
              </div>
              <TailwindButton asChild variant={channel.link.external ? 'secondary' : 'ghost'} size="sm">
                <Link
                  href={channel.link.href}
                  target={channel.link.external ? '_blank' : undefined}
                  rel={channel.link.external ? 'noopener noreferrer' : undefined}
                >
                  {channel.link.label}
                </Link>
              </TailwindButton>
            </div>
          ))}
        </div>
      </MainCard>

      <MainCard title="자주 묻는 질문">
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-900">{faq.question}</h4>
              <p className="mt-2 text-sm text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </MainCard>
    </div>
  );
}
