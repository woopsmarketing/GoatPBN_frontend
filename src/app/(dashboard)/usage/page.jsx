'use client';

// v1.0 - 크레딧 사용량 대시보드 (2025.11.20)
// 기능 요약: logs 테이블 기반으로 최근 사용 내역과 누적 크레딧 소비를 시각화

import { useEffect, useMemo, useState } from 'react';

import MainCard from '@/components/MainCard';
import { authAPI, supabase } from '@/lib/supabase';
import { formatToUserTimeZone } from '@/lib/utils/userTimeZone';

const LOG_LIMIT = 50;

export default function UsagePage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadUsage = async () => {
      try {
        const { data: authData, error: authError } = await authAPI.getCurrentUser();
        if (authError) throw authError;
        const user = authData?.user;
        if (!user) {
          setError('로그인 정보를 찾을 수 없습니다.');
          return;
        }

        const { data, error: logsError } = await supabase
          .from('logs')
          .select('id, content_title, credits_used, status, created_at, uploaded_url, keyword')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(LOG_LIMIT);

        if (logsError) throw logsError;
        if (active) {
          setLogs(data || []);
        }
      } catch (err) {
        console.error('사용량 로드 실패:', err);
        if (active) setError('사용량 데이터를 불러오지 못했습니다.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadUsage();
    return () => {
      active = false;
    };
  }, []);

  const totalUsed = useMemo(() => logs.reduce((acc, cur) => acc + (cur.credits_used || 0), 0), [logs]);
  const totalSuccess = useMemo(() => logs.filter((log) => log.status === 'success').length, [logs]);
  const totalFailed = useMemo(() => logs.filter((log) => log.status === 'failed').length, [logs]);

  const dailyUsage = useMemo(() => {
    return logs.reduce((acc, log) => {
      const key = new Date(log.created_at).toISOString().split('T')[0];
      acc[key] = (acc[key] || 0) + (log.credits_used || 0);
      return acc;
    }, {});
  }, [logs]);

  return (
    <div className="space-y-6">
      <MainCard title="크레딧 사용 요약">
        {loading ? (
          <p className="text-sm text-gray-600">사용량 데이터를 불러오는 중입니다...</p>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">누적 사용 크레딧</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">{totalUsed.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">성공한 콘텐츠</p>
                <p className="mt-2 text-3xl font-bold text-emerald-600">{totalSuccess.toLocaleString()}개</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-4 text-center">
                <p className="text-xs font-medium text-rose-700 uppercase tracking-wide">실패한 시도</p>
                <p className="mt-2 text-3xl font-bold text-rose-600">{totalFailed.toLocaleString()}개</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900">📆 일자별 사용량</h3>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {Object.keys(dailyUsage).length === 0 && <p className="text-sm text-gray-500">아직 생성된 콘텐츠가 없습니다.</p>}
                {Object.entries(dailyUsage)
                  .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                  .slice(0, 9)
                  .map(([date, credits]) => (
                    <div key={date} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                      <span className="font-medium text-gray-700">{formatToUserTimeZone(date, { month: 'numeric', day: 'numeric' })}</span>
                      <span className="font-semibold text-gray-900">{credits.toLocaleString()} 크레딧</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </MainCard>

      <MainCard title="최근 사용 내역">
        {loading ? (
          <p className="text-sm text-gray-600">최근 사용 내역을 불러오는 중입니다...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-600">아직 기록된 사용 내역이 없습니다. 캠페인을 생성하면 자동으로 기록됩니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">생성일</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">키워드</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">상태</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">사용 크레딧</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">게시물 URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{formatToUserTimeZone(log.created_at)}</td>
                    <td className="px-4 py-2 text-gray-700">{log.keyword || '—'}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {log.status === 'success' ? '성공' : '실패'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-gray-900">
                      {(log.credits_used || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {log.uploaded_url ? (
                        <a href={log.uploaded_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          보기
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MainCard>
    </div>
  );
}

