/**
 * SFN 캠페인 상세 페이지 — Phase 4-A.
 *
 * 캠페인 메타 + sfn_publish_jobs 표 + 상태 토글.
 * /sfn/campaigns/[id] 라우트.
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import MainCard from '../../../../../components/MainCard';
import TailwindButton from '../../../../../components/ui/TailwindButton';
import { sfnCampaignsAPI, sfnJobsAPI } from '../../../../../features/sfn/api';

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

async function fetchCampaignDetail(campaignId) {
  if (!campaignId) return { campaign: null, jobs: [] };
  const [{ data: c, error: ce }, { data: js }] = await Promise.all([
    sfnCampaignsAPI.getById(campaignId),
    sfnJobsAPI.listByCampaign(campaignId, { limit: 50 })
  ]);
  if (ce) throw new Error(ce.message || '캠페인을 불러오지 못했습니다.');
  return { campaign: c, jobs: js || [] };
}

function normalizeUrl(raw) {
  const s = (raw || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

export default function SfnCampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id;
  const [toggling, setToggling] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [savingUrls, setSavingUrls] = useState(false);
  const [urlMsg, setUrlMsg] = useState('');

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    campaignId ? ['/sfn/campaign-detail', campaignId] : null,
    () => fetchCampaignDetail(campaignId),
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      dedupingInterval: 20000
    }
  );

  const campaign = data?.campaign || null;
  const jobs = data?.jobs || [];
  const loading = isLoading || isValidating;
  const errorMsg = error?.message || '';
  const load = () => mutate();
  const setCampaign = (next) => mutate({ ...(data || { jobs: [] }), campaign: next }, { revalidate: false });

  const handleToggle = async () => {
    if (!campaign) return;
    const next = campaign.status === 'active' ? 'paused' : 'active';
    setToggling(true);
    const { data, error } = await sfnCampaignsAPI.setStatus(campaign.id, next);
    setToggling(false);
    if (error) {
      alert('상태 변경 실패: ' + (error.message || '오류'));
      return;
    }
    setCampaign(data);
  };

  const spintaxUrls = campaign?.spintax?.urls || [];

  const saveUrls = async (nextUrls) => {
    if (!campaign) return;
    setSavingUrls(true);
    setUrlMsg('');
    const { data, error } = await sfnCampaignsAPI.updateSpintaxConfig(campaign.id, { urls: nextUrls });
    setSavingUrls(false);
    if (error) {
      setUrlMsg(error.message || '저장 실패');
      return;
    }
    setCampaign(data);
    setUrlMsg('저장되었습니다. 이후 발행되는 글부터 반영됩니다.');
  };

  const handleAddUrls = async () => {
    const parsed = urlInput
      .split(/[\n,\s]+/)
      .map((u) => normalizeUrl(u))
      .filter(Boolean);
    if (parsed.length === 0) {
      setUrlMsg(urlInput.trim() ? '올바른 URL 형식이 아닙니다 (http:// 또는 https:// 포함).' : '');
      return;
    }
    const merged = Array.from(new Set([...spintaxUrls, ...parsed]));
    setUrlInput('');
    await saveUrls(merged);
  };

  const handleRemoveUrl = async (u) => {
    if (spintaxUrls.length <= 1) {
      setUrlMsg('타겟 URL은 최소 1개 이상이어야 합니다.');
      return;
    }
    await saveUrls(spintaxUrls.filter((x) => x !== u));
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
        <TailwindButton variant="secondary" size="sm" onClick={() => router.push('/sfn/campaigns')}>
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
        <TailwindButton variant="secondary" size="sm" onClick={() => router.push('/sfn/campaigns')}>
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
              <div className="text-lg font-semibold truncate flex items-center gap-1.5">
                {campaign.spintax ? (
                  <span className="inline-block text-[10px] font-medium bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 shrink-0">
                    스핀택스
                  </span>
                ) : null}
                <span className="truncate">{campaign.name || '(이름 없음)'}</span>
              </div>
              {campaign.spintax ? (
                <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                  <div>
                    템플릿: <span className="font-mono">{campaign.spintax.template}</span> · 발행{' '}
                    {campaign.spintax.publish_status === 'draft' ? '초안' : '공개'}
                    {campaign.spintax.include_image === false ? '' : ' · 대표이미지 O'}
                    {campaign.spintax.single_target === false ? ' · 링크 혼합' : ' · 한 글=한 사이트'}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(campaign.spintax.urls || []).map((u) => (
                      <span key={u} className="font-mono bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5">
                        {u}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 mt-0.5">
                  target: <span className="font-mono">{campaign.targetUrl}</span>
                </div>
              )}
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

      {campaign.spintax ? (
        <MainCard>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold">타겟 URL (백링크 대상) — {spintaxUrls.length}개</div>
              <div className="text-xs text-gray-400">진행 중에도 추가/삭제 가능 · 이후 글부터 반영</div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {spintaxUrls.map((u) => (
                <span
                  key={u}
                  className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded text-xs font-mono"
                >
                  {u}
                  <button
                    type="button"
                    onClick={() => handleRemoveUrl(u)}
                    disabled={savingUrls || spintaxUrls.length <= 1}
                    className="text-emerald-400 hover:text-red-500 leading-none disabled:opacity-40"
                    aria-label={`${u} 삭제`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUrls();
                  }
                }}
                disabled={savingUrls}
                className="flex-1 border rounded px-3 py-2 text-sm font-mono"
                placeholder="https://example.com/  (여러 개는 콤마·줄바꿈·공백으로 구분)"
              />
              <TailwindButton type="button" variant="primary" onClick={handleAddUrls} disabled={savingUrls || !urlInput.trim()}>
                {savingUrls ? '저장 중…' : '추가'}
              </TailwindButton>
            </div>
            {urlMsg ? <div className="text-xs text-gray-500">{urlMsg}</div> : null}
          </div>
        </MainCard>
      ) : null}

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
                          {j.post_url ? (
                            <a
                              href={j.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline truncate inline-block max-w-[18rem]"
                            >
                              {j.post_url.replace(/^https?:\/\//, '')}
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
