'use client';

// v1.1 - 영어 로그 페이지 전용 구현 (2025.11.13)
// 기능 요약: 콘텐츠 및 활동 로그를 영어 UI로 제공

import { useEffect, useMemo, useRef, useState } from 'react';
import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import { logsAPI } from '@/lib/api/logs';
import { campaignsAPI } from '@/lib/api/campaigns';
import { activityAPI } from '@/lib/api/activity';
import { inMemoryActivityLogger, logActivity } from '@/lib/activity/inMemoryActivityLogger';

/**
 * 상태 배지를 영어로 표기
 */
function StatusBadge({ status, errorMessage }) {
  const style = status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  const label = status === 'success' ? 'Success' : 'Failed';

  // 실패 사유 (Mock 데이터) 영어 설명
  const failureReasons = {
    'WordPress API 연결 실패': 'WordPress API connection failed (401 Unauthorized)',
    '콘텐츠 생성 실패': 'Content generation failed (AI response error)',
    '네트워크 오류': 'Network error (request timed out)',
    '파일 업로드 실패': 'File upload failed (size limit or permissions)',
    '키워드 중복': 'Duplicate keyword detected'
  };
  const failureReason = status === 'failed' ? failureReasons[errorMessage] || errorMessage || 'Unknown error' : null;

  return (
    <div className="relative group">
      <span className={`px-2 py-0.5 rounded-full text-xs ${style}`}>{label}</span>
      {failureReason && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
          <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap max-w-xs">{failureReason}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * 상대 시간을 영어 문구로 반환
 */
function getRelativeTimeEnglish(dateString) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Relative time parsing error:', error);
    return dateString;
  }
}

/**
 * 활동 시간 포맷을 영어로 출력
 */
function formatActivityTimeEnglish(dateString) {
  if (!dateString) return 'Invalid date';

  try {
    const utcDate = new Date(dateString);
    if (isNaN(utcDate.getTime())) return 'Invalid date';

    const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return utcDate.toLocaleString('en-US', {
      timeZone: clientTimeZone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Activity time formatting error:', error);
    return dateString;
  }
}

/**
 * 📜 LogsPageEn - 영문 로그 페이지
 */
export default function LogsPageEn() {
  const [statusFilter, setStatusFilter] = useState('all'); // all|success|failed
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // 무한 스크롤을 위한 가시 항목
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef(null);

  // 실제 데이터 상태
  const [logs, setLogs] = useState([]);
  const [campaigns, setCampaigns] = useState([{ id: 'all', name: 'All campaigns' }]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('content'); // content | activity

  // 초기 데이터 로드
  useEffect(() => {
    loadLogsData();
  }, []);

  // 실시간 활동 로그 리스너 등록
  useEffect(() => {
    const handleActivityUpdate = (newActivity) => {
      setActivities((prev) => [newActivity, ...prev.slice(0, 99)]);
    };

    inMemoryActivityLogger.addListener(handleActivityUpdate);
    return () => inMemoryActivityLogger.removeListener(handleActivityUpdate);
  }, []);

  /**
   * 로그 및 캠페인 데이터 로드
   */
  const loadLogsData = async () => {
    try {
      setIsLoading(true);

      const [logsResult, campaignsResult] = await Promise.all([logsAPI.getAllLogs(), campaignsAPI.getCampaignsWithSites()]);

      if (!logsResult.error) {
        setLogs(logsResult.data || []);
      }

      if (!campaignsResult.error) {
        const campaignList = (campaignsResult.data || []).map((campaign) => ({
          id: campaign.id,
          name: campaign.name
        }));
        setCampaigns([{ id: 'all', name: 'All campaigns' }, ...campaignList]);
      }

      const inMemoryActivities = inMemoryActivityLogger.getRecentActivities(100);
      setActivities(inMemoryActivities);

      console.log('📝 Loaded log entries:', logsResult.data?.length || 0);
      console.log('📋 Loaded activities (memory):', inMemoryActivities.length);
    } catch (error) {
      console.error('Failed to load log data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * UTC → 로컬 시간 변환 (영문 포맷)
   */
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Invalid date';

    try {
      const utcDate = new Date(dateString);
      if (isNaN(utcDate.getTime())) return 'Invalid date';

      const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return utcDate.toLocaleString('en-US', {
        timeZone: clientTimeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Date formatting error:', error, 'input:', dateString);
      return 'Invalid date';
    }
  };

  /**
   * 필터링된 로그 계산
   */
  const filteredLogs = useMemo(() => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    return logs
      .filter((log) => {
        const logDate = new Date(log.created_at);
        if (logDate < sixtyDaysAgo) return false;
        if (log.status === 'processing' || log.status === 'pending') return false;
        if (statusFilter !== 'all' && log.status !== statusFilter) return false;
        if (campaignFilter !== 'all' && String(log.campaign_id) !== String(campaignFilter)) return false;
        if (!dateRange.from && !dateRange.to) return true;
        const ts = new Date(log.created_at).getTime();
        const fromTs = dateRange.from ? new Date(dateRange.from).getTime() : -Infinity;
        const toTs = dateRange.to ? new Date(dateRange.to).getTime() + 24 * 60 * 60 * 1000 : Infinity;
        return ts >= fromTs && ts < toTs;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [logs, statusFilter, campaignFilter, dateRange]);

  /**
   * IntersectionObserver를 통한 무한 스크롤
   */
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => prev + 20);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const visibleLogs = filteredLogs.slice(0, visibleCount);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs</h1>
          <p className="text-gray-600 mt-1">Review AI content generation history and user activities in real time.</p>
        </div>
        <div className="flex gap-3">
          <TailwindButton variant="secondary" onClick={loadLogsData} disabled={isLoading}>
            {isLoading ? '⏳ Loading...' : '🔄 Refresh'}
          </TailwindButton>
          <TailwindButton
            variant="outline"
            onClick={() => {
              const activities = [
                () => logActivity.campaignCreate('Sample campaign'),
                () => logActivity.siteAdd('Sample site', 'https://example.com'),
                () => logActivity.connectionTest('Sample site', true),
                () => logActivity.contentGenerate('Sample content'),
                () => logActivity.settingsChange('Notification preferences')
              ];
              const randomActivity = activities[Math.floor(Math.random() * activities.length)];
              randomActivity();
            }}
          >
            🧪 Trigger demo activity
          </TailwindButton>
          <TailwindButton variant="primary" onClick={() => console.log('Export logs API pending')}>
            📤 Export
          </TailwindButton>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('content')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'content'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📄 Content logs
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activity'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 User activities
          </button>
        </nav>
      </div>

      {/* 콘텐츠 생성 로그 탭 */}
      {activeTab === 'content' && (
        <MainCard>
          {/* 필터 영역 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: 'all', label: 'All' },
                { id: 'success', label: 'Success' },
                { id: 'failed', label: 'Failed' }
              ].map((status) => (
                <button
                  key={status.id}
                  onClick={() => setStatusFilter(status.id)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    statusFilter === status.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>

            <div>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
              >
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                className="border rounded px-3 py-2 text-sm"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                className="border rounded px-3 py-2 text-sm"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <TailwindButton
                variant="ghost"
                onClick={() => {
                  setStatusFilter('all');
                  setCampaignFilter('all');
                  setDateRange({ from: '', to: '' });
                }}
              >
                Reset filters
              </TailwindButton>
            </div>
          </div>

          {/* 로그 테이블 */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">⏳ Loading log entries...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                📝 No log entries to display.
                <br />
                <span className="text-sm">Adjust your filters or run a campaign to collect data.</span>
              </div>
            ) : (
              <table className="w-full table-fixed">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="py-2 pr-4 w-40">Timestamp</th>
                    <th className="py-2 pr-4 w-44">Campaign</th>
                    <th className="py-2 pr-4 w-60">Content title</th>
                    <th className="py-2 pr-4 w-36">Target site</th>
                    <th className="py-2 pr-4 w-32">Keyword</th>
                    <th className="py-2 pr-4 w-24">Status</th>
                    <th className="py-2 pr-4 w-40">Submission URL</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {visibleLogs.map((log) => {
                    // 한글 주석: uploaded_url이 기본 경로이며, 호환성을 위해 과거 published_url 키도 함께 확인
                    const submissionUrl = log.uploaded_url || log.published_url || log.publishedUrl || '';
                    return (
                      <tr key={log.id} className="border-t hover:bg-gray-50">
                        <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                        <td className="py-2 pr-4 truncate" title={log.campaigns?.name || '-'}>
                          {log.campaigns?.name || '-'}
                        </td>
                        <td className="py-2 pr-4 truncate" title={log.content_title}>
                          {submissionUrl ? (
                            <a href={submissionUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {log.content_title}
                            </a>
                          ) : (
                            log.content_title
                          )}
                        </td>
                        <td className="py-2 pr-4 truncate" title={log.target_site}>
                          {log.target_site}
                        </td>
                        <td className="py-2 pr-4 truncate" title={log.keyword}>
                          {log.keyword}
                        </td>
                        <td className="py-2 pr-4">
                          <StatusBadge status={log.status} errorMessage={log.error_message} />
                        </td>
                        <td className="py-2 pr-4 text-gray-600">
                          {submissionUrl ? (
                            <a
                              href={submissionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs break-all"
                            >
                              {submissionUrl}
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {!isLoading && filteredLogs.length > 0 && (
            <>
              <div ref={loadMoreRef} className="h-8" />
              {visibleCount < filteredLogs.length && <div className="text-center text-sm text-gray-500">Loading more...</div>}
            </>
          )}
        </MainCard>
      )}

      {/* 사용자 활동 로그 탭 */}
      {activeTab === 'activity' && (
        <MainCard>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">User activity timeline</h2>
            <p className="text-sm text-gray-600 mt-1">Track sign-ins, campaign updates, site management, and other key user events.</p>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">⏳ Loading activity feed...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">📋 No activity recorded yet.</div>
              <div className="text-sm text-gray-400">New activities will appear here instantly.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div key={activity.id || index} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                  {/* 활동 아이콘 */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${activityAPI.getActivityColor(
                      activity.activity_type
                    )}`}
                  >
                    {activityAPI.getActivityIcon(activity.activity_type)}
                  </div>

                  {/* 활동 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-medium text-gray-900">{activity.description}</div>
                      <div className="text-sm text-gray-500">{getRelativeTimeEnglish(activity.created_at)}</div>
                    </div>

                    <div className="text-sm text-gray-600 mt-1">{formatActivityTimeEnglish(activity.created_at)}</div>

                    {/* 추가 세부 정보 */}
                    {activity.details && (
                      <div className="mt-2 text-xs text-gray-500 bg-gray-100 rounded px-2 py-1">
                        {typeof activity.details === 'object'
                          ? Object.entries(activity.details)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ')
                          : activity.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </MainCard>
      )}
    </div>
  );
}
