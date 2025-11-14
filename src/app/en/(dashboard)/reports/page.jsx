'use client';

// v1.1 - 영어 결과 보고서 페이지 전용 구현 (2025.11.13)
// 기능 요약: 캠페인 리포트를 영어 UI로 제공하고 CSV 내보내기를 지원

import { useCallback, useEffect, useMemo, useState } from 'react';
import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import { campaignsAPI } from '@/lib/api/campaigns';
import { logsAPI } from '@/lib/api/logs';

/**
 * CSV 내보내기 유틸 (영문 로그용)
 */
function exportToCsv(filename, rows) {
  try {
    if (!rows.length) {
      console.warn('No data available for CSV export.');
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
  } catch (error) {
    console.error('CSV export failed:', error);
  }
}

/**
 * 숫자 변환 유틸
 */
function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 캠페인 데이터 정규화
 */
function normalizeCampaign(campaign) {
  const quantity = toNumber(campaign.quantity);
  const completedCount = toNumber(campaign.completed_count);
  return {
    id: campaign.id,
    name: campaign.name || 'Untitled campaign',
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

/**
 * 로그 데이터 정규화
 */
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

/**
 * 진행률 계산
 */
function getProgress(campaign) {
  if (!campaign) return 0;
  if (typeof campaign.progressRatio === 'number') return campaign.progressRatio;
  if (!campaign.quantity) return 0;
  const ratio = Math.min(100, Math.round((campaign.completedCount / campaign.quantity) * 100));
  return Number.isFinite(ratio) ? ratio : 0;
}

/**
 * 경과 일수 계산
 */
function getElapsedDays(campaign) {
  if (!campaign?.startedAt) return 0;
  const start = new Date(campaign.startedAt);
  const now = new Date();
  const diffTime = Math.abs(now - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 일일 평균 생성량 계산
 */
function getDailyAverage(campaign, elapsedOverride) {
  const elapsed = elapsedOverride ?? getElapsedDays(campaign);
  if (elapsed === 0) return 0;
  return Math.round((campaign.completedCount / elapsed) * 10) / 10;
}

/**
 * 예상 완료일 계산
 */
function getEstimatedCompletion(campaign) {
  const remaining = campaign.quantity - campaign.completedCount;
  const dailyAvg = getDailyAverage(campaign);
  if (dailyAvg === 0) return 'Not available';
  const remainingDays = Math.ceil(remaining / dailyAvg);
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + remainingDays);
  return completionDate.toLocaleDateString('en-US');
}

/**
 * 📊 ReportsPageEn - 영문 보고서 페이지
 */
export default function ReportsPageEn() {
  // 상태 관리
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [campaignData, setCampaignData] = useState([]);
  const [successLogs, setSuccessLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Supabase에서 리포트 데이터 로드
   */
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
      console.error('Failed to load report data:', fetchError);
      setError(fetchError.message || 'Unable to fetch campaign reports.');
      setCampaignData([]);
      setSuccessLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  /**
   * 필터 적용 캠페인 목록
   */
  const campaigns = useMemo(() => {
    return campaignData
      .filter((campaign) =>
        statusFilter === 'all' ? true : statusFilter === 'active' ? campaign.status === 'active' : campaign.status === 'completed'
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [campaignData, statusFilter]);

  /**
   * 전체 요약 CSV 데이터
   */
  const rowsForExportAll = useMemo(() => {
    return campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      targetSite: campaign.targetSite,
      keywords: (campaign.keywords || []).join('|'),
      quantity: campaign.quantity,
      completedCount: campaign.completedCount,
      progressPercent: getProgress(campaign),
      durationDays: campaign.duration,
      createdAt: campaign.createdAt,
      startedAt: campaign.startedAt,
      estimatedCompletion: getEstimatedCompletion(campaign),
      completedAt: campaign.completedAt || ''
    }));
  }, [campaigns]);

  /**
   * 개별 캠페인 CSV 내보내기
   */
  const handleExportCampaign = (campaign) => {
    const logs = successLogs
      .filter((log) => log.campaignId === campaign.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 200);

    const rows = logs.map((log, index) => ({
      no: index + 1,
      time: new Date(log.createdAt).toLocaleString('en-US', { timeZone: 'UTC' }),
      campaign: campaign.name,
      target_site: log.targetSite || '',
      keyword: log.keyword || '',
      uploaded_url: log.uploadedUrl || '',
      status: log.status
    }));

    exportToCsv(`campaign_${campaign.id}_report.csv`, rows.length ? rows : [{ notice: 'No data' }]);
  };

  /**
   * 전체 캠페인 CSV 내보내기
   */
  const handleExportAll = () => {
    exportToCsv('all_campaigns_summary.csv', rowsForExportAll.length ? rowsForExportAll : [{ notice: 'No data' }]);
  };

  /**
   * 캠페인별 성공 로그 조회
   */
  const getSuccessLogs = (campaignId) => {
    return successLogs
      .filter((log) => log.campaignId === campaignId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Monitor campaign performance, review detailed logs, and export CSV summaries for stakeholders.
          </p>
        </div>
        <div className="flex gap-3">
          <TailwindButton variant="secondary" onClick={fetchReportsData}>
            🔄 Refresh data
          </TailwindButton>
          <TailwindButton variant="primary" onClick={handleExportAll}>
            📥 Download all campaigns (CSV)
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
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'completed', label: 'Completed' }
            ].map((status) => (
              <button
                key={status.id}
                onClick={() => setStatusFilter(status.id)}
                className={`px-3 py-1 rounded-full text-sm border ${statusFilter === status.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
              >
                {status.label}
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-600">
            Total {campaigns.length} campaigns | Active: {campaigns.filter((campaign) => campaign.status === 'active').length} | Completed:{' '}
            {campaigns.filter((campaign) => campaign.status === 'completed').length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2 pr-4 w-12">#</th>
                <th className="py-2 pr-4 w-80">Campaign</th>
                <th className="py-2 pr-4 w-24">Target</th>
                <th className="py-2 pr-4 w-24">Total</th>
                <th className="py-2 pr-4 w-28">Completed</th>
                <th className="py-2 pr-4 w-24">Progress</th>
                <th className="py-2 pr-4 w-32">Status</th>
                <th className="py-2 pr-4 w-40">Duration</th>
                <th className="py-2 pr-4 w-32">Daily avg.</th>
                <th className="py-2 pr-4 w-64">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-10 text-center text-gray-500">
                    Loading campaign report...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-gray-500">
                    No campaigns to display. Create a new campaign to get started.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign, index) => (
                  <tr key={campaign.id} className="border-t align-top">
                    <td className="py-2 pr-4">{index + 1}</td>
                    <td className="py-2 pr-4">
                      <div className="font-medium text-gray-900 truncate" title={campaign.name}>
                        {campaign.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate" title={campaign.targetSite}>
                        Target: {campaign.targetSite || 'Not specified'}
                      </div>
                      {campaign.keywords?.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1 truncate" title={campaign.keywords.join(', ')}>
                          Keywords: {campaign.keywords.slice(0, 3).join(', ')}
                          {campaign.keywords.length > 3 ? ' ...' : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-4">{campaign.targetSite || '-'}</td>
                    <td className="py-2 pr-4">{campaign.quantity}</td>
                    <td className="py-2 pr-4">{campaign.completedCount}</td>
                    <td className="py-2 pr-4">{getProgress(campaign)}%</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          campaign.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {campaign.status === 'completed' ? 'Completed' : campaign.status === 'active' ? 'Active' : 'Scheduled'}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="text-sm">
                        {getElapsedDays(campaign)} days / {campaign.duration} days
                      </div>
                      {campaign.status === 'active' && <div className="text-xs text-gray-500">ETA: {getEstimatedCompletion(campaign)}</div>}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="text-sm">{getDailyAverage(campaign)} posts/day</div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TailwindButton
                          variant="secondary"
                          onClick={() => setExpanded((prev) => ({ ...prev, [campaign.id]: !prev[campaign.id] }))}
                          className="whitespace-nowrap"
                        >
                          {expanded[campaign.id] ? 'Collapse' : 'View details'}
                        </TailwindButton>
                        <TailwindButton variant="primary" onClick={() => handleExportCampaign(campaign)} className="whitespace-nowrap">
                          📥 Download (CSV)
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
        campaigns.map((campaign) =>
          expanded[campaign.id] ? (
            <MainCard key={`detail-${campaign.id}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">{campaign.name} · Detailed report</h2>
                <TailwindButton variant="ghost" onClick={() => setExpanded((prev) => ({ ...prev, [campaign.id]: false }))}>
                  Close
                </TailwindButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 rounded bg-gray-50">
                  <div className="text-xs text-gray-500">Progress</div>
                  <div className="text-xl font-bold">{getProgress(campaign)}%</div>
                </div>
                <div className="p-3 rounded bg-gray-50">
                  <div className="text-xs text-gray-500">Total vs completed</div>
                  <div className="text-xl font-bold">
                    {campaign.quantity} / {campaign.completedCount}
                  </div>
                </div>
                <div className="p-3 rounded bg-gray-50">
                  <div className="text-xs text-gray-500">Elapsed / planned</div>
                  <div className="text-xl font-bold">
                    {getElapsedDays(campaign)} days / {campaign.duration} days
                  </div>
                </div>
                <div className="p-3 rounded bg-gray-50">
                  <div className="text-xs text-gray-500">Daily average</div>
                  <div className="text-xl font-bold">{getDailyAverage(campaign)} posts/day</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="py-2 pr-4 w-40">Timestamp</th>
                      <th className="py-2 pr-4 w-80">Title</th>
                      <th className="py-2 pr-4 w-40">Target site</th>
                      <th className="py-2 pr-4 w-32">Keyword</th>
                      <th className="py-2 pr-4 w-60">Published URL</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {getSuccessLogs(campaign.id).map((log) => (
                      <tr key={log.id} className="border-t">
                        <td className="py-2 pr-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('en-US')}</td>
                        <td className="py-2 pr-4 truncate max-w-[400px]" title={log.contentTitle || ''}>
                          {log.contentTitle || '-'}
                        </td>
                        <td className="py-2 pr-4 truncate" title={log.targetSite || ''}>
                          {log.targetSite || '-'}
                        </td>
                        <td className="py-2 pr-4 truncate" title={log.keyword || ''}>
                          {log.keyword || '-'}
                        </td>
                        <td className="py-2 pr-4">
                          <a
                            href={log.uploadedUrl || (log.targetSite ? `https://${log.targetSite}` : '#')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-blue-600 hover:text-blue-800 underline truncate block max-w-[220px] ${
                              log.uploadedUrl || log.targetSite ? '' : 'pointer-events-none text-gray-400 hover:text-gray-400'
                            }`}
                            title={log.uploadedUrl || log.targetSite || 'No URL available'}
                          >
                            {log.uploadedUrl || log.targetSite || 'No URL available'}
                          </a>
                        </td>
                      </tr>
                    ))}
                    {getSuccessLogs(campaign.id).length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-4 text-center text-gray-500">
                          No successful content yet.
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
