/**
 * SNC 로그 페이지 — Phase 4-D.
 *
 * 사용자 소유 모든 캠페인의 잡 통합 리스트. 상태 필터 + 새로고침.
 * 상세 정보가 필요하면 캠페인명 클릭 → 캠페인 상세로 이동.
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import MainCard from '../../../../components/MainCard';
import TailwindButton from '../../../../components/ui/TailwindButton';
import { sncJobsAPI } from '../../../../features/snc/api';

const STATUS_LABEL = {
  posted: '발행됨',
  failed: '실패',
  generating: '생성 중',
  queued: '대기',
  dead: '재시도 한도'
};

const STATUS_COLOR = {
  posted: 'text-green-700 bg-green-50 border-green-200',
  failed: 'text-red-700 bg-red-50 border-red-200',
  generating: 'text-blue-700 bg-blue-50 border-blue-200',
  queued: 'text-gray-700 bg-gray-50 border-gray-200',
  dead: 'text-orange-700 bg-orange-50 border-orange-200'
};

function StatusPill({ status }) {
  const cls = STATUS_COLOR[status] || STATUS_COLOR.queued;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-medium ${cls}`}>
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
    return String(iso).slice(0, 16);
  }
}

function elapsedMin(start, end) {
  if (!start) return null;
  const a = new Date(start).getTime();
  const b = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 60000);
}

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'posted', label: '발행됨' },
  { key: 'generating', label: '생성 중' },
  { key: 'failed', label: '실패' },
  { key: 'dead', label: '재시도 한도' }
];

async function fetchJobs() {
  const { data, error } = await sncJobsAPI.listAllForUser({ limit: 200 });
  if (error) throw new Error(error.message || '잡 목록을 불러오지 못했습니다.');
  return data || [];
}

export default function SncLogsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');

  // SWR — 60초마다 자동 갱신, 창 포커스 시 갱신, 30초 내 중복 요청 합침
  const {
    data: jobs = [],
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR('/snc/logs', fetchJobs, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    dedupingInterval: 30000
  });

  const errorMsg = error?.message || '';
  const loading = isLoading || isValidating;

  const filtered = useMemo(() => {
    if (filter === 'all') return jobs;
    return jobs.filter((j) => j.status === filter);
  }, [jobs, filter]);

  const stats = useMemo(() => {
    const acc = { total: jobs.length, posted: 0, failed: 0, generating: 0, queued: 0, dead: 0 };
    for (const j of jobs) {
      acc[j.status] = (acc[j.status] || 0) + 1;
    }
    return acc;
  }, [jobs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">SNC 로그</h1>
          <p className="text-sm text-gray-500 mt-0.5">최근 200건 발행 잡을 통합 표시합니다.</p>
        </div>
        <TailwindButton variant="secondary" size="sm" onClick={() => mutate()} disabled={loading}>
          {loading ? '로딩 중…' : '새로고침'}
        </TailwindButton>
      </div>

      {errorMsg ? <div className="rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{errorMsg}</div> : null}

      <MainCard>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  filter === f.key ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.label}
                <span className="ml-1 text-[11px] opacity-80">{f.key === 'all' ? stats.total : stats[f.key] || 0}</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">{loading ? '로딩 중…' : '표시할 잡이 없습니다.'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-2">상태</th>
                    <th className="py-2 pr-2">캠페인</th>
                    <th className="py-2 pr-2">키워드</th>
                    <th className="py-2 pr-2">사이트</th>
                    <th className="py-2 pr-2">시작</th>
                    <th className="py-2 pr-2">소요</th>
                    <th className="py-2 pr-2">품질</th>
                    <th className="py-2 pr-2">비용</th>
                    <th className="py-2">결과</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((j) => {
                    const elapsed = elapsedMin(j.started_at, j.finished_at);
                    return (
                      <tr key={j.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 pr-2">
                          <StatusPill status={j.status} />
                        </td>
                        <td className="py-2 pr-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/snc/campaigns/${j.campaign_id}`)}
                            className="text-blue-600 hover:underline truncate max-w-[10rem] inline-block text-left"
                          >
                            {j.campaignName}
                          </button>
                        </td>
                        <td className="py-2 pr-2 max-w-[12rem] truncate">{j.keyword || '-'}</td>
                        <td className="py-2 pr-2 font-mono text-[11px]">{j.site_id || '-'}</td>
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
                            <span className="text-red-600 truncate inline-block max-w-[18rem]" title={j.error}>
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
