'use client';

// v1.1 - Account settings (English) with Supabase timezone save/load

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

export default function SettingsPageEn() {
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

    // Load saved timezone from backend
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
          console.warn('Failed to fetch user settings:', e);
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

  const handleSave = async () => {
    if (!userId) {
      setSaveMessage('Could not load user info.');
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
      if (!resp.ok) throw new Error(payload.detail || 'Save failed');
      setSaveMessage(payload.message || 'Saved successfully.');
    } catch (e) {
      setSaveMessage(e.message || 'Error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const detectedLabel = useMemo(() => {
    const detectedOption = TIMEZONE_OPTIONS.find((tz) => tz.value === timeZoneInfo.detected);
    return detectedOption ? detectedOption.label : timeZoneInfo.detected;
  }, [timeZoneInfo]);

  return (
    <div className="space-y-6">
      <MainCard title="Account settings">
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">🌍 Timezone settings</h3>
            <p className="text-sm text-gray-600">
              Campaign schedules and reports show in the timezone you select. If you run overseas sites, align the timezone with the local
              region.
            </p>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={autoDetect} onChange={handleAutoDetectToggle} />
              Detect timezone from browser
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Selected timezone</span>
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
                  Current time<span className="ml-2 font-semibold text-gray-900">{currentTime}</span>
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Detected timezone: <span className="font-medium text-gray-700">{detectedLabel}</span>
                </p>
                {timeZoneInfo.isDifferentFromDetected && (
                  <p className="mt-1 text-xs text-orange-600">Different from detected timezone. Toggle auto-detect or verify manually.</p>
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
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saveMessage && <span className="text-sm text-gray-700">{saveMessage}</span>}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">🗓️ Scheduled campaign baseline</h3>
            <p className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              Campaign scheduling, credit reports, and alert emails are based on the timezone above. Match it to your target region when
              running overseas campaigns.
            </p>
          </section>
        </div>
      </MainCard>

      <MainCard title="Alerts & security" border={false}>
        <div className="space-y-4 text-sm text-gray-600">
          <p>Email alerts, two-factor authentication, and other security enhancements will be released soon.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Preparing alerts for campaign failures and credit shortages.</li>
            <li>Planning IP whitelisting and teammate invitation workflows.</li>
          </ul>
        </div>
      </MainCard>
    </div>
  );
}
