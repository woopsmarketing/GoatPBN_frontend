/*
 * 📜 로그 페이지 (MVP)
 * 상태/캠페인/기간 필터, 재시도 버튼(mock), 무한 스크롤을 제공합니다.
 * 사용 예: /logs
 */

'use client';

import { useEffect, useState } from 'react';
import MainCard from '../../../components/MainCard';
import TailwindButton from '../../../components/ui/TailwindButton';
import { logsAPI } from '../../../lib/api/logs';
import { campaignsAPI } from '../../../lib/api/campaigns';
import { activityAPI } from '../../../lib/api/activity';
import { inMemoryActivityLogger, logActivity } from '../../../lib/activity/inMemoryActivityLogger';

function StatusBadge({ status, errorMessage }) {
  const style = status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  const label = status === 'success' ? '성공' : '실패';

  // 실패 사유 (Mock 데이터)
  const failureReasons = {
    'WordPress API 연결 실패': '401 Unauthorized - 인증 정보 확인 필요',
    '콘텐츠 생성 실패': 'AI 모델 응답 오류',
    '네트워크 오류': '타임아웃 - 서버 응답 없음',
    '파일 업로드 실패': '용량 초과 또는 권한 부족',
    '키워드 중복': '동일 키워드로 이미 발행됨'
  };
  const failureReason = status === 'failed' ? failureReasons[errorMessage] || errorMessage || '알 수 없는 오류' : null;

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

export default function LogsPage() {
  const [statusFilter, setStatusFilter] = useState('all'); // all|success|failed
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // 실제 데이터 상태
  const [logs, setLogs] = useState([]);
  const [campaigns, setCampaigns] = useState([{ id: 'all', name: '전체' }]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('content'); // 'content' 또는 'activity'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalLogs, setTotalLogs] = useState(0);

  // 필터 변경 시 페이지 초기화
  useEffect(() => {
    setPage(1);
  }, [statusFilter, campaignFilter, dateRange.from, dateRange.to]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  // 데이터 로드
  useEffect(() => {
    loadLogsData();
  }, [statusFilter, campaignFilter, dateRange.from, dateRange.to, page, pageSize]);

  // 실시간 활동 로그 업데이트
  useEffect(() => {
    const handleActivityUpdate = (newActivity) => {
      setActivities((prev) => [newActivity, ...prev.slice(0, 99)]); // 최대 100개 유지
    };

    // 활동 로그 리스너 등록
    inMemoryActivityLogger.addListener(handleActivityUpdate);

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      inMemoryActivityLogger.removeListener(handleActivityUpdate);
    };
  }, []);

  const loadLogsData = async () => {
    try {
      setIsLoading(true);

      // 로그, 캠페인 데이터 로드 (활동은 인메모리에서 가져옴)
      const [logsResult, campaignsResult] = await Promise.all([
        logsAPI.getAllLogs({
          status: statusFilter,
          campaignId: campaignFilter !== 'all' ? campaignFilter : null,
          startDate: dateRange.from || null,
          endDate: dateRange.to || null,
          page,
          pageSize
        }),
        campaignsAPI.getCampaignsWithSites()
      ]);

      if (!logsResult.error) {
        setLogs(logsResult.data || []);
        setTotalLogs(logsResult.count ?? (logsResult.data?.length || 0));
      }

      if (!campaignsResult.error) {
        const campaignList = (campaignsResult.data || []).map((c) => ({
          id: c.id,
          name: c.name
        }));
        setCampaigns([{ id: 'all', name: '전체' }, ...campaignList]);
      }

      // 인메모리 활동 로그 가져오기
      const inMemoryActivities = inMemoryActivityLogger.getRecentActivities(100);
      setActivities(inMemoryActivities);

      console.log('📝 로그 데이터 로드 완료:', logsResult.data?.length || 0, '개');
      console.log('📋 활동 로그 로드 완료:', inMemoryActivities.length, '개 (인메모리)');
    } catch (error) {
      console.error('로그 데이터 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // UTC 시간을 클라이언트 시간대로 자동 변환
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Invalid Date';

    try {
      console.log('🔍 원본 시간 데이터:', dateString);

      // UTC 시간으로 파싱 (백엔드에서 UTC로 저장됨)
      const utcDate = new Date(dateString);

      // 유효한 날짜인지 확인
      if (isNaN(utcDate.getTime())) {
        console.warn('❌ Invalid date detected:', dateString);
        return 'Invalid Date';
      }

      // 클라이언트의 로컬 시간대로 자동 변환하여 표시
      const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localTime = utcDate.toLocaleString('ko-KR', {
        timeZone: clientTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      console.log('🌍 시간대 변환:', {
        original: dateString,
        utc: utcDate.toISOString(),
        clientTimeZone: clientTimeZone,
        displayed: localTime
      });

      return localTime;
    } catch (error) {
      console.error('❌ 시간 포맷팅 오류:', error, 'Input:', dateString);
      return 'Invalid Date';
    }
  };

  const pageCount = Math.max(1, Math.ceil(totalLogs / pageSize));

  // handleRetry 함수는 현재 사용하지 않음 (액션 컬럼 제거로 인해)
  // const handleRetry = (log) => {
  //   console.log('API 구현중 - 재시도', log.id);
  // };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">로그</h1>
          <p className="text-gray-600 mt-1">콘텐츠 생성 기록과 사용자 활동 로그를 확인하세요.</p>
        </div>
        <div className="flex gap-3">
          <TailwindButton variant="secondary" onClick={loadLogsData} disabled={isLoading}>
            {isLoading ? '⏳ 로딩중...' : '🔄 새로고침'}
          </TailwindButton>
          <TailwindButton
            variant="outline"
            onClick={() => {
              const activities = [
                () => logActivity.campaignCreate('테스트 캠페인'),
                () => logActivity.siteAdd('테스트 사이트', 'https://test.com'),
                () => logActivity.connectionTest('테스트 사이트', true),
                () => logActivity.contentGenerate('테스트 콘텐츠'),
                () => logActivity.settingsChange('알림 설정')
              ];
              const randomActivity = activities[Math.floor(Math.random() * activities.length)];
              randomActivity();
            }}
          >
            🧪 테스트 활동
          </TailwindButton>
          <TailwindButton variant="primary" onClick={() => console.log('API 구현중 - 로그 내보내기')}>
            📤 내보내기
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
            📄 콘텐츠 생성 로그
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activity'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 사용자 활동 로그
          </button>
        </nav>
      </div>

      {/* 콘텐츠 생성 로그 탭 */}
      {activeTab === 'content' && (
        <MainCard>
          {/* 필터 영역 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            {/* 상태 필터 */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: 'all', label: '전체' },
                { id: 'success', label: '성공' },
                { id: 'failed', label: '실패' }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    statusFilter === s.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* 캠페인 필터 */}
            <div>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 기간 필터 */}
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

            {/* 필터 초기화 */}
            <div className="flex items-center">
              <TailwindButton
                variant="ghost"
                onClick={() => {
                  setStatusFilter('all');
                  setCampaignFilter('all');
                  setDateRange({ from: '', to: '' });
                }}
              >
                필터 초기화
              </TailwindButton>
            </div>
          </div>

          {/* 로그 테이블 */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">⏳ 로그를 불러오는 중...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                📝 표시할 로그가 없습니다.
                <br />
                <span className="text-sm">필터 조건을 변경하거나 콘텐츠를 생성해보세요.</span>
              </div>
            ) : (
              <table className="w-full table-fixed">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="py-2 pr-4 w-32">시간</th>
                    <th className="py-2 pr-4 w-40">캠페인</th>
                    <th className="py-2 pr-4 w-48">제목</th>
                    <th className="py-2 pr-4 w-32">타겟</th>
                    <th className="py-2 pr-4 w-28">키워드</th>
                    <th className="py-2 pr-4 w-20">상태</th>
                    <th className="py-2 pr-4 w-40">제출 URL</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {logs.map((log) => {
                    // 한글 주석: Supabase logs 테이블의 uploaded_url(구 published_url)을 우선적으로 사용
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

          {/* 페이징 컨트롤 */}
          {!isLoading && logs.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 text-sm text-gray-600">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  총 {totalLogs}개 · 페이지 {page} / {pageCount}
                </span>
                <span>페이지 크기</span>
                <select
                  className="border rounded px-2 py-1"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                  }}
                >
                  {[10, 20, 30, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}개
                    </option>
                  ))}
                </select>
                <button
                  className="px-3 py-1 rounded border bg-white"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                >
                  이전
                </button>
                <button
                  className="px-3 py-1 rounded border bg-white"
                  onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                  disabled={page >= pageCount}
                >
                  다음
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNum) => {
                  if (pageNum <= 2 || pageNum > pageCount - 2 || Math.abs(pageNum - page) <= 1) {
                    return (
                      <button
                        key={pageNum}
                        className={`px-2 py-1 rounded border ${
                          pageNum === page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'
                        }`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === 3 && page > 4) {
                    return <span key="start-ellipsis">…</span>;
                  }
                  if (pageNum === pageCount - 2 && page < pageCount - 3) {
                    return <span key="end-ellipsis">…</span>;
                  }
                  return null;
                })}
              </div>
            </div>
          )}
        </MainCard>
      )}

      {/* 사용자 활동 로그 탭 */}
      {activeTab === 'activity' && (
        <MainCard>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">사용자 활동 로그</h2>
            <p className="text-sm text-gray-600 mt-1">로그인, 캠페인 관리, 사이트 설정 등의 사용자 활동 기록</p>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">⏳ 활동 로그를 불러오는 중...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">📋 활동 로그가 없습니다</div>
              <div className="text-sm text-gray-400">사용자 활동이 기록되면 여기에 표시됩니다</div>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div key={activity.id || index} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                  {/* 활동 아이콘 */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${activityAPI.getActivityColor(activity.activity_type)}`}
                  >
                    {activityAPI.getActivityIcon(activity.activity_type)}
                  </div>

                  {/* 활동 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-medium text-gray-900">{activity.description}</div>
                      <div className="text-sm text-gray-500">{activityAPI.getRelativeTime(activity.created_at)}</div>
                    </div>

                    <div className="text-sm text-gray-600 mt-1">{activityAPI.formatKoreanTime(activity.created_at)}</div>

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
