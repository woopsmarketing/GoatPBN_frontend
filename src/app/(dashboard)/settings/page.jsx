'use client';

// v1.0 - 계정 설정 페이지 (2025.11.20)
// 기능 요약: 시간대/국가 설정 및 자동 감지 토글 제공

import { useEffect, useMemo, useState } from 'react';

import MainCard from '@/components/MainCard';
import {
  TIMEZONE_OPTIONS,
  userTimeZone,
  setUserTimeZone,
  toggleAutoDetect,
  getUserTimeZoneInfo,
  formatToUserTimeZone
} from '@/lib/utils/userTimeZone';
import { authAPI } from '@/lib/supabase';
import { jsonHeaders } from '@/lib/api/httpClient';

export default function SettingsPage() {
  const [autoDetect, setAutoDetect] = useState(() => userTimeZone.getAutoDetectSetting());
  const [selectedTimeZone, setSelectedTimeZone] = useState(() => userTimeZone.getUserTimeZone());
  const [timeZoneInfo, setTimeZoneInfo] = useState(() => getUserTimeZoneInfo());
  const [currentTime, setCurrentTime] = useState(() =>
    formatToUserTimeZone(new Date(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(formatToUserTimeZone(new Date(), { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    const syncState = () => {
      setAutoDetect(userTimeZone.getAutoDetectSetting());
      setSelectedTimeZone(userTimeZone.getUserTimeZone());
      setTimeZoneInfo(getUserTimeZoneInfo());
      updateClock();
    };

    syncState();

    // 백엔드에 저장된 타임존 불러오기
    authAPI
      .getCurrentUser()
      .then(async ({ data, error }) => {
        if (error) return;
        const uid = data?.user?.id;
        if (!uid) return;
        setUserId(uid);
        try {
          const res = await fetch(`/api/user/settings?user_id=${uid}`);
          const payload = await res.json();
          if (payload?.success && payload.settings?.timezone) {
            setUserTimeZone(payload.settings.timezone);
            setAutoDetect(false);
            setSelectedTimeZone(payload.settings.timezone);
            setTimeZoneInfo(getUserTimeZoneInfo());
          }
        } catch (e) {
          console.warn('사용자 설정 조회 실패:', e);
        }
      })
      .catch(() => {});

    const timer = setInterval(updateClock, 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  const handleAutoDetectToggle = () => {
    const next = toggleAutoDetect();
    setAutoDetect(next);
    setSelectedTimeZone(userTimeZone.getUserTimeZone());
    setTimeZoneInfo(getUserTimeZoneInfo());
  };

  const handleTimeZoneChange = (event) => {
    const value = event.target.value;
    setUserTimeZone(value);
    setAutoDetect(false);
    setSelectedTimeZone(value);
    setTimeZoneInfo(getUserTimeZoneInfo());
    setCurrentTime(formatToUserTimeZone(new Date(), { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const detectedLabel = useMemo(() => {
    const detectedOption = TIMEZONE_OPTIONS.find((tz) => tz.value === timeZoneInfo.detected);
    return detectedOption ? detectedOption.label : timeZoneInfo.detected;
  }, [timeZoneInfo]);

  const handleSave = async () => {
    if (!userId) {
      setSaveMessage('로그인 정보를 불러오지 못했습니다.');
      return;
    }
    setSaving(true);
    setSaveMessage('');
    try {
      const resp = await fetch('/api/user/settings/timezone', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ user_id: userId, timezone: selectedTimeZone })
      });
      const payload = await resp.json();
      if (!resp.ok) throw new Error(payload.detail || '저장 실패');
      setSaveMessage(payload.message || '저장되었습니다.');
    } catch (e) {
      setSaveMessage(e.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <MainCard title="계정 설정">
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">🌍 시간대 설정</h3>
            <p className="text-sm text-gray-600">
              캠페인 스케줄과 리포트 시간은 선택한 시간대를 기준으로 표시됩니다. 해외 사이트를 운영 중이라면 현지 시간대에 맞춰 설정하세요.
            </p>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={autoDetect} onChange={handleAutoDetectToggle} />
              브라우저에서 자동 감지
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">선택된 시간대</span>
                <select
                  value={selectedTimeZone}
                  onChange={handleTimeZoneChange}
                  disabled={autoDetect}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label} (UTC {tz.offset})
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-600">
                  현재 시간<span className="ml-2 font-semibold text-gray-900">{currentTime}</span>
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  감지된 시간대: <span className="font-medium text-gray-700">{detectedLabel}</span>
                </p>
                {timeZoneInfo.isDifferentFromDetected && (
                  <p className="mt-1 text-xs text-orange-600">
                    감지된 시간대와 다릅니다. 자동 감지를 다시 켜거나 시간대를 수동으로 확인하세요.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {saving ? '저장 중...' : '저장하기'}
              </button>
              {saveMessage && <span className="text-sm text-gray-700">{saveMessage}</span>}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">🗓️ 예약 캠페인 기준</h3>
            <p className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              캠페인 예약, 크레딧 리포트, 알림 메일은 위에서 설정한 시간대를 기준으로 계산됩니다. 해외 타겟 캠페인을 운영한다면 현지
              시간대와 맞춰 두는 것이 안전합니다.
            </p>
          </section>
        </div>
      </MainCard>

      <MainCard title="알림 & 보안" border={false}>
        <div className="space-y-4 text-sm text-gray-600">
          <p>이메일 알림, 2단계 인증 등은 곧 업데이트될 예정입니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>캠페인 실패 알림, 크레딧 부족 알림을 준비 중입니다.</li>
            <li>향후 IP 화이트리스트, 팀원 초대 기능이 추가됩니다.</li>
          </ul>
        </div>
      </MainCard>
    </div>
  );
}
