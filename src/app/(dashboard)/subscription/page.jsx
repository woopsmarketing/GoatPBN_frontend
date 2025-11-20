'use client';

// v1.0 - 구독 관리 페이지 (2025.11.20)
// 기능 요약: Supabase subscriptions 테이블과 연동하여 현재 플랜/크레딧 잔여량을 표시

import { useEffect, useMemo, useState } from 'react';

import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import { authAPI, supabase } from '@/lib/supabase';
import { formatToUserTimeZone } from '@/lib/utils/userTimeZone';

const PLAN_LABELS = {
  free: '무료 플랜',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  enterprise: 'Enterprise',
  custom: '맞춤 플랜'
};

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    let active = true;

    const loadSubscription = async () => {
      try {
        const { data: authData, error: authError } = await authAPI.getCurrentUser();
        if (authError) throw authError;
        const user = authData?.user;
        if (!user) {
          setError('로그인 정보를 찾을 수 없습니다.');
          return;
        }

        const { data, error: subError } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();

        if (subError) throw subError;
        if (active) {
          setSubscription(data);
        }
      } catch (err) {
        console.error('구독 정보 로드 실패:', err);
        if (active) {
          setError('구독 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSubscription();
    return () => {
      active = false;
    };
  }, []);

  const planLabel = useMemo(() => {
    if (!subscription?.plan) return '플랜 없음';
    return PLAN_LABELS[subscription.plan] || subscription.plan;
  }, [subscription]);

  const expiryLabel = useMemo(() => {
    if (!subscription?.expiry_date) return '무제한';
    return formatToUserTimeZone(subscription.expiry_date, { year: 'numeric', month: 'long', day: 'numeric' });
  }, [subscription]);

  const daysRemaining = useMemo(() => {
    if (!subscription?.expiry_date) return null;
    const end = new Date(subscription.expiry_date).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }, [subscription]);

  const credits = {
    total: subscription?.credits_total ?? 0,
    used: subscription?.credits_used ?? 0,
    remaining: subscription?.credits_remaining ?? 0
  };

  return (
    <div className="space-y-6">
      <MainCard title="구독 요약">
        {loading ? (
          <p className="text-sm text-gray-600">구독 정보를 불러오는 중입니다...</p>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : subscription ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">{planLabel}</h3>
              <p className="text-sm text-gray-600">
                {subscription.description ||
                  '플랜 설명이 아직 준비되지 않았습니다. 지원팀을 통해 맞춤 구성을 요청하실 수 있습니다.'}
              </p>
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <p>
                  상태: <span className="font-medium text-gray-900">{subscription.status}</span>
                </p>
                <p className="mt-2">
                  갱신/만료일: <span className="font-medium text-gray-900">{expiryLabel}</span>
                </p>
                {daysRemaining !== null && (
                  <p className="mt-1 text-xs text-gray-500">
                    남은 일수: <span className="font-semibold text-gray-700">{daysRemaining}일</span>
                  </p>
                )}
              </div>
              <TailwindButton size="lg" variant="secondary" onClick={() => window.open('https://totoggong.com/contact', '_blank')}>
                플랜 변경 문의
              </TailwindButton>
            </div>
            <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-3">
              <div className="space-y-1 rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">전체 크레딧</p>
                <p className="text-2xl font-bold text-blue-600">{credits.total.toLocaleString()}</p>
              </div>
              <div className="space-y-1 rounded-lg bg-purple-50 p-4 text-center">
                <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">사용한 크레딧</p>
                <p className="text-2xl font-bold text-purple-600">{credits.used.toLocaleString()}</p>
              </div>
              <div className="space-y-1 rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">남은 크레딧</p>
                <p className={`text-2xl font-bold ${credits.remaining <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {credits.remaining.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
            <p className="font-medium text-gray-900">아직 구독 정보가 없습니다.</p>
            <p className="mt-2">무료 플랜으로 시작하는 중이며, 크레딧이 부족하면 언제든지 업그레이드할 수 있습니다.</p>
            <TailwindButton className="mt-4" onClick={() => window.open('https://totoggong.com/contact', '_blank')}>
              상담 예약하기
            </TailwindButton>
          </div>
        )}
      </MainCard>
      <MainCard title="플랜 안내">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: 'Starter', description: '테스트용 소규모 자동화. 월 5~10개 캠페인 운영.' },
            { title: 'Growth', description: '트래픽 확장을 위한 추천 플랜. 백링크 자동화 + 크레딧 리포트 제공.' },
            { title: 'Pro', description: '에이전시 전용. 팀 협업, API 사용량 확대, 자동화 워크플로우 지원.' },
            { title: 'Enterprise', description: '맞춤형 엔터프라이즈 플랜. SLA, 전용 지원, 커스텀 통합 제공.' }
          ].map((plan) => (
            <div key={plan.title} className="rounded-xl border border-gray-200 p-5 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">{plan.title}</h4>
              <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
            </div>
          ))}
        </div>
      </MainCard>
    </div>
  );
}
