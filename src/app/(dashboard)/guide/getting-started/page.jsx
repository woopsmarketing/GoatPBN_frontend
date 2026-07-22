'use client';

// v1.0 - 온보딩 가이드 페이지 (2025.11.24)
// 기능 요약: 신규 사용자가 서비스 사용 흐름을 빠르게 이해할 수 있도록 단계별 안내 제공

import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import { useDashboardLocale } from '@/contexts/DashboardLocaleContext';

const GUIDE_CONTENT = {
  ko: {
    heroTitle: '🚀 GOATPBN 시작 가이드',
    heroDescription: '처음 오셨나요? 아래 순서대로 따라 하면 연동부터 캠페인 실행, 모니터링까지 한 번에 완료할 수 있어요.',
    primaryCta: '대시보드로 돌아가기',
    sections: [
      {
        title: '1. 사이트 연결하기',
        description: '워드프레스 사이트 정보를 등록하면 GOATPBN이 콘텐츠를 자동으로 발행할 수 있는 준비가 끝납니다.',
        bullets: [
          '대시보드 > 사이트 추가에서 워드프레스 URL과 앱 비밀번호를 입력합니다.',
          '연결 테스트로 API 접근 권한과 인증 정보를 확인합니다.',
          '여러 사이트를 동시에 운영할 경우 미리 모두 등록해 두면 캠페인 배포가 편해집니다.'
        ],
        actionLabel: '사이트 추가로 이동'
      },
      {
        title: '2. 캠페인 생성하기',
        description: '타겟 사이트, 키워드, 생성 수량과 기간 등을 설정하면 GOATPBN이 자동으로 콘텐츠 및 백링크를 배포합니다.',
        bullets: [
          '자동/수동 사이트 분배를 선택하고, 타겟 URL과 키워드를 입력합니다.',
          '생성 수량과 기간을 입력하면 일일 생성 목표가 자동으로 계산됩니다.',
          '캠페인을 저장하면 준비 상태가 되고, 예약 시간이 되면 자동으로 실행됩니다.'
        ],
        actionLabel: '캠페인 생성으로 이동'
      },
      {
        title: '3. 모니터링 & 최적화',
        description:
          '실행 중인 캠페인은 통계와 로그에서 실시간으로 확인할 수 있어요. 실패 로그나 크레딧 사용량을 확인하고 즉시 대응하세요.',
        bullets: [
          '통계 페이지에서 일별/캠페인별 진행률과 성공률을 확인합니다.',
          '로그 페이지에서 생성된 콘텐츠, 성공/실패 내역, 오류 메시지를 추적할 수 있습니다.',
          '알림 센터(우측 상단 벨 아이콘)에서 관리자 공지 및 주요 이벤트를 확인하세요.'
        ],
        actionLabel: '통계 보기'
      }
    ],
    quickHelp: {
      title: '추가로 알아두면 좋아요',
      tips: [
        '⏰ 매일 00:00 ~ 00:30(KST)은 시스템 점검 시간으로 콘텐츠 생성이 일시 중단됩니다.',
        '⚡ 일일 최대 처리량은 1,000 링크입니다. 여러 캠페인이 있을 경우 우선순위로 처리돼요.',
        '📨 관리자 알림은 우측 상단 알림 벨에서 실시간으로 확인할 수 있습니다.'
      ]
    },
    faq: {
      title: '자주 묻는 질문',
      items: [
        {
          question: '연결 테스트가 실패하면 어떻게 하나요?',
          answer:
            '워드프레스 앱 비밀번호와 API 접근 권한을 다시 확인해 주세요. 그래도 해결되지 않으면 support@goatpbn.com 으로 로그와 함께 문의해 주세요.'
        },
        {
          question: '캠페인을 중간에 중지할 수 있나요?',
          answer: '캠페인 상세 페이지에서 상태를 “중지(Paused)”로 변경하면 새로운 콘텐츠 발행이 멈춥니다. 언제든지 다시 활성화할 수 있어요.'
        },
        {
          question: '크레딧 사용량은 어디에서 확인하나요?',
          answer:
            '통계 페이지의 크레딧 섹션에서 남은 크레딧과 예상 소진일을 확인할 수 있습니다. 부족할 경우 관리자에게 추가 충전을 요청해 주세요.'
        }
      ]
    }
  },
  en: {
    heroTitle: '🚀 Getting Started with GOATPBN',
    heroDescription:
      'New here? Follow the steps below to connect your sites, launch campaigns, and monitor performance without missing anything.',
    primaryCta: 'Back to dashboard',
    sections: [
      {
        title: '1. Connect your WordPress sites',
        description: 'Register the WordPress credentials so GOATPBN can publish content automatically on your behalf.',
        bullets: [
          'Go to Dashboard > Add Site and enter the WordPress URL with an App Password.',
          'Run the connection test to verify API access and credentials.',
          'If you manage multiple sites, connect them all now for seamless campaign distribution.'
        ],
        actionLabel: 'Go to Add Site'
      },
      {
        title: '2. Create your first campaign',
        description: 'Define target URLs, keywords, and volume/duration. GOATPBN will generate and distribute content automatically.',
        bullets: [
          'Choose automatic or manual site distribution, then add your target URL and keywords.',
          'Specify total quantity and duration to automatically calculate daily posting goals.',
          'Save the campaign; it will run automatically once the scheduled start time is reached.'
        ],
        actionLabel: 'Go to Create Campaign'
      },
      {
        title: '3. Monitor & optimize',
        description: 'Track active campaigns in real-time via statistics and logs. Quickly react to failures or credit usage spikes.',
        bullets: [
          'Use the Statistics page to review daily progress, success rate, and campaign health.',
          'Visit the Logs page to audit published content, failures, and error messages.',
          'Keep an eye on the notification bell for admin announcements and critical events.'
        ],
        actionLabel: 'Open Statistics'
      }
    ],
    quickHelp: {
      title: 'Pro tips',
      tips: [
        '⏰ Daily maintenance window: 00:00 – 00:30 (KST). Content generation pauses temporarily.',
        '⚡ Daily throughput limit is 1,000 links. When multiple campaigns run, jobs are prioritized automatically.',
        '📨 Check the notification bell (top-right) for admin updates and important alerts.'
      ]
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          question: 'The connection test failed. What should I do?',
          answer:
            'Double-check your WordPress App Password and API permissions. If it persists, email support@goatpbn.com with the error log.'
        },
        {
          question: 'Can I pause a running campaign?',
          answer: 'Yes. Change the campaign status to “Paused” to stop new posts. You can resume anytime by switching it back to “Active”.'
        },
        {
          question: 'Where can I check credit consumption?',
          answer:
            'The Statistics page shows remaining credits and the estimated depletion date. Contact the admin team if you need more credits.'
        }
      ]
    }
  }
};

export default function GettingStartedGuidePage() {
  const router = useRouter();
  const { locale } = useDashboardLocale();
  const isEnglish = locale === 'en';
  const content = GUIDE_CONTENT[isEnglish ? 'en' : 'ko'];

  const localizePath = useMemo(() => {
    return (path) => (isEnglish ? `/en${path}` : path);
  }, [isEnglish]);

  return (
    <div className="space-y-6">
      <MainCard>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold text-gray-900">{content.heroTitle}</h1>
          <p className="text-gray-600 text-lg">{content.heroDescription}</p>
          <div className="flex gap-3 flex-wrap mt-2">
            <TailwindButton variant="primary" className="px-8 py-3 text-lg" onClick={() => router.push(localizePath('/campaigns/create'))}>
              {isEnglish ? 'Start with a new campaign' : '새 캠페인으로 시작하기'}
            </TailwindButton>
            <TailwindButton variant="secondary" className="px-6 py-3 text-lg" onClick={() => router.push(localizePath('/dashboard'))}>
              {content.primaryCta}
            </TailwindButton>
          </div>
        </div>
      </MainCard>

      {content.sections.map((section, index) => (
        <MainCard key={section.title}>
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="md:w-2/3 space-y-3">
              <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
              <p className="text-gray-600 leading-relaxed">{section.description}</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
            <div className="md:w-1/3">
              <TailwindButton
                fullWidth
                variant="ghost"
                onClick={() => router.push(localizePath(['/sites/add', '/campaigns/create', '/statistics'][index]))}
              >
                {section.actionLabel}
              </TailwindButton>
            </div>
          </div>
        </MainCard>
      ))}

      <MainCard>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">{content.quickHelp.title}</h2>
          <div className="space-y-2 text-gray-700">
            {content.quickHelp.tips.map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </div>
        </div>
      </MainCard>

      <MainCard>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">{content.faq.title}</h2>
          <div className="space-y-4">
            {content.faq.items.map((item) => (
              <div key={item.question} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900">{item.question}</h3>
                <p className="text-gray-700 mt-2 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-500">
            {isEnglish ? (
              <>
                Need more help? Email{' '}
                <Link href="mailto:support@goatpbn.com" className="text-primary-500 underline">
                  support@goatpbn.com
                </Link>
                , message us on Telegram&nbsp;
                <Link href="https://t.me/goat82" target="_blank" className="text-primary-500 underline">
                  @goat82
                </Link>{' '}
                or reach the admin team via Slack.
              </>
            ) : (
              <>
                추가 도움이 필요하시면{' '}
                <Link href="mailto:support@goatpbn.com" className="text-primary-500 underline">
                  support@goatpbn.com
                </Link>
                으로 메일을 보내거나 텔레그램&nbsp;
                <Link href="https://t.me/goat82" target="_blank" className="text-primary-500 underline">
                  @goat82
                </Link>
                로 문의해 주세요. Slack 관리자 채널로도 연락 가능합니다.
              </>
            )}
          </div>
        </div>
      </MainCard>
    </div>
  );
}
