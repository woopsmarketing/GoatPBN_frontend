/**
 * 📊 대시보드 페이지 (MVP)
 * 최근 현황을 한눈에 보는 KPI/최근 활동/진행률/알림 패널을 표시
 * 사용 예: /dashboard
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '../../../components/MainCard';
import TailwindButton from '../../../components/ui/TailwindButton';
import { campaignsAPI } from '../../../lib/api/campaigns';
import { sitesAPI } from '../../../lib/api/sites';
import { logsAPI } from '../../../lib/api/logs';
import { useDashboardLocale } from '../../../contexts/DashboardLocaleContext';

// 간단 진행률 바 컴포넌트
function ProgressBar({ value }) {
  const percentage = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${percentage}%` }}></div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { locale } = useDashboardLocale();
  const isEnglish = locale === 'en';
  const dateLocale = isEnglish ? 'en-US' : 'ko-KR';
  const localizePath = (path) => (isEnglish ? `/en${path}` : path);

  // 상태 관리
  const [dashboardData, setDashboardData] = useState({
    kpi: {
      activeCampaigns: 0,
      totalSites: 0,
      totalContentGenerated: 0,
      successRate: 0
    },
    progressList: [],
    recentActivities: [], // 최근 활동 추가
    dailyGoals: {
      todayGenerated: 0,
      todayTarget: 0,
      weeklyGenerated: 0,
      weeklyTarget: 0,
      monthlyGenerated: 0,
      monthlyTarget: 0
    },
    campaignStats: {
      paused: 0,
      completed: 0
    },
    systemStatus: {
      // 시스템 상태 추가
      apiResponseTime: 0
    },
    isLoading: true
  });

  // 대시보드 데이터 로드
  const loadDashboardData = async () => {
    try {
      setDashboardData((prev) => ({ ...prev, isLoading: true }));

      // 병렬로 모든 데이터 로드
      const [campaignStats, sitesStats, campaignProgress, dailyGoals, recentActivities] = await Promise.all([
        campaignsAPI.getCampaignStats(),
        sitesAPI.getSitesStats(),
        campaignsAPI.getCampaignProgress(),
        campaignsAPI.getDailyGoals(),
        logsAPI.getRecentActivities(5) // 최근 활동 5개
      ]);

      // 디버깅용 로그
      console.log('📊 대시보드 데이터 로드 결과:');
      console.log('캠페인 통계:', campaignStats.data);
      console.log('사이트 통계:', sitesStats.data);
      console.log('진행률 데이터:', campaignProgress.data);
      console.log('일일 목표 데이터:', dailyGoals.data);

      // KPI 데이터 구성
      const kpi = {
        activeCampaigns: campaignStats.data?.active || 0,
        totalSites: sitesStats.data?.total || 0,
        totalContentGenerated: campaignStats.data?.totalContent || 0,
        successRate: campaignStats.data?.successRate || 0 // 실제 계산된 성공률 사용
      };

      setDashboardData({
        kpi,
        progressList: campaignProgress.data || [],
        recentActivities: recentActivities.data || [], // 최근 활동 추가
        dailyGoals: dailyGoals.data || {
          todayGenerated: 0,
          todayTarget: 0,
          weeklyGenerated: 0,
          weeklyTarget: 0,
          monthlyGenerated: 0,
          monthlyTarget: 0
        },
        campaignStats: {
          paused: campaignStats.data?.paused || 0,
          completed: campaignStats.data?.completed || 0
        },
        systemStatus: {
          // 시스템 상태 업데이트
          apiResponseTime: 245 // 임시값 (추후 실제 API 응답시간 측정)
        },
        isLoading: false
      });
    } catch (error) {
      console.error('대시보드 데이터 로드 오류:', error);
      setDashboardData((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // 연결 점검 핸들러
  const handleConnectionCheck = async () => {
    try {
      console.log('🔍 전체 사이트 연결 점검 시작...');
      const { data, error } = await sitesAPI.checkAllSitesConnection();

      if (error) {
        console.error('❌ 연결 점검 실패:', error);
        alert(`연결 점검 중 오류가 발생했습니다: ${error}`);
        return;
      }

      console.log('✅ 연결 점검 완료:', data);

      // 점검 결과 요약 표시
      const { summary } = data;
      alert(
        isEnglish
          ? `🔍 Connection check completed!\n\n` +
              `📊 Summary:\n` +
              `• Total sites: ${summary.total}\n` +
              `• Connected: ${summary.connected}\n` +
              `• Failed: ${summary.error}\n` +
              `• Duration: ${summary.totalTime}ms\n\n` +
              `The dashboard will refresh automatically.`
          : `🔍 연결 점검 완료!\n\n` +
              `📊 결과 요약:\n` +
              `• 전체 사이트: ${summary.total}개\n` +
              `• 연결 성공: ${summary.connected}개\n` +
              `• 연결 실패: ${summary.error}개\n` +
              `• 소요 시간: ${summary.totalTime}ms\n\n` +
              `대시보드가 자동으로 새로고침됩니다.`
      );

      // 대시보드 데이터 다시 로드 (마지막 확인 시간 포함)
      await loadDashboardData();
    } catch (error) {
      console.error('❌ 연결 점검 오류:', error);
      alert(isEnglish ? `Connection check failed: ${error.message}` : `연결 점검 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadDashboardData();
  }, []);

  // 알림 데이터 (추후 관리자 알림 시스템 구현 시 사용)
  const alerts = [];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEnglish ? '📊 Dashboard' : '📊 대시보드'}</h1>
          <p className="text-gray-600 mt-1">
            {isEnglish ? 'Check your entire system status at a glance.' : '전체 시스템 현황을 한눈에 확인하세요.'}
          </p>
        </div>
        <div className="flex gap-3">
          <TailwindButton variant="secondary" onClick={loadDashboardData} disabled={dashboardData.isLoading}>
            {dashboardData.isLoading ? (isEnglish ? '⏳ Loading...' : '⏳ 로딩중...') : isEnglish ? '🔄 Refresh' : '🔄 새로고침'}
          </TailwindButton>
          <TailwindButton variant="primary" onClick={() => router.push(localizePath('/reports'))}>
            {isEnglish ? '📥 Reports' : '📥 보고서'}
          </TailwindButton>
        </div>
      </div>

      {/* 🔴 NEW: 서버 유지보수 공지 배너 */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-blue-800">
              {isEnglish ? '📌 Daily maintenance window: 00:00 ~ 00:30 (KST).' : '📌 매일 00:00 ~ 00:30 (30분)은 서버 안정화 시간입니다.'}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {isEnglish
                ? 'All content generation pauses during this time. Processing resumes automatically at 00:30. 🔧'
                : '이 시간 동안 모든 콘텐츠 생성 작업이 일시 중지됩니다. 00:30부터 정상 재개되니 양해 부탁드립니다. 🔧'}
            </p>
          </div>
        </div>
      </div>

      {/* 🔴 NEW: 일일 링크 한도 안내 배너 */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-amber-800">
              {isEnglish ? '⚡ Daily throughput limit: 1,000 links/day' : '⚡ 일일 최대 처리량: 1000개 링크/일'}
            </p>
            <p className="text-sm text-amber-700 mt-1">
              {isEnglish
                ? 'When multiple campaigns run, jobs are prioritized within the daily limit.'
                : '여러 캠페인이 있을 경우 일일 한도에 따라 우선순위 처리됩니다.'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI 카드 + 구독 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MainCard>
          <div className="space-y-2">
            <div className="text-base text-gray-500">{isEnglish ? 'Active Campaigns' : '활성 캠페인'}</div>
            <div className="text-3xl font-bold text-blue-600">{dashboardData.isLoading ? '⏳' : dashboardData.kpi.activeCampaigns}</div>
          </div>
        </MainCard>
        <MainCard>
          <div className="space-y-2">
            <div className="text-base text-gray-500">{isEnglish ? 'Registered Sites' : '등록 사이트'}</div>
            <div className="text-3xl font-bold text-gray-900">{dashboardData.isLoading ? '⏳' : dashboardData.kpi.totalSites}</div>
          </div>
        </MainCard>
        <MainCard>
          <div className="space-y-2">
            <div className="text-base text-gray-500">{isEnglish ? 'Total Generated Content' : '총 생성 콘텐츠'}</div>
            <div className="text-3xl font-bold text-gray-900">
              {dashboardData.isLoading ? '⏳' : dashboardData.kpi.totalContentGenerated}
            </div>
          </div>
        </MainCard>
        <MainCard>
          <div className="space-y-2">
            <div className="text-base text-gray-500">{isEnglish ? 'Success Rate' : '성공률'}</div>
            <div className="text-3xl font-bold text-green-600">{dashboardData.isLoading ? '⏳' : `${dashboardData.kpi.successRate}%`}</div>
          </div>
        </MainCard>
        <MainCard>
          <div className="space-y-2">
            <div className="text-base text-gray-500">{isEnglish ? 'System Status' : '시스템 상태'}</div>
            <div className="text-base text-gray-700">
              <div>
                {isEnglish ? 'Connected sites: ' : '연결된 사이트: '}
                <span className="font-semibold text-green-600">{dashboardData.kpi.totalSites}</span>
                {isEnglish ? '' : '개'}
              </div>
              <div>
                {isEnglish ? 'Active campaigns: ' : '활성 캠페인: '}
                <span className="font-semibold text-blue-600">{dashboardData.kpi.activeCampaigns}</span>
                {isEnglish ? '' : '개'}
              </div>
              <div>
                {isEnglish ? 'Completed content: ' : '완료된 콘텐츠: '}
                <span className="font-semibold">{dashboardData.kpi.totalContentGenerated}</span>
                {isEnglish ? '' : '개'}
              </div>
            </div>
          </div>
        </MainCard>
      </div>

      {/* 빠른 액션: 1열 */}
      <MainCard>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{isEnglish ? '⚡ Quick Actions' : '⚡ 빠른 액션'}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <TailwindButton
            variant="primary"
            onClick={() => router.push(localizePath('/campaigns/create'))}
            className="h-16 flex flex-col items-center justify-center"
          >
            <span className="text-2xl mb-1">📝</span>
            <span className="text-sm font-medium">{isEnglish ? 'New Campaign' : '새 캠페인'}</span>
          </TailwindButton>
          <TailwindButton
            variant="secondary"
            onClick={() => router.push(localizePath('/sites/add'))}
            className="h-16 flex flex-col items-center justify-center"
          >
            <span className="text-2xl mb-1">🌐</span>
            <span className="text-sm font-medium">{isEnglish ? 'Add Site' : '사이트 추가'}</span>
          </TailwindButton>
          <TailwindButton
            variant="secondary"
            onClick={() => router.push(localizePath('/logs'))}
            className="h-16 flex flex-col items-center justify-center"
          >
            <span className="text-2xl mb-1">📝</span>
            <span className="text-sm font-medium">{isEnglish ? 'View Logs' : '로그 보기'}</span>
          </TailwindButton>
          <TailwindButton
            variant="ghost"
            onClick={() => router.push(localizePath('/reports'))}
            className="h-16 flex flex-col items-center justify-center"
          >
            <span className="text-2xl mb-1">📊</span>
            <span className="text-sm font-medium">{isEnglish ? 'Reports' : '보고서'}</span>
          </TailwindButton>
          <TailwindButton
            variant="secondary"
            onClick={() => router.push(localizePath('/guide/getting-started'))}
            className="h-16 flex flex-col items-center justify-center"
          >
            <span className="text-2xl mb-1">📘</span>
            <span className="text-sm font-medium">{isEnglish ? 'Getting Started' : '사용 가이드'}</span>
          </TailwindButton>
        </div>
      </MainCard>

      {/* 최근 활동: 전체 폭 */}
      <MainCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{isEnglish ? '🕒 Recent Activity' : '🕒 최근 활동'}</h2>
          <TailwindButton variant="ghost" onClick={() => router.push(localizePath('/logs'))}>
            {isEnglish ? 'View all' : '전체 보기'}
          </TailwindButton>
        </div>
        <div className="overflow-x-auto">
          {dashboardData.isLoading ? (
            <div className="text-center py-8 text-gray-500">{isEnglish ? '⏳ Loading data...' : '⏳ 데이터를 불러오는 중...'}</div>
          ) : dashboardData.recentActivities && dashboardData.recentActivities.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isEnglish ? 'Time' : '시간'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isEnglish ? 'Content Title' : '콘텐츠 제목'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isEnglish ? 'Keyword' : '키워드'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isEnglish ? 'Target Site' : '타겟 사이트'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isEnglish ? 'Status' : '상태'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.recentActivities.map((activity, index) => (
                  <tr key={activity.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(() => {
                        // UTC 시간을 클라이언트 시간대로 자동 변환
                        if (!activity.created_at) return 'Invalid Date';

                        try {
                          // UTC 시간으로 파싱 (백엔드에서 UTC로 저장됨)
                          const utcDate = new Date(activity.created_at);

                          // 유효한 날짜인지 확인
                          if (isNaN(utcDate.getTime())) {
                            return 'Invalid Date';
                          }

                          // 클라이언트의 로컬 시간대로 자동 변환
                          const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                          return utcDate.toLocaleString(dateLocale, {
                            timeZone: clientTimeZone,
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        } catch (error) {
                          console.error('❌ 대시보드 시간 포맷팅 오류:', error);
                          return 'Invalid Date';
                        }
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {activity.published_url ? (
                        <a
                          href={activity.published_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {activity.content_title}
                        </a>
                      ) : (
                        activity.content_title
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{activity.keyword}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.target_site}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {activity.status === 'success' ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {isEnglish ? '✓ Success' : '✓ 성공'}
                        </span>
                      ) : activity.status === 'failed' ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          {isEnglish ? '✗ Failed' : '✗ 실패'}
                        </span>
                      ) : activity.status === 'processing' ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {isEnglish ? '⏳ Processing' : '⏳ 진행중'}
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {isEnglish ? '⏸ Pending' : '⏸ 대기중'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {isEnglish ? '📝 No recent activity.' : '📝 최근 활동이 없습니다.'}
              <br />
              <span className="text-sm">
                {isEnglish ? 'Entries appear automatically after content generation.' : '콘텐츠 생성 시 자동으로 기록됩니다.'}
              </span>
            </div>
          )}
        </div>
      </MainCard>

      {/* 진행률 / 알림: 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 진행률 */}
        <MainCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{isEnglish ? '📈 Active Campaign Progress' : '📈 활성 캠페인 진행률'}</h2>
            <div className="flex gap-2">
              <TailwindButton variant="ghost" onClick={() => router.push(localizePath('/campaigns'))}>
                {isEnglish ? 'View all campaigns' : '모든 캠페인 보기'}
              </TailwindButton>
              <TailwindButton variant="ghost" onClick={() => router.push(localizePath('/statistics'))}>
                {isEnglish ? 'View statistics' : '통계 보기'}
              </TailwindButton>
            </div>
          </div>
          <div className="space-y-4">
            {dashboardData.isLoading ? (
              <div className="text-center py-4 text-gray-500">{isEnglish ? '⏳ Loading data...' : '⏳ 데이터를 불러오는 중...'}</div>
            ) : dashboardData.progressList.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-base text-gray-500 mb-2">{isEnglish ? 'No active campaigns' : '활성 캠페인이 없습니다'}</div>
                <div className="text-sm text-gray-400">
                  {isEnglish ? 'Create a new campaign or activate an existing one.' : '새 캠페인을 생성하거나 기존 캠페인을 활성화하세요'}
                </div>
              </div>
            ) : (
              dashboardData.progressList.map((item) => (
                <div key={item.campaignId} className="space-y-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-base text-gray-700 truncate font-medium" title={item.name}>
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue-600 font-semibold">{item.progress}%</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">{isEnglish ? 'Active' : '활성'}</span>
                    </div>
                  </div>
                  <ProgressBar value={item.progress} />
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{isEnglish ? `${item.completedCount} completed` : `${item.completedCount}개 완료`}</span>
                    <span>{isEnglish ? `/ ${item.totalQuantity} target` : `/ ${item.totalQuantity}개 목표`}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </MainCard>

        {/* 알림/경고 */}
        <MainCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{isEnglish ? '⚠️ Alerts' : '⚠️ 알림'}</h2>
            <TailwindButton variant="ghost" onClick={() => console.log('API 구현중 - 알림 확인')}>
              {isEnglish ? 'Mark all read' : '모두 읽음'}
            </TailwindButton>
          </div>
          <div className="space-y-4">
            {alerts.length === 0 && (
              <div className="text-base text-gray-500">{isEnglish ? 'No new alerts.' : '새로운 알림이 없습니다.'}</div>
            )}
            {alerts.map((a) => (
              <div key={a.id} className="p-4 rounded-lg bg-red-50 border border-red-100">
                <div className="text-base font-medium text-red-700">⚠️ {a.campaignName}</div>
                <div className="text-sm text-red-600 mt-2 truncate" title={a.errorMessage || ''}>
                  {a.errorMessage || (isEnglish ? 'Analyzing cause' : '원인 분석 중')}
                </div>
              </div>
            ))}
          </div>
        </MainCard>
      </div>

      {/* 일일 목표 / 성과 요약: 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 일일 목표 달성률 */}
        <MainCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{isEnglish ? '🎯 Daily Goals' : '🎯 일일 목표'}</h2>
            <TailwindButton variant="ghost" onClick={() => router.push(localizePath('/statistics'))}>
              {isEnglish ? 'View details' : '상세 보기'}
            </TailwindButton>
          </div>
          <div className="space-y-4">
            {dashboardData.isLoading ? (
              <div className="text-center py-4 text-gray-500">{isEnglish ? '⏳ Loading data...' : '⏳ 데이터를 불러오는 중...'}</div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base text-gray-600">{isEnglish ? 'Today' : '오늘 목표'}</span>
                    <span className="text-base font-medium">
                      {dashboardData.dailyGoals.todayGenerated}/{dashboardData.dailyGoals.todayTarget}
                    </span>
                  </div>
                  <ProgressBar
                    value={
                      dashboardData.dailyGoals.todayTarget > 0
                        ? Math.round((dashboardData.dailyGoals.todayGenerated / dashboardData.dailyGoals.todayTarget) * 100)
                        : 0
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600">{isEnglish ? 'Weekly' : '주간'}</div>
                    <div className="text-base font-semibold text-blue-600">
                      {dashboardData.dailyGoals.weeklyGenerated}/{dashboardData.dailyGoals.weeklyTarget}
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-gray-600">{isEnglish ? 'Monthly' : '월간'}</div>
                    <div className="text-base font-semibold text-green-600">
                      {dashboardData.dailyGoals.monthlyGenerated}/{dashboardData.dailyGoals.monthlyTarget}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </MainCard>

        {/* 성과 요약 */}
        <MainCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{isEnglish ? '📈 Performance Summary' : '📈 성과 요약'}</h2>
            <TailwindButton variant="ghost" onClick={() => router.push(localizePath('/statistics'))}>
              {isEnglish ? 'View details' : '상세 보기'}
            </TailwindButton>
          </div>
          <div className="space-y-4">
            {dashboardData.isLoading ? (
              <div className="text-center py-4 text-gray-500">{isEnglish ? '⏳ Loading data...' : '⏳ 데이터를 불러오는 중...'}</div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <div className="text-base text-gray-600">{isEnglish ? 'Total progress vs. goal' : '총 목표 대비 달성률'}</div>
                    <div className="text-xl font-semibold text-blue-600">
                      {isEnglish ? `${dashboardData.kpi.totalContentGenerated} items` : `${dashboardData.kpi.totalContentGenerated}개`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-medium text-green-600">{dashboardData.kpi.successRate}%</div>
                    <div className="text-sm text-gray-500">{isEnglish ? 'Success rate' : '달성률'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-base text-gray-600 mb-3">{isEnglish ? 'Campaign status overview' : '캠페인 상태 분포'}</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-base">
                      <span className="text-gray-700">{isEnglish ? 'Active campaigns' : '활성 캠페인'}</span>
                      <span className="text-blue-600 font-semibold">
                        {isEnglish ? `${dashboardData.kpi.activeCampaigns}` : `${dashboardData.kpi.activeCampaigns}개`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-base">
                      <span className="text-gray-700">{isEnglish ? 'Paused campaigns' : '일시정지 캠페인'}</span>
                      <span className="text-gray-500 font-semibold">
                        {isEnglish ? `${dashboardData.campaignStats.paused}` : `${dashboardData.campaignStats.paused}개`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-base">
                      <span className="text-gray-700">{isEnglish ? 'Completed campaigns' : '완료된 캠페인'}</span>
                      <span className="text-green-600 font-semibold">
                        {isEnglish ? `${dashboardData.campaignStats.completed}` : `${dashboardData.campaignStats.completed}개`}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </MainCard>
      </div>

      {/* 시스템 상태 / FAQ: 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 시스템 상태 */}
        <MainCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{isEnglish ? '🔧 System Status' : '🔧 시스템 상태'}</h2>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                {isEnglish ? 'Healthy' : '정상'}
              </span>
              <TailwindButton variant="secondary" size="sm" onClick={handleConnectionCheck} className="text-xs">
                {isEnglish ? '🔍 Run connection check' : '🔍 연결 점검'}
              </TailwindButton>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base text-gray-600">{isEnglish ? 'WordPress Sites' : 'WordPress 사이트'}</span>
              <span className="text-base font-medium">
                {dashboardData.isLoading
                  ? '⏳'
                  : isEnglish
                    ? `${dashboardData.kpi.totalSites}/${dashboardData.kpi.totalSites} connected`
                    : `${dashboardData.kpi.totalSites}/${dashboardData.kpi.totalSites} 연결됨`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base text-gray-600">{isEnglish ? 'API response time' : 'API 응답시간'}</span>
              <span className="text-base font-medium">
                {dashboardData.isLoading ? '⏳' : `${dashboardData.systemStatus.apiResponseTime}ms`}
              </span>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                {isEnglish ? (
                  '💡 Tip: Use the "Run connection check" button to verify every site.'
                ) : (
                  <>
                    💡 <strong>팁:</strong> "연결 점검" 버튼을 눌러 모든 사이트의 연결 상태를 확인하세요.
                  </>
                )}
              </div>
            </div>
          </div>
        </MainCard>

        {/* FAQ / 사용방법 */}
        <MainCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{isEnglish ? '❓ Frequently Asked Questions' : '❓ 자주 묻는 질문'}</h2>
            <TailwindButton variant="ghost" onClick={() => console.log('API 구현중 - 전체 FAQ')}>
              {isEnglish ? 'View all' : '전체 보기'}
            </TailwindButton>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-base font-medium text-gray-900 mb-2">
                {isEnglish ? 'When does a campaign start after creation?' : '캠페인 생성 후 언제부터 시작되나요?'}
              </div>
              <div className="text-sm text-gray-600">
                {isEnglish
                  ? 'Immediate campaigns start right away. Scheduled campaigns start automatically at the reserved time.'
                  : '즉시 시작을 선택하면 바로 시작되고, 예약 시작을 선택하면 설정한 시간에 자동으로 시작됩니다.'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-base font-medium text-gray-900 mb-2">
                {isEnglish ? 'Why does WordPress connection fail?' : 'WordPress 사이트 연결이 실패하는 이유는?'}
              </div>
              <div className="text-sm text-gray-600">
                {isEnglish
                  ? 'Check username, password, and application password. WordPress REST API must be enabled.'
                  : '사용자명, 비밀번호, 앱 패스워드가 정확한지 확인해주세요. WordPress REST API가 활성화되어 있어야 합니다.'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-base font-medium text-gray-900 mb-2">
                {isEnglish ? 'How are credits consumed?' : '크레딧은 어떻게 소모되나요?'}
              </div>
              <div className="text-sm text-gray-600">
                {isEnglish
                  ? 'Each generated content consumes one credit. Failed executions do not use credits.'
                  : '콘텐츠 1개 생성당 1크레딧이 소모됩니다. 실패한 작업은 크레딧이 차감되지 않습니다.'}
              </div>
            </div>
          </div>
        </MainCard>
      </div>
    </div>
  );
}
