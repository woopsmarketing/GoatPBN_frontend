'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '../../../../../components/MainCard';
import TailwindButton from '../../../../../components/ui/TailwindButton';
import { spintaxCampaignsAPI } from '../../../../../lib/api/spintaxCampaigns';

export default function SpintaxCampaignListPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  // 활성 캠페인 폴링 (30초)
  useEffect(() => {
    const hasActive = campaigns.some((c) => c.status === 'active' || c.status === 'pending');
    if (!hasActive) return;

    const interval = setInterval(loadCampaigns, 30000);
    return () => clearInterval(interval);
  }, [campaigns.length]);

  const loadCampaigns = async () => {
    try {
      const result = await spintaxCampaignsAPI.getCampaigns();
      if (result.success) {
        setCampaigns(result.campaigns || []);
      }
    } catch (err) {
      console.error('캠페인 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (id, name) => {
    if (!confirm(`"${name}" 캠페인을 중지하시겠습니까?`)) return;
    try {
      await spintaxCampaignsAPI.stopCampaign(id);
      loadCampaigns();
    } catch (err) {
      alert('중지 실패: ' + err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`"${name}" 캠페인을 삭제하시겠습니까?`)) return;
    try {
      await spintaxCampaignsAPI.deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  const statusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      stopped: 'bg-gray-100 text-gray-600',
      error: 'bg-red-100 text-red-800'
    };
    const labels = {
      active: '실행 중',
      pending: '대기 중',
      completed: '완료',
      stopped: '중지',
      error: '오류'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.pending}`}>{labels[status] || status}</span>
    );
  };

  return (
    <MainCard title="스핀택스 캠페인">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-gray-500">템플릿 기반 스핀택스 캠페인을 관리합니다. 건당 1 크레딧으로 운영됩니다.</p>
        <TailwindButton variant="contained" onClick={() => router.push('/campaigns/spintax')}>
          + 새 스핀택스 캠페인
        </TailwindButton>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">로딩 중...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">아직 생성된 스핀택스 캠페인이 없습니다.</p>
          <TailwindButton variant="outlined" onClick={() => router.push('/campaigns/spintax')}>
            첫 스핀택스 캠페인 만들기
          </TailwindButton>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">이름</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">템플릿</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">상태</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">진행률</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">기간</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">생성일</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">작업</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{c.name}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-[150px] truncate">{c.spintax_templates?.name || '-'}</td>
                  <td className="py-3 px-4 text-center">{statusBadge(c.status)}</td>
                  <td className="py-3 px-4 text-center">
                    {c.completed_count || 0}/{c.quantity}
                  </td>
                  <td className="py-3 px-4 text-center">{c.duration}일</td>
                  <td className="py-3 px-4 text-center text-gray-500">{c.created_at?.split('T')[0]}</td>
                  <td className="py-3 px-4 text-center space-x-2">
                    {(c.status === 'active' || c.status === 'pending') && (
                      <button onClick={() => handleStop(c.id, c.name)} className="text-yellow-600 hover:text-yellow-800 text-xs">
                        중지
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      disabled={c.status === 'active'}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MainCard>
  );
}
