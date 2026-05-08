/**
 * SNC 캠페인 상세 페이지 — Phase 4-A.
 *
 * 캠페인 메타 + snc_publish_jobs 표 + 상태 토글.
 * /snc/campaigns/[id] 라우트.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainCard from '../../../../../components/MainCard';
import TailwindButton from '../../../../../components/ui/TailwindButton';
import { sncCampaignsAPI, sncJobsAPI } from '../../../../../features/snc/api';

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

const JOB_STATUS_COLOR = {
  posted: 'text-green-700 bg-green-50',
  failed: 'text-red-700 bg-red-50',
  generating: 'text-blue-700 bg-blue-50',
  queued: 'text-gray-700 bg-gray-50',
  dead: 'text-orange-700 bg-orange-50'
};

function StatusBadge({ status }) {
  const cls = STATUS_COLOR[status] || STATUS_COLOR.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${cls}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function fmtTime(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso.slice(0, 16);
  }
}

function elapsedMin(start, end) {
  if (!start) return null;
  const a = new Date(start).getTime();
  const b = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 60000);
}

export default function SncCampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id;

  const [campaign, setCampaign] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setErrorMsg('');
    const [{ data: c, error: ce }, { data: js, error: je }] = await Promise.all([
      sncCampaignsAPI.getById(campaignId),
      sncJobsAPI.listByCampaign(campaignId, { limit: 50 })
    ]);
    if (ce) setErrorMsg(ce.message || '캠페인을 불러오지 못했습니다.');
    else setCampaign(c);
    if (je) console.error('jobs load error', je);
    setJobs(js || []);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async () => {
    if (!campaign) return;
    const next = campaign.status === 'active' ? 'paused' : 'active';
    setToggling(true);
    const { data, error } = await sncCampaignsAPI.setStatus(campaign.id, next);
    setToggling(false);
    if (error) {
      alert('상태 변경 실패: ' + (error.message || '오류'));
      return;
    }
    setCampaign(data);
  };

  const stat = jobs.reduce(
    (acc, j) => {
      acc.total += 1;
      acc[j.status] = (acc[j.status] || 0) + 1;
      return acc;
    },
    { total: 0 }
  );

  if (loading && !campaign) {
    return <div className="text-sm text-gray-500 py-12 text-center">캠페인을 불러오는 중…</div>;
  }
  if (errorMsg && !campaign) {
    return (
      <div className="space-y-4">
        <TailwindButton variant="secondary" size="sm" onClick={() => router.push('/snc/campaigns')}>
          ← 목록으로
        </TailwindButton>
        <div className="rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{errorMsg}</div>
      </div>
    );
  }
  if (!campaign) return null;

  const isActive = campaign.status === 'active';
  const isPaused = campaign.status === 'paused';
  const canToggle = isActive || isPaused;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <TailwindButton variant="secondary" size="sm" onClick={() => router.push('/snc/campaigns')}>
          ← 목록으로
        </TailwindButton>
        <TailwindButton variant="secondary" size="sm" onClick={load} disabled={loading}>
          {loading ? '로딩 중…' : '새로고침'}
        </TailwindButton>
      </div>

      <MainCard>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-semibold truncate">{campaign.name || '(이름 없음)'}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                target: <span className="font-mono">{campaign.targetUrl}</span> · 앵커: {campaign.externalAnchor || '-'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={campaign.status} />
              <TailwindButton variant={isActive ? 'warning' : 'success'} size="sm" disabled={!canToggle || toggling} onClick={handleToggle}>
                {toggling ? '변경 중…' : isActive ? '일시정지' : '시작'}
              </TailwindButton>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="border rounded px-2 py-1.5">
              <div className="text-gray-500">진행률</div>
              <div className="font-medium">
                {campaign.completedCount} / {campaign.quantity}
                {campaign.quantity > 0 ? ` (${Math.round((campaign.completedCount / campaign.quantity) * 100)}%)` : ''}
              </div>
            </div>
            <div className="border rounded px-2 py-1.5">
              <div className="text-gray-500">오늘 발행</div>
              <div className="font-medium">
                {campaign.dailyExecutionCount}
                {campaign.quantity > 0 && campaign.duration > 0
                  ? ` / ${Math.ceil((campaign.quantity - campaign.completedCount) / Math.max(1, campaign.duration))}`
                  : ''}
              </div>
            </div>
            <div className="border rounded px-2 py-1.5">
              <div className="text-gray-500">사이트</div>
              <div className="font-medium">{campaign.selectedSites.length}개</div>
            </div>
            <div className="border rounded px-2 py-1.5">
              <div className="text-gray-500">다음 발행</div>
              <div className="font-medium">{campaign.nextExecutionAt ? fmtTime(campaign.nextExecutionAt) : '대기 없음'}</div>
            </div>
          </div>

          {campaign.selectedSites.length > 0 && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">대상 사이트: </span>
              {campaign.selectedSites.map((s) => (
                <span key={s} className="inline-block bg-gray-100 px-1.5 py-0.5 rounded mr-1 font-mono">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </MainCard>

      <MainCard>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold">발행 잡 ({stat.total}건)</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {Object.entries(stat)
                  .filter(([k]) => k !== 'total')
                  .map(([k, v]) => `${STATUS_LABEL[k] || k} ${v}`)
                  .join(' · ') || '아직 실행된 잡이 없습니다'}
              </div>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              아직 발행된 잡이 없습니다. 캠페인이 active 상태이면 다음 스케줄 시간에 자동 시작됩니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-2">상태</th>
                    <th className="py-2 pr-2">키워드</th>
                    <th className="py-2 pr-2">시작</th>
                    <th className="py-2 pr-2">소요</th>
                    <th className="py-2 pr-2">품질</th>
                    <th className="py-2 pr-2">비용</th>
                    <th className="py-2">결과</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => {
                    const cls = JOB_STATUS_COLOR[j.status] || 'text-gray-700 bg-gray-50';
                    const elapsed = elapsedMin(j.started_at, j.finished_at);
                    return (
                      <tr key={j.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 pr-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>{j.status}</span>
                        </td>
                        <td className="py-2 pr-2 max-w-[14rem] truncate">{j.keyword || '-'}</td>
                        <td className="py-2 pr-2 whitespace-nowrap">{fmtTime(j.started_at)}</td>
                        <td className="py-2 pr-2 whitespace-nowrap">{elapsed != null ? `${elapsed}분` : '-'}</td>
                        <td className="py-2 pr-2">{j.quality_score ?? '-'}</td>
                        <td className="py-2 pr-2 whitespace-nowrap">{j.cost_usd != null ? `$${Number(j.cost_usd).toFixed(3)}` : '-'}</td>
                        <td className="py-2">
                          {j.snc_post_url ? (
                            <a
                              href={j.snc_post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline truncate inline-block max-w-[18rem]"
                            >
                              {j.snc_post_url.replace(/^https?:\/\//, '')}
                            </a>
                          ) : j.error ? (
                            <span className="text-red-600 truncate inline-block max-w-[20rem]" title={j.error}>
                              {j.error}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </MainCard>
    </div>
  );
}
