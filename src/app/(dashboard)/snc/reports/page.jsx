/**
 * SNC 결과 보고서 — Phase 4-E.
 *
 * 사용자 소유 캠페인 + 잡을 종합 집계:
 *  - 핵심 KPI 카드 (총 발행, 성공률, 총 비용, 평균 품질)
 *  - 최근 7일 일별 발행 추이 (간단한 막대 그래프, lib 의존 없음)
 *  - 캠페인별 진행 현황 표
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '../../../../components/MainCard';
import TailwindButton from '../../../../components/ui/TailwindButton';
import { sncReportsAPI } from '../../../../features/snc/api';

const STATUS_LABEL = {
  active: '진행 중',
  paused: '일시정지',
  completed: '완료',
  draft: '초안'
};
const STATUS_COLOR = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  draft: 'bg-gray-100 text-gray-600'
};

function StatCard({ label, value, sub, accent }) {
  return (
    <MainCard>
      <div className="space-y-1">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-2xl font-semibold ${accent || ''}`}>{value}</div>
        {sub ? <div className="text-xs text-gray-400">{sub}</div> : null}
      </div>
    </MainCard>
  );
}

function shortDate(iso) {
  // iso: '2026-05-08' → '5/8 (목)'
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  const dows = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()} (${dows[d.getDay()]})`;
}

export default function SncReportsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    const { data: d, error } = await sncReportsAPI.summary();
    if (error) {
      setErrorMsg(error.message || '리포트를 불러오지 못했습니다.');
      setData(null);
    } else {
      setData(d);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dailyEntries = useMemo(() => {
    if (!data?.dailyCounts) return [];
    return Object.entries(data.dailyCounts).map(([date, count]) => ({ date, count }));
  }, [data]);

  const dailyMax = useMemo(() => {
    if (!dailyEntries.length) return 1;
    return Math.max(1, ...dailyEntries.map((e) => e.count));
  }, [dailyEntries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">SNC 결과 보고서</h1>
          <p className="text-sm text-gray-500 mt-0.5">사용자 소유 모든 캠페인의 발행 통계 집계 (최근 1000건 기준).</p>
        </div>
        <TailwindButton variant="secondary" size="sm" onClick={load} disabled={loading}>
          {loading ? '로딩 중…' : '새로고침'}
        </TailwindButton>
      </div>

      {errorMsg ? <div className="rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{errorMsg}</div> : null}

      {loading && !data ? (
        <div className="text-sm text-gray-500 py-12 text-center">리포트를 불러오는 중…</div>
      ) : !data ? (
        <div className="text-sm text-gray-500 py-12 text-center">데이터 없음</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="총 발행 시도" value={data.total.toLocaleString()} sub={`캠페인 ${data.campaigns.length}개`} />
            <StatCard label="발행 성공" value={data.posted.toLocaleString()} sub={`성공률 ${data.successRate}%`} accent="text-green-700" />
            <StatCard
              label="총 비용"
              value={`$${data.totalCost.toFixed(2)}`}
              sub={data.posted > 0 ? `평균 $${(data.totalCost / data.posted).toFixed(3)}/건` : '-'}
            />
            <StatCard label="평균 품질" value={data.avgQuality != null ? `${data.avgQuality}` : '-'} sub="quality_score 평균" />
          </div>

          <MainCard>
            <div className="space-y-3">
              <div className="text-base font-semibold">최근 7일 발행 추이 (posted)</div>
              <div className="grid grid-cols-7 gap-2">
                {dailyEntries.map(({ date, count }) => {
                  const heightPct = (count / dailyMax) * 100;
                  return (
                    <div key={date} className="flex flex-col items-center gap-1">
                      <div className="w-full h-24 bg-gray-50 rounded relative overflow-hidden flex items-end">
                        <div
                          className="w-full bg-blue-500 transition-all"
                          style={{ height: `${heightPct}%`, minHeight: count > 0 ? '4px' : 0 }}
                          title={`${date}: ${count}건`}
                        />
                      </div>
                      <div className="text-[11px] text-gray-500 text-center">{shortDate(date)}</div>
                      <div className="text-xs font-medium">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </MainCard>

          <MainCard>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold">캠페인별 진행 현황 ({data.byCampaign.length}개)</div>
              </div>
              {data.byCampaign.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">캠페인이 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 pr-2">캠페인</th>
                        <th className="py-2 pr-2">상태</th>
                        <th className="py-2 pr-2">진행률</th>
                        <th className="py-2 pr-2">총 잡</th>
                        <th className="py-2 pr-2">발행</th>
                        <th className="py-2 pr-2">실패</th>
                        <th className="py-2">생성일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byCampaign.map((c) => {
                        const pct = c.quantity > 0 ? Math.round((c.completed_count / c.quantity) * 100) : 0;
                        const cls = STATUS_COLOR[c.status] || STATUS_COLOR.draft;
                        return (
                          <tr key={c.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 pr-2">
                              <button
                                type="button"
                                onClick={() => router.push(`/snc/campaigns/${c.id}`)}
                                className="text-blue-600 hover:underline truncate max-w-[14rem] inline-block text-left"
                              >
                                {c.name || '(이름 없음)'}
                              </button>
                            </td>
                            <td className="py-2 pr-2">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>
                                {STATUS_LABEL[c.status] || c.status}
                              </span>
                            </td>
                            <td className="py-2 pr-2 whitespace-nowrap">
                              {c.completed_count} / {c.quantity} <span className="text-gray-400">({pct}%)</span>
                            </td>
                            <td className="py-2 pr-2">{c.totalJobs}</td>
                            <td className="py-2 pr-2 text-green-700">{c.postedJobs}</td>
                            <td className="py-2 pr-2 text-red-600">{c.failedJobs}</td>
                            <td className="py-2 whitespace-nowrap text-gray-500">{(c.created_at || '').slice(0, 10)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </MainCard>
        </>
      )}
    </div>
  );
}
