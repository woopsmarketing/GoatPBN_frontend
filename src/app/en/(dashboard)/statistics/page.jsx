'use client';

/*
 * 📈 Statistics Page (EN)
 * 캠페인별 진행률·기간별 추이·키워드·사이트 현황을 영어 UI로 제공
 * 사용 예: /en/statistics
 */
// v1.0 - 통계 페이지 영어 버전 작성 (2025.11.13)

import { useMemo, useState, useEffect } from 'react';
import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import { campaignsAPI } from '@/lib/api/campaigns';
import { buildApiUrl } from '@/lib/api/httpClient';
import { authAPI } from '@/lib/supabase';

// 간단한 도넛(원형 진행) 컴포넌트 - 외부 라이브러리 없이 SVG로 구현
function Donut({ value = 0, size = 96, stroke = 10, color = '#3B82F6' }) {
  // value: 0~100
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-gray-900 text-sm font-semibold">
        {value}%
      </text>
    </svg>
  );
}
export default function StatisticsPageEn() {
  // 상태 관리
  const [statisticsData, setStatisticsData] = useState({
    overview: {
      totalCampaigns: 0,
      activeCampaigns: 0,
      completedCampaigns: 0,
      pausedCampaigns: 0,
      totalContentGenerated: 0,
      successRate: 0
    },
    campaignProgress: [],
    topKeywords: [],
    sitePerformance: [],
    dailyTrend: [],
    successFailureRatio: { success: 0, failure: 0 },
    isLoading: true
  });

  // 통계 데이터 로드
  const loadStatisticsData = async () => {
    try {
      setStatisticsData((prev) => ({ ...prev, isLoading: true }));

      const result = await campaignsAPI.getDetailedStatistics();

      if (result.error) {
        console.error('Failed to load statistics data:', result.error);
        setStatisticsData((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      if (!result.data) {
        console.error('Statistics data is empty');
        setStatisticsData((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      setStatisticsData({
        ...result.data,
        isLoading: false
      });
    } catch (error) {
      console.error('Statistics data load exception:', error);
      setStatisticsData((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadStatisticsData();
  }, []);

  // KPI 개요
  const overview = statisticsData.overview;

  // 최근 30일 데이터 (API에서 가져온 데이터 사용)
  const dailyData = useMemo(() => {
    const data = statisticsData.dailyTrend || [];

    // 오늘 날짜 확인 (간소화)
    const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const todayInClientTZ = new Date(now.toLocaleString('en-US', { timeZone: clientTimeZone }));
    const todayStr = todayInClientTZ.toISOString().split('T')[0];

    // 오늘 데이터 확인 (필요시에만 로그)
    const todayData = data.find((d) => d.date === todayStr);
    if (todayData && (todayData.success > 0 || todayData.failure > 0)) {
      console.log('📊 Today summary:', { date: todayStr, success: todayData.success, failure: todayData.failure });
    }

    return data;
  }, [statisticsData.dailyTrend]);

  // 최근 12개월 데이터 생성 (dailyTrend에서 집계) - 클라이언트 시간대 기준
  const monthlyData = useMemo(() => {
    const data = [];

    // 클라이언트 시간대 기준으로 오늘 날짜 계산
    const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const todayInClientTZ = new Date(now.toLocaleString('en-US', { timeZone: clientTimeZone }));
    const today = new Date(todayInClientTZ.getFullYear(), todayInClientTZ.getMonth(), todayInClientTZ.getDate());

    // 월별 데이터 생성 (간소화)
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // dailyTrend에서 해당 월의 데이터 집계
      const monthLogs = (statisticsData.dailyTrend || []).filter((day) => day.date.startsWith(month));

      const success = monthLogs.reduce((sum, day) => sum + (day.success || 0), 0);
      const failed = monthLogs.reduce((sum, day) => sum + (day.failure || 0), 0);
      const generated = success + failed;

      data.push({
        month,
        total: generated,
        success,
        failed
      });
    }

    return data;
  }, [statisticsData.dailyTrend]);

  const [range, setRange] = useState('daily');

  // 성공/실패 집계 (API 데이터 사용)
  const successFail = useMemo(() => {
    const ratio = statisticsData.successFailureRatio || { success: 0, failure: 0 };
    const total = ratio.success + ratio.failure;
    const successRate = total > 0 ? Math.round((ratio.success / total) * 100) : 0;
    const failRate = total > 0 ? Math.round((ratio.failure / total) * 100) : 0;

    return {
      success: ratio.success,
      failure: ratio.failure,
      successRate,
      failRate
    };
  }, [statisticsData.successFailureRatio]);

  // 사이트별 현황 집계 (API 데이터 사용)
  const siteStatus = useMemo(() => {
    const sites = statisticsData.sitePerformance || [];
    // 실제 사이트 데이터에서 연결 상태 확인 (totalPublished > 0이면 연결됨으로 간주)
    const connected = sites.filter((s) => (s.totalPublished || 0) > 0).length;
    const disconnected = sites.length - connected;
    return { connected, disconnected, total: sites.length };
  }, [statisticsData.sitePerformance]);

  // 사이트별 콘텐츠 발행 현황 (API 데이터 사용)
  const siteContentStats = useMemo(() => {
    const sites = statisticsData.sitePerformance || [];
    // 사이트 데이터 매핑
    return sites.map((site) => ({
      siteId: site.name,
      siteName: site.name,
      siteUrl: site.url,
      status: (site.totalPublished || 0) > 0 ? 'connected' : 'disconnected', // 발행 실적이 있으면 연결됨
      totalGenerated: site.totalPublished || 0,
      successCount: site.successCount || 0,
      failedCount: site.failureCount || 0,
      successRate: site.successRate || 0
    }));
  }, [statisticsData.sitePerformance]);

  // 캠페인 성과 비교 데이터 (API 데이터 사용)
  const campaignPerformance = useMemo(() => {
    return statisticsData.campaignProgress || [];
  }, [statisticsData.campaignProgress]);

  // 크레딧 사용량 분석 데이터 (실제 API 연동)
  const [creditUsage, setCreditUsage] = useState({
    used: 0,
    total: 100,
    remaining: 100,
    dailyUsage: 0,
    remainingDays: 30,
    estimatedExhaustion: new Date().toISOString().split('T')[0],
    usageRate: 0
  });

  // 크레딧 정보 로드
  useEffect(() => {
    const loadCreditInfo = async () => {
      try {
        const {
          data: { session }
        } = await authAPI.getSession();

        const userId = session?.user?.id;
        if (!userId) {
          console.warn('No active session found for credit summary.');
          return;
        }

        const response = await fetch(buildApiUrl(`/api/credits/summary/${userId}`));
        if (response.ok) {
          const data = await response.json();

          // API 응답을 UI 형식으로 변환
          const daysElapsed = Math.max(30 - (data.days_remaining || 0), 1);
          const dailyUsage = data.credits_used > 0 ? Math.ceil(data.credits_used / daysElapsed) : 0;

          setCreditUsage({
            used: data.credits_used || 0,
            total: data.credits_total || 100,
            remaining: data.credits_remaining || 100,
            dailyUsage,
            remainingDays: Math.max(data.days_remaining || 30, 0),
            estimatedExhaustion: data.estimated_depletion_date || new Date().toISOString().split('T')[0],
            usageRate: Math.round(data.usage_percentage || 0)
          });
        } else {
          console.error('Failed to load credit info:', response.status);
        }
      } catch (error) {
        console.error('Credit API error:', error);
      }
    };

    loadCreditInfo();
  }, []);

  // 사이트별 성과 랭킹 데이터
  const siteRanking = useMemo(() => {
    return siteContentStats
      .map((site) => {
        const stabilityScore = site.status === 'connected' ? 100 : 0;
        const performanceScore = Math.round(site.successRate * 0.7 + stabilityScore * 0.3);

        return {
          ...site,
          stabilityScore,
          performanceScore,
          rank: 0 // 나중에 정렬 후 설정
        };
      })
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .map((site, index) => ({ ...site, rank: index + 1 }));
  }, [siteContentStats]);

  // 사용자 활동 요약 데이터 (실제 로그 기반)
  const userActivity = useMemo(() => {
    const activities = [];
    const logs = statisticsData.dailyTrend || [];

    // 최근 로그에서 활동 추출 (최근 6개)
    const recentLogs = logs
      .filter((day) => day.total > 0)
      .slice(-6)
      .reverse();

    recentLogs.forEach((day) => {
      if (day.success > 0) {
        activities.push({
          type: 'content_success',
          time: new Date(day.date),
          description: `Generated ${day.success} posts successfully`,
          count: day.success
        });
      }
      if (day.failure > 0) {
        activities.push({
          type: 'content_failed',
          time: new Date(day.date),
          description: `Failed to publish ${day.failure} posts`,
          count: day.failure
        });
      }
    });

    return activities.sort((a, b) => b.time - a.time).slice(0, 6);
  }, [statisticsData.dailyTrend]);

  const activityTimeLabel = (date) =>
    date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const hoursAgo = (date) => {
    const diff = Math.max(0, new Date() - date);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours}h ago`;
  };

  const averageSuccessRate =
    siteContentStats.length > 0
      ? Math.round(siteContentStats.reduce((acc, site) => acc + site.successRate, 0) / siteContentStats.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
          <p className="text-gray-600 mt-1">Visualize campaign performance and overall system health.</p>
        </div>
        <div className="flex gap-3">
          <TailwindButton variant="secondary" onClick={loadStatisticsData} disabled={statisticsData.isLoading}>
            {statisticsData.isLoading ? '⏳ Loading...' : '🔄 Refresh'}
          </TailwindButton>
          <TailwindButton variant="primary" onClick={() => console.log('Export statistics - TBD')}>
            📤 Export
          </TailwindButton>
        </div>
      </div>

      {/* 개요 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MainCard>
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Total campaigns</div>
            <div className="text-2xl font-bold text-gray-900">{statisticsData.isLoading ? '⏳' : overview.totalCampaigns}</div>
          </div>
        </MainCard>
        <MainCard>
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Active campaigns</div>
            <div className="text-2xl font-bold text-blue-600">{statisticsData.isLoading ? '⏳' : overview.activeCampaigns}</div>
          </div>
        </MainCard>
        <MainCard>
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Total generated content</div>
            <div className="text-2xl font-bold text-gray-900">{statisticsData.isLoading ? '⏳' : overview.totalContentGenerated}</div>
          </div>
        </MainCard>
        <MainCard>
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Success rate</div>
            <div className="text-2xl font-bold text-green-600">{statisticsData.isLoading ? '⏳' : `${overview.successRate}%`}</div>
          </div>
        </MainCard>
      </div>

      {/* 캠페인별 진행률 (도넛) */}
      <MainCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Campaign progress</h2>
          <TailwindButton variant="ghost" onClick={() => console.log('View all campaign progress - TBD')}>
            View all
          </TailwindButton>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {statisticsData.campaignProgress.map((cp) => (
            <div key={cp.id} className="flex items-center gap-3 p-3 rounded-lg border">
              <Donut value={cp.progress} />
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate" title={cp.name}>
                  {cp.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">Status: {cp.status}</div>
              </div>
            </div>
          ))}
        </div>
      </MainCard>

      {/* 기간별 생성 추이 (단일 스택 막대 + 일별/월별 토글) */}
      <MainCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Content trend over time</h2>
          <div className="flex items-center gap-2">
            <TailwindButton variant="ghost" onClick={() => setRange('daily')}>
              Daily
            </TailwindButton>
            <TailwindButton variant="ghost" onClick={() => setRange('monthly')}>
              Monthly
            </TailwindButton>
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-4">{range === 'daily' ? 'Last 30 days' : 'Last 12 months'}</div>

          {/* 그래프 영역 */}
          <div className="relative">
            {range === 'daily' ? (
              /* 일별 그래프 - 스택 막대 (스크롤 없음) */
              <div className="w-full">
                <div className="flex items-end justify-between gap-1 h-48 mb-4">
                  {dailyData.map((d, i) => {
                    const success = d.success || 0;
                    const failed = d.failure || 0;
                    const total = success + failed;
                    const maxValue = Math.max(...dailyData.map((item) => (item.success || 0) + (item.failure || 0)), 1);

                    const totalHeight = Math.max((total / maxValue) * 160, total > 0 ? 8 : 0);
                    const successHeight = total > 0 ? (success / total) * totalHeight : 0;
                    const failedHeight = total > 0 ? (failed / total) * totalHeight : 0;

                    return (
                      <div key={i} className="flex flex-col items-center flex-1">
                        {/* 스택 막대 그래프 - 하나의 막대에 성공(하단)/실패(상단) */}
                        <div className="relative group">
                          <div
                            className="w-4 bg-gray-200 rounded cursor-pointer relative overflow-hidden"
                            style={{ height: `${Math.max(totalHeight, 8)}px` }}
                          >
                            {/* 성공 부분 (하단, 초록색) */}
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-200"
                              style={{ height: `${successHeight}px` }}
                            />
                            {/* 실패 부분 (상단, 빨간색) */}
                            <div
                              className="absolute top-0 left-0 right-0 bg-red-500 transition-all duration-200"
                              style={{ height: `${failedHeight}px` }}
                            />
                          </div>

                          {/* 호버 툴팁 */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
                              <div>Success: {success}</div>
                              <div>Failure: {failed}</div>
                              <div>Total: {total}</div>
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>

                        {/* 날짜 라벨 */}
                        <div className="text-xs text-gray-500 mt-2 text-center">
                          {new Date(d.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* 월별 그래프 - 전체 폭 활용 */
              <div className="w-full">
                <div className="grid grid-cols-12 gap-4 mb-4">
                  {monthlyData.map((d, i) => {
                    const success = d.success || 0;
                    const failed = d.failed || 0;
                    const maxValue = Math.max(...monthlyData.map((item) => Math.max(item.success || 0, item.failed || 0)), 1);

                    const successHeight = Math.max((success / maxValue) * 160, success > 0 ? 10 : 0);
                    const failedHeight = Math.max((failed / maxValue) * 160, failed > 0 ? 10 : 0);

                    return (
                      <div key={i} className="flex flex-col items-center">
                        {/* 막대 그래프 - 성공과 실패를 나란히 */}
                        <div className="flex items-end gap-1 h-40">
                          {/* 성공 막대 (초록색) */}
                          <div className="flex flex-col items-center">
                            <div className="text-sm text-gray-600 mb-2 font-medium">{success}</div>
                            <div
                              className="w-5 bg-green-500 rounded-t"
                              style={{ height: `${successHeight}px` }}
                              title={`Success: ${success}`}
                            />
                          </div>

                          {/* 실패 막대 (빨간색) */}
                          <div className="flex flex-col items-center">
                            <div className="text-sm text-gray-600 mb-2 font-medium">{failed}</div>
                            <div
                              className="w-5 bg-red-500 rounded-t"
                              style={{ height: `${failedHeight}px` }}
                              title={`Failure: ${failed}`}
                            />
                          </div>
                        </div>

                        {/* 월 라벨 */}
                        <div className="text-sm text-gray-500 mt-3 text-center font-medium">
                          {new Date(`${d.month}-01`).toLocaleString('en-US', { month: 'short' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 범례 */}
            <div className="flex items-center justify-center gap-6 text-base text-gray-600 mt-6">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 bg-green-500 inline-block rounded" />
                <span>Success</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 bg-red-500 inline-block rounded" />
                <span>Failure</span>
              </div>
            </div>
          </div>
        </div>
      </MainCard>

      {/* 성공/실패 비율 / 키워드 Top N */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MainCard>
          <div className="mb-4 text-lg font-semibold text-gray-900">Success vs. failure</div>
          <div className="flex items-center gap-6">
            <Donut value={successFail.successRate} color="#10B981" />
            <div className="text-base text-gray-700">
              <div>
                Success rate: <span className="font-semibold text-green-600">{successFail.successRate}%</span>
              </div>
              <div>
                Failure rate: <span className="font-semibold text-red-600">{successFail.failRate}%</span>
              </div>
            </div>
          </div>
        </MainCard>

        {/* 키워드 Top N */}
        <MainCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Top 5 keywords</h2>
            <TailwindButton variant="ghost" onClick={() => console.log('View all keyword stats - TBD')}>
              View all
            </TailwindButton>
          </div>
          <div className="space-y-3">
            {statisticsData.topKeywords.slice(0, 5).map((k, i) => (
              <div key={k.keyword} className="flex items-center justify-between text-base">
                <span className="text-gray-700 truncate">
                  {i + 1}. {k.keyword}
                </span>
                <span className="text-gray-500">
                  {k.count} uses {k.count > 0 && `(${k.successRate}%)`}
                </span>
              </div>
            ))}
          </div>
        </MainCard>
      </div>

      {/* 사이트별 콘텐츠 발행 현황 */}
      <MainCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Content publishing by site</h2>
          <TailwindButton variant="ghost" onClick={() => console.log('View all site stats - TBD')}>
            View all
          </TailwindButton>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {siteContentStats.slice(0, 6).map((site) => (
            <div key={site.siteId} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-medium text-gray-900 truncate" title={site.siteName}>
                    {site.siteName}
                  </h3>
                  <p className="text-sm text-gray-500 truncate" title={site.siteUrl}>
                    {site.siteUrl}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    site.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {site.status === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total published</span>
                  <span className="font-semibold text-gray-900">{site.totalGenerated}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Success</span>
                  <span className="font-semibold text-green-600">{site.successCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Failure</span>
                  <span className="font-semibold text-red-600">{site.failedCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Success rate</span>
                  <span className="font-semibold text-blue-600">{site.successRate}%</span>
                </div>
              </div>

              {/* 미니 진행 바 */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Success rate</span>
                  <span>{site.successRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${site.successRate}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 사이트별 요약 통계 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-sm text-gray-500">Connected sites</div>
            <div className="text-xl font-bold text-green-600">{siteStatus.connected}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">Disconnected sites</div>
            <div className="text-xl font-bold text-red-600">{siteStatus.disconnected}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">Total sites</div>
            <div className="text-xl font-bold text-gray-900">{siteStatus.total}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">Average success rate</div>
            <div className="text-xl font-bold text-blue-600">{averageSuccessRate}%</div>
          </div>
        </div>
      </MainCard>

      {/* 캠페인 성과 비교 */}
      <MainCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Campaign performance comparison</h2>
          <TailwindButton variant="ghost" onClick={() => console.log('View campaign performance - TBD')}>
            View all
          </TailwindButton>
        </div>

        <div className="space-y-4">
          {campaignPerformance.map((campaign) => (
            <div key={campaign.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium text-gray-900 truncate" title={campaign.name}>
                  {campaign.name}
                </h3>
                <span className="text-sm text-gray-500">
                  {(() => {
                    // 캠페인 시작일 기준 경과 일수 계산 (시작일 = 1일)
                    if (!campaign.started_at) return '0 days elapsed';

                    const startDate = new Date(campaign.started_at);
                    const currentDate = new Date();
                    const daysPassed = Math.max(1, Math.ceil((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

                    return `${daysPassed} days elapsed`;
                  })()}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-500">Completion</div>
                  <div className="text-lg font-bold text-blue-600">{campaign.progress}%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Success rate</div>
                  <div className="text-lg font-bold text-green-600">{campaign.progress}%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Daily average</div>
                  <div className="text-lg font-bold text-purple-600">
                    {(() => {
                      // 캠페인 설정 기반 일일 평균 계산 (데이터베이스 불필요)
                      if (!campaign.totalQuantity || !campaign.duration) return '0 items/day';

                      const dailyAverage = (campaign.totalQuantity / campaign.duration).toFixed(1);
                      return `${dailyAverage} items/day`;
                    })()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Output</div>
                  <div className="text-lg font-bold text-gray-900">
                    {campaign.completedCount}/{campaign.totalQuantity}
                  </div>
                </div>
              </div>

              {/* 완료율 진행 바 */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${campaign.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </MainCard>

      {/* 크레딧 사용량 분석 */}
      <MainCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Credit usage analysis</h2>
          <TailwindButton variant="ghost" onClick={() => console.log('View credit details - TBD')}>
            Details
          </TailwindButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 크레딧 현황 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Credits used</div>
                <div className="text-2xl font-bold text-blue-600">{creditUsage.used}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total credits</div>
                <div className="text-2xl font-bold text-gray-900">{creditUsage.total}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Credits remaining</span>
                <span className="text-lg font-semibold text-green-600">{creditUsage.remaining}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Daily usage</span>
                <span className="text-lg font-semibold text-orange-600">{creditUsage.dailyUsage} items/day</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Expected exhaustion</span>
                <span className="text-lg font-semibold text-red-600">{creditUsage.estimatedExhaustion}</span>
              </div>
            </div>
          </div>

          {/* 사용률 차트 */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Usage rate</div>
              <Donut value={creditUsage.usageRate} color="#3B82F6" size={120} />
            </div>

            <div className="text-center">
              <div className="text-sm text-gray-600">Days remaining</div>
              <div className="text-3xl font-bold text-orange-600">{creditUsage.remainingDays} days</div>
            </div>
          </div>
        </div>
      </MainCard>

      {/* 사이트별 성과 랭킹 */}
      <MainCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Site performance ranking</h2>
          <TailwindButton variant="ghost" onClick={() => console.log('View full ranking - TBD')}>
            View all
          </TailwindButton>
        </div>

        <div className="space-y-3">
          {siteRanking.slice(0, 5).map((site) => (
            <div key={site.siteId} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    site.rank === 1
                      ? 'bg-yellow-100 text-yellow-600'
                      : site.rank === 2
                        ? 'bg-gray-100 text-gray-600'
                        : site.rank === 3
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {site.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-medium text-gray-900 truncate" title={site.siteName}>
                    {site.siteName}
                  </div>
                  <div className="text-sm text-gray-500 truncate" title={site.siteUrl}>
                    {site.siteUrl}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-sm text-gray-500">Performance score</div>
                  <div className="text-lg font-bold text-blue-600">{site.performanceScore}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Published</div>
                  <div className="text-lg font-bold text-gray-900">{site.totalGenerated}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Success rate</div>
                  <div className="text-lg font-bold text-green-600">{site.successRate}%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Stability</div>
                  <div className="text-lg font-bold text-purple-600">{site.stabilityScore}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </MainCard>

      {/* 사용자 활동 요약 */}
      <MainCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Recent activity</h2>
          <TailwindButton variant="ghost" onClick={() => console.log('View activity log - TBD')}>
            View all
          </TailwindButton>
        </div>

        <div className="space-y-3">
          {userActivity.map((activity, index) => (
            <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
              <div
                className={`w-3 h-3 rounded-full ${
                  activity.type === 'content_success'
                    ? 'bg-green-500'
                    : activity.type === 'content_failed'
                      ? 'bg-red-500'
                      : activity.type === 'campaign_create'
                        ? 'bg-blue-500'
                        : activity.type === 'site_add'
                          ? 'bg-purple-500'
                          : 'bg-gray-500'
                }`}
              />

              <div className="flex-1">
                <div className="text-base text-gray-900">{activity.description}</div>
                <div className="text-sm text-gray-500">{activityTimeLabel(activity.time)}</div>
              </div>

              <div className="text-sm text-gray-400">{hoursAgo(activity.time)}</div>
            </div>
          ))}
        </div>
      </MainCard>
    </div>
  );
}
