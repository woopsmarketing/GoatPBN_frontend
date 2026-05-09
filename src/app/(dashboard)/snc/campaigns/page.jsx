/**
 * SNC (Next.js PBN) 캠페인 목록 페이지 — Phase 4 격리 개발 버전.
 *
 * 운영 코드 미수정 (CLAUDE.md 격리 개발 원칙). 검증 후 통합 위치로 승격.
 *
 * 기능 (최소):
 *  - snc_campaigns 리스트 카드 표시
 *  - active ⇌ paused 토글
 *  - 진행률(completed_count / quantity), 오늘 발행 카운트, 다음 스케줄 시간 표시
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import MainCard from '../../../../components/MainCard';
import TailwindButton from '../../../../components/ui/TailwindButton';
import { sncCampaignsAPI } from '../../../../features/snc/api';

const STATUS_LABEL = {
  active: '진행 중',
  paused: '일시정지',
  completed: '완료',
  draft: '초안'
};

const STATUS_COLOR = {
  active: 'bg-green-100 text-green-700 border-green-200',
  paused: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  draft: 'bg-gray-100 text-gray-600 border-gray-200'
};

function StatusBadge({ status }) {
  const cls = STATUS_COLOR[status] || STATUS_COLOR.draft;
  const label = STATUS_LABEL[status] || status;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${cls}`}>{label}</span>;
}

function ProgressBar({ completed, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>진행률</span>
        <span>
          {completed} / {total} ({pct}%)
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded">
        <div className="h-2 bg-blue-500 rounded transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CampaignCard({ campaign, onToggle, isToggling, onOpen }) {
  const isActive = campaign.status === 'active';
  const isPaused = campaign.status === 'paused';
  const canToggle = isActive || isPaused;
  const nextLabel = isActive ? '일시정지' : '시작';
  const nextStatus = isActive ? 'paused' : 'active';

  return (
    <MainCard sx={{ height: '100%' }}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={() => onOpen(campaign)} className="min-w-0 text-left flex-1 hover:text-blue-600 transition-colors">
            <div className="text-base font-semibold truncate">{campaign.name || '(이름 없음)'}</div>
            <div className="text-xs text-gray-500 truncate mt-0.5">target: {campaign.targetUrl || '-'}</div>
          </button>
          <StatusBadge status={campaign.status} />
        </div>

        <ProgressBar completed={campaign.completedCount} total={campaign.quantity || 0} />

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between border rounded px-2 py-1">
            <span className="text-gray-500">오늘 발행</span>
            <span className="font-medium">{campaign.dailyExecutionCount}</span>
          </div>
          <div className="flex justify-between border rounded px-2 py-1">
            <span className="text-gray-500">사이트</span>
            <span className="font-medium">{campaign.selectedSites.length}개</span>
          </div>
          <div className="flex justify-between border rounded px-2 py-1">
            <span className="text-gray-500">기간</span>
            <span className="font-medium">{campaign.duration ? `${campaign.duration}일` : '-'}</span>
          </div>
          <div className="flex justify-between border rounded px-2 py-1">
            <span className="text-gray-500">남은 일수</span>
            <span className="font-medium">{campaign.remainingDays != null ? `${campaign.remainingDays}일` : '-'}</span>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <TailwindButton
            variant={isActive ? 'warning' : 'success'}
            size="sm"
            disabled={!canToggle || isToggling}
            onClick={() => onToggle(campaign, nextStatus)}
          >
            {isToggling ? '변경 중…' : nextLabel}
          </TailwindButton>
        </div>
      </div>
    </MainCard>
  );
}

async function fetchCampaigns() {
  const { data, error } = await sncCampaignsAPI.list();
  if (error) throw new Error(error.message || '캠페인 목록을 불러오지 못했습니다.');
  return data || [];
}

export default function SncCampaignsPage() {
  const router = useRouter();
  const [togglingId, setTogglingId] = useState(null);

  const {
    data: campaigns = [],
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR('/snc/campaigns', fetchCampaigns, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    dedupingInterval: 20000
  });

  const errorMsg = error?.message || '';
  const loading = isLoading || isValidating;
  const load = () => mutate();
  const setCampaigns = (updater) => {
    if (typeof updater === 'function') {
      mutate(updater(campaigns), { revalidate: false });
    } else {
      mutate(updater, { revalidate: false });
    }
  };

  const handleToggle = async (campaign, nextStatus) => {
    setTogglingId(campaign.id);
    const { data, error } = await sncCampaignsAPI.setStatus(campaign.id, nextStatus);
    setTogglingId(null);
    if (error) {
      alert('상태 변경 실패: ' + (error.message || '알 수 없는 오류'));
      return;
    }
    setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? data : c)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Next.js PBN 캠페인</h1>
          <p className="text-sm text-gray-500 mt-0.5">SNC 파이프라인 기반 자동 발행 캠페인 관리 (격리 개발 버전)</p>
        </div>
        <div className="flex items-center gap-2">
          <TailwindButton variant="primary" size="sm" onClick={() => router.push('/snc/campaigns/create')}>
            + 새 캠페인
          </TailwindButton>
          <TailwindButton variant="secondary" size="sm" onClick={load} disabled={loading}>
            {loading ? '로딩 중…' : '새로고침'}
          </TailwindButton>
        </div>
      </div>

      {errorMsg ? <div className="rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{errorMsg}</div> : null}

      {loading && campaigns.length === 0 ? (
        <div className="text-sm text-gray-500 py-12 text-center">캠페인을 불러오는 중…</div>
      ) : !loading && campaigns.length === 0 ? (
        <MainCard>
          <div className="py-10 text-center text-gray-500">
            <p className="text-base">아직 생성된 SNC 캠페인이 없습니다.</p>
            <p className="text-xs mt-2">캠페인 생성 UI는 다음 단계에서 추가됩니다.</p>
          </div>
        </MainCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onToggle={handleToggle}
              isToggling={togglingId === c.id}
              onOpen={(camp) => router.push(`/snc/campaigns/${camp.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
