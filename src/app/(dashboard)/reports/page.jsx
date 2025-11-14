'use client';

// v1.1 - Supabase 연동 보고서 페이지 (2025-11-12)
// - Supabase 캠페인/로그 데이터를 실시간으로 조회
// - 캠페인별 진행 현황 및 최근 성공 로그 표시
// - CSV 다운로드는 프론트에서 직접 생성 (운영 API 연동 전까지 임시 방식)

import { useCallback, useEffect, useMemo, useState } from 'react';
import MainCard from '../../../components/MainCard';
import TailwindButton from '../../../components/ui/TailwindButton';
import { campaignsAPI } from '../../../lib/api/campaigns';
import { logsAPI } from '../../../lib/api/logs';

// CSV 내보내기 유틸
function exportToCsv(filename, rows) {
  try {
    if (!rows.length) {
      console.warn('CSV 변환 대상 데이터가 없습니다.');
      return;
    }

    const processRow = (row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');

    const headers = Object.keys(rows[0] || {});

    const csvRows = rows.map((row) => processRow(headers.map((key) => row[key])));
    const csvContent = '\ufeff' + [processRow(headers), ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error('CSV 내보내기 오류:', e);
  }
}

// 안전한 숫자 변환
function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// 캠페인 데이터 정규화
function normalizeCampaign(campaign) {
  const quantity = toNumber(campaign.quantity);
  const completedCount = toNumber(campaign.completed_count);
  return {
    id: campaign.id,
    name: campaign.name || '이름 없는 캠페인',
    status: campaign.status || 'pending',
    targetSite: campaign.target_site || '',
    keywords: Array.isArray(campaign.keywords) ? campaign.keywords : [],
    quantity,
    completedCount,
    duration: toNumber(campaign.duration),
    startedAt: campaign.started_at,
    createdAt: campaign.created_at,
    completedAt: campaign.completed_at,
    nextExecutionAt: campaign.next_execution_at,
    dailyTarget: toNumber(campaign.daily_target),
    progressRatio: quantity > 0 ? Math.min(100, Math.round((completedCount / quantity) * 100)) : 0
  };
}

// 로그 데이터 정규화
function normalizeLog(log) {
  return {
    id: log.id,
    campaignId: log.campaign_id,
    campaignName: log.campaign?.name || log.campaign_name || '',
    contentTitle: log.content_title,
    targetSite: log.target_site,
    keyword: log.keyword,
    status: log.status,
    uploadedUrl: log.uploaded_url || log.published_url || log.publishedUrl,
    createdAt: log.created_at,
    errorMessage: log.error_message || ''
  };
}

// 진행률 계산
function getProgress(campaign) {
  if (!campaign) return 0;
  if (typeof campaign.progressRatio === 'number') return campaign.progressRatio;
  if (!campaign.quantity) return 0;
  const ratio = Math.min(100, Math.round((campaign.completedCount / campaign.quantity) * 100));
  return Number.isFinite(ratio) ? ratio : 0;
}

// 경과 일수 계산
function getElapsedDays(campaign) {
  if (!campaign?.startedAt) return 0;
  const start = new Date(campaign.startedAt);
  const now = new Date();
  const diffTime = Math.abs(now - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 일일 평균 생성량 계산
function getDailyAverage(campaign, elapsedOverride) {
  const elapsed = elapsedOverride ?? getElapsedDays(campaign);
  if (elapsed === 0) return 0;
  return Math.round((campaign.completedCount / elapsed) * 10) / 10;
}

// 예상 완료일 계산
function getEstimatedCompletion(campaign) {
  const remaining = campaign.quantity - campaign.completedCount;
  const dailyAvg = getDailyAverage(campaign);
  if (dailyAvg === 0) return '계산 불가';
  const remainingDays = Math.ceil(remaining / dailyAvg);
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + remainingDays);
  return completionDate.toLocaleDateString('ko-KR');
}

export default function ReportsPage() {
  // 상태 관리
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [campaignData, setCampaignData] = useState([]);
  const [successLogs, setSuccessLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Supabase에서 데이터 로드
  const fetchReportsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [campaignRes, logRes] = await Promise.all([campaignsAPI.getCampaigns(), logsAPI.getAllLogs({ status: 'success' })]);

      if (campaignRes.error) {
        throw new Error(campaignRes.error);
      }
      if (logRes.error) {
        throw new Error(logRes.error);
      }

      const normalizedCampaigns = (campaignRes.data || []).map(normalizeCampaign);
      const normalizedLogs = (logRes.data || []).map(normalizeLog);

      setCampaignData(normalizedCampaigns);
      setSuccessLogs(normalizedLogs);
      setExpanded({});
    } catch (fetchError) {
      console.error('결과 보고서 데이터 로드 오류:', fetchError);
      setError(fetchError.message || '보고서 데이터를 불러오지 못했습니다.');
      setCampaignData([]);
      setSuccessLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  // 필터 적용
  const campaigns = useMemo(() => {
    return campaignData
      .filter((c) => (statusFilter === 'all' ? true : statusFilter === 'active' ? c.status === 'active' : c.status === 'completed'))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [campaignData, statusFilter]);

  // CSV 요약 데이터
  const rowsForExportAll = useMemo(() => {
    return campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      targetSite: c.targetSite,
      keywords: (c.keywords || []).join('|'),
      quantity: c.quantity,
      completedCount: c.completedCount,
      progressPercent: getProgress(c),
      durationDays: c.duration,
      createdAt: c.createdAt,
      startedAt: c.startedAt,
      estimatedCompletion: getEstimatedCompletion(c),
      completedAt: c.completedAt || ''
    }));
  }, [campaigns]);

  // 개별 CSV
  const handleExportCampaign = (campaign) => {
    const logs = successLogs
      .filter((l) => l.campaignId === campaign.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 200);

    const rows = logs.map((l, index) => ({
      no: index + 1,
      time: new Date(l.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      campaign: campaign.name,
      target_site: l.targetSite || '',
      keyword: l.keyword || '',
      uploaded_url: l.uploadedUrl || '',
      status: l.status
    }));

    exportToCsv(`campaign_${campaign.id}_report.csv`, rows.length ? rows : [{ 안내: '데이터 없음' }]);
  };

  // 전체 CSV
  const handleExportAll = () => {
    exportToCsv('all_campaigns_summary.csv', rowsForExportAll.length ? rowsForExportAll : [{ notice: '데이터 없음' }]);
  };

  // 캠페인별 성공 로그
  const getSuccessLogs = (campaignId) => {
    return successLogs
      .filter((l) => l.campaignId === campaignId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">결과 보고서</h1>
          <p className="text-gray-600 mt-1">캠페인별 진행 현황과 결과를 확인하고 엑셀로 내려받으세요.</p>
        </div>
        <div className="flex gap-3">
          <TailwindButton variant="secondary" onClick={() => console.log('API 구현중 - 전체 보고서 생성')}>
            📊 전체 보고서 생성
          </TailwindButton>
          <TailwindButton variant="primary" onClick={handleExportAll}>
            📥 전체 캠페인 다운로드(CSV)
          </TailwindButton>
        </div>
      </div>

      {error && (
        <MainCard>
          <div className="py-10 text-center text-red-600 text-sm">⚠️ {error}</div>
        </MainCard>
      )}

      <MainCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'all', label: '전체' },
              { id: 'active', label: '진행중' },
              { id: 'completed', label: '완료' }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1 rounded-full text-sm border ${statusFilter === s.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-600">
            총 {campaigns.length}개 캠페인 | 진행중: {campaigns.filter((c) => c.status === 'active').length}개 | 완료:{' '}
            {campaigns.filter((c) => c.status === 'completed').length}개
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2 pr-4 w-12">#</th>
                <th className="py-2 pr-4 w-80">캠페인</th>
                <th className="py-2 pr-4 w-24">총량</th>
                <th className="py-2 pr-4 w-28">완료</th>
                <th className="py-2 pr-4 w-24">진행률</th>
                <th className="py-2 pr-4 w-32">상태</th>
                <th className="py-2 pr-4 w-40">기간</th>
                <th className="py-2 pr-4 w-32">일평균</th>
                <th className="py-2 pr-4 w-64">액션</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-gray-500">
                    보고서 데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-500">
                    표시할 캠페인이 없습니다. 새로운 캠페인을 생성해 주세요.
                  </td>
                </tr>
              ) : (
                campaigns.map((c, idx) => (
                  <tr key={c.id} className="border-t align-top">
                    <td className="py-2 pr-4">{idx + 1}</td>
                    <td className="py-2 pr-4">
                      <div className="font-medium text-gray-900 truncate" title={c.name}>
                        {c.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate" title={c.targetSite}>
                        타겟: {c.targetSite || '미지정'}
                      </div>
                    </td>
                    <td className="py-2 pr-4">{c.quantity}</td>
                    <td className="py-2 pr-4">{c.completedCount}</td>
                    <td className="py-2 pr-4">{getProgress(c)}%</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          c.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {c.status === 'completed' ? '완료' : '진행중'}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="text-sm">
                        {getElapsedDays(c)}일 / {c.duration}일
                      </div>
                      {c.status === 'active' && <div className="text-xs text-gray-500">예상완료: {getEstimatedCompletion(c)}</div>}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="text-sm">{getDailyAverage(c)}개/일</div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TailwindButton
                          variant="secondary"
                          onClick={() => setExpanded((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                          className="whitespace-nowrap"
                        >
                          {expanded[c.id] ? '간단히' : '자세히'}
                        </TailwindButton>
                        <TailwindButton variant="primary" onClick={() => handleExportCampaign(c)} className="whitespace-nowrap">
                          📥 캠페인 다운로드(CSV)
                        </TailwindButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </MainCard>

      {!loading &&
        campaigns.map((c) =>
          expanded[c.id] ? (
            <MainCard key={`detail-${c.id}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">{c.name} - 상세</h2>
                <TailwindButton variant="ghost" onClick={() => setExpanded((prev) => ({ ...prev, [c.id]: false }))}>
                  닫기
                </TailwindButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 rounded bg-gray-50">
                  <div className="text-xs text-gray-500">진행률</div>
                  <div className="text-xl font-bold">{getProgress(c)}%</div>
                </div>
                <div className="p-3 rounded bg-gray-50">
                  <div className="text-xs text-gray-500">총량 / 완료</div>
                  <div className="text-xl font-bold">
                    {c.quantity} / {c.completedCount}
                  </div>
                </div>
                <div className="p-3 rounded bg-gray-50">
                  <div className="text-xs text-gray-500">경과 / 설정 기간</div>
                  <div className="text-xl font-bold">
                    {getElapsedDays(c)}일 / {c.duration}일
                  </div>
                </div>
                <div className="p-3 rounded bg-gray-50">
                  <div className="text-xs text-gray-500">일평균 생성량</div>
                  <div className="text-xl font-bold">{getDailyAverage(c)}개/일</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="py-2 pr-4 w-40">시간</th>
                      <th className="py-2 pr-4 w-80">제목</th>
                      <th className="py-2 pr-4 w-40">타겟</th>
                      <th className="py-2 pr-4 w-32">키워드</th>
                      <th className="py-2 pr-4 w-60">발행 주소</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {getSuccessLogs(c.id).map((l) => (
                      <tr key={l.id} className="border-t">
                        <td className="py-2 pr-4 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('ko-KR')}</td>
                        <td className="py-2 pr-4 truncate max-w-[400px]" title={l.contentTitle || ''}>
                          {l.contentTitle || '-'}
                        </td>
                        <td className="py-2 pr-4 truncate" title={l.targetSite || ''}>
                          {l.targetSite || '-'}
                        </td>
                        <td className="py-2 pr-4 truncate" title={l.keyword || ''}>
                          {l.keyword || '-'}
                        </td>
                        <td className="py-2 pr-4">
                          <a
                            href={l.uploadedUrl || (l.targetSite ? `https://${l.targetSite}` : '#')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-blue-600 hover:text-blue-800 underline truncate block max-w-[220px] ${
                              l.uploadedUrl || l.targetSite ? '' : 'pointer-events-none text-gray-400 hover:text-gray-400'
                            }`}
                            title={l.uploadedUrl || l.targetSite || 'URL 없음'}
                          >
                            {l.uploadedUrl || l.targetSite || 'URL 없음'}
                          </a>
                        </td>
                      </tr>
                    ))}
                    {getSuccessLogs(c.id).length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-4 text-center text-gray-500">
                          성공한 콘텐츠가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </MainCard>
          ) : null
        )}
    </div>
  );
}
