'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '../../../components/MainCard';
import TailwindButton from '../../../components/ui/TailwindButton';
import { spintaxAPI } from '../../../lib/api/spintax';

export default function TemplateListPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  // 생성 중인 템플릿 진행률 폴링 (10초 간격)
  useEffect(() => {
    const hasGenerating = templates.some((t) => t.status === 'generating');
    if (!hasGenerating) return;

    const interval = setInterval(() => {
      loadTemplates();
    }, 10000);

    return () => clearInterval(interval);
  }, [templates.length]);

  const loadTemplates = async () => {
    try {
      const result = await spintaxAPI.getTemplates();
      if (result.success) {
        setTemplates(result.templates || []);
      }
    } catch (err) {
      console.error('템플릿 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`"${name}" 템플릿을 삭제하시겠습니까?`)) return;
    try {
      await spintaxAPI.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  const statusBadge = (status, progress) => {
    if (status === 'ready')
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">준비 완료</span>;
    if (status === 'generating')
      return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">생성 중 ({progress || 0}%)</span>;
    if (status === 'error') return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">오류</span>;
    return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">{status}</span>;
  };

  return (
    <MainCard title="스핀택스 템플릿">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-gray-500">키워드 기반 콘텐츠 템플릿을 관리합니다. 템플릿 1개로 무제한 콘텐츠를 생성할 수 있습니다.</p>
        <TailwindButton variant="contained" onClick={() => router.push('/templates/create')}>
          + 새 템플릿
        </TailwindButton>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">로딩 중...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">아직 생성된 템플릿이 없습니다.</p>
          <TailwindButton variant="outlined" onClick={() => router.push('/templates/create')}>
            첫 번째 템플릿 만들기
          </TailwindButton>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">이름</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">키워드</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">상태</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">마스터</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">스핀 횟수</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">생성일</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">작업</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{t.name}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate">{t.main_keyword}</td>
                  <td className="py-3 px-4 text-center">{statusBadge(t.status, t.progress)}</td>
                  <td className="py-3 px-4 text-center">{t.master_count || '-'}</td>
                  <td className="py-3 px-4 text-center">{t.spin_count || 0}</td>
                  <td className="py-3 px-4 text-center text-gray-500">{t.created_at?.split('T')[0]}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDelete(t.id, t.name)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      disabled={t.status === 'generating'}
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

      {templates.some((t) => t.status === 'generating') && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          템플릿 생성 중... 약 40분 소요됩니다. 이 페이지를 닫아도 백그라운드에서 계속 진행됩니다.
        </div>
      )}
    </MainCard>
  );
}
