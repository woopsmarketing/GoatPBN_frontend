/**
 * SNC 캠페인 생성 페이지 — Phase 4-B.
 *
 * 입력: name, target_url, external_anchor, selected_sites (체크박스),
 *       keywords (줄바꿈 구분), quantity, duration, schedule_hours (체크박스).
 * 검증: 사이트 1개 이상, 키워드 1개 이상, quantity > 0, duration > 0.
 * 결과: snc_campaigns + snc_campaign_keywords 생성 → 상세 페이지로 이동.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '../../../../../components/MainCard';
import TailwindButton from '../../../../../components/ui/TailwindButton';
import { sncCampaignCreateAPI, sncSitesAPI } from '../../../../../features/snc/api';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DEFAULT_HOURS = [9, 15, 21];

function FieldLabel({ children, required }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required ? <span className="text-red-500 ml-0.5">*</span> : null}
    </label>
  );
}

export default function SncCampaignCreatePage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [externalAnchor, setExternalAnchor] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [quantity, setQuantity] = useState(3);
  const [duration, setDuration] = useState(7);
  const [scheduleHours, setScheduleHours] = useState(DEFAULT_HOURS);
  const [selectedSites, setSelectedSites] = useState([]);

  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sitesError, setSitesError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loadSites = useCallback(async () => {
    setSitesLoading(true);
    setSitesError('');
    const { data, error } = await sncSitesAPI.listEnabled();
    if (error) {
      setSitesError(error.message || '사이트 목록을 불러오지 못했습니다.');
      setSites([]);
    } else {
      setSites(data || []);
    }
    setSitesLoading(false);
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const keywords = useMemo(() => {
    return keywordsText
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter(Boolean);
  }, [keywordsText]);

  const sitesByGroup = useMemo(() => {
    const map = new Map();
    for (const s of sites) {
      const key = s.group_tag || '(기타)';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [sites]);

  const toggleSite = (siteId) => {
    setSelectedSites((prev) => (prev.includes(siteId) ? prev.filter((s) => s !== siteId) : [...prev, siteId]));
  };

  const toggleHour = (h) => {
    setScheduleHours((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h].sort((a, b) => a - b)));
  };

  const validate = () => {
    if (!name.trim()) return '캠페인 이름을 입력하세요.';
    if (!targetUrl.trim()) return '타겟 URL을 입력하세요.';
    try {
      new URL(targetUrl);
    } catch {
      return '타겟 URL 형식이 올바르지 않습니다 (http:// 또는 https:// 포함).';
    }
    if (!externalAnchor.trim()) return '앵커 텍스트를 입력하세요.';
    if (selectedSites.length === 0) return '발행 대상 사이트를 1개 이상 선택하세요.';
    if (keywords.length === 0) return '키워드를 1개 이상 입력하세요.';
    if (!Number.isInteger(quantity) || quantity <= 0) return '발행 수량은 1 이상의 정수여야 합니다.';
    if (keywords.length < quantity) {
      return `키워드 수(${keywords.length})가 발행 수량(${quantity})보다 적습니다.`;
    }
    if (!Number.isInteger(duration) || duration <= 0) return '캠페인 기간은 1일 이상이어야 합니다.';
    if (scheduleHours.length === 0) return '발행 시간대를 1개 이상 선택하세요.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setSubmitError(err);
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    const { data, error } = await sncCampaignCreateAPI.create({
      name: name.trim(),
      targetUrl: targetUrl.trim(),
      externalAnchor: externalAnchor.trim(),
      selectedSites,
      keywords,
      quantity,
      duration,
      scheduleHours,
      status: 'paused' // 생성 시 일단 paused, 사용자가 검토 후 시작
    });
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message || '생성 실패');
      if (data?.id) {
        // 캠페인은 생성됐지만 키워드 등록 실패한 경우
        router.push(`/snc/campaigns/${data.id}`);
      }
      return;
    }
    if (data?.id) {
      router.push(`/snc/campaigns/${data.id}`);
    } else {
      router.push('/snc/campaigns');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <TailwindButton variant="secondary" size="sm" onClick={() => router.push('/snc/campaigns')}>
          ← 목록으로
        </TailwindButton>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <MainCard>
          <div className="space-y-4">
            <div>
              <h1 className="text-lg font-semibold">새 SNC 캠페인 생성</h1>
              <p className="text-xs text-gray-500 mt-0.5">생성 후 일시정지 상태로 시작됩니다. 검토 후 "시작" 버튼으로 활성화하세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>캠페인 이름</FieldLabel>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="예: 2026-Q2 백링크 1차"
                />
              </div>
              <div>
                <FieldLabel required>타겟 URL</FieldLabel>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm font-mono"
                  placeholder="https://example.com/landing"
                />
              </div>
              <div>
                <FieldLabel required>앵커 텍스트</FieldLabel>
                <input
                  type="text"
                  value={externalAnchor}
                  onChange={(e) => setExternalAnchor(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="예: 자세히 보기"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel required>발행 수량 (총)</FieldLabel>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <FieldLabel required>기간 (일)</FieldLabel>
                  <input
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <FieldLabel required>키워드 ({keywords.length}개)</FieldLabel>
              <textarea
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                rows={6}
                className="w-full border rounded px-3 py-2 text-sm font-mono"
                placeholder={'키워드를 줄바꿈 또는 콤마(,)로 구분\n예:\n백링크 전략\nSEO 가이드\n도메인 권한'}
              />
              <p className="text-xs text-gray-500 mt-1">키워드 수가 발행 수량보다 같거나 많아야 합니다 (각 잡당 키워드 1개 사용).</p>
            </div>
          </div>
        </MainCard>

        <MainCard>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FieldLabel required>대상 사이트 ({selectedSites.length}개 선택)</FieldLabel>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => setSelectedSites(sites.map((s) => s.site_id))}
                >
                  전체 선택
                </button>
                <span className="text-gray-300">|</span>
                <button type="button" className="text-gray-500 hover:underline" onClick={() => setSelectedSites([])}>
                  전체 해제
                </button>
              </div>
            </div>

            {sitesLoading ? (
              <div className="text-sm text-gray-500 py-6 text-center">사이트 목록 불러오는 중…</div>
            ) : sitesError ? (
              <div className="text-sm text-red-600">{sitesError}</div>
            ) : sites.length === 0 ? (
              <div className="text-sm text-gray-500 py-6 text-center">활성화된 SNC 사이트가 없습니다.</div>
            ) : (
              <div className="space-y-3">
                {sitesByGroup.map(([group, list]) => (
                  <div key={group}>
                    <div className="text-xs font-medium text-gray-600 mb-1.5">
                      {group} <span className="text-gray-400">({list.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {list.map((s) => {
                        const checked = selectedSites.includes(s.site_id);
                        return (
                          <label
                            key={s.site_id}
                            className={`flex items-start gap-2 border rounded p-2 cursor-pointer text-xs transition-colors ${
                              checked ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                            }`}
                          >
                            <input type="checkbox" checked={checked} onChange={() => toggleSite(s.site_id)} className="mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{s.brand_name || s.site_id}</div>
                              <div className="text-gray-500 truncate font-mono">{s.site_id}</div>
                              {s.topic_focus ? <div className="text-gray-400 truncate mt-0.5">{s.topic_focus}</div> : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </MainCard>

        <MainCard>
          <div className="space-y-2">
            <FieldLabel required>발행 시간대 (KST, {scheduleHours.length}개 선택)</FieldLabel>
            <p className="text-xs text-gray-500">선택된 시간대에 worker가 매 분 스캔하여 잡을 enqueue 합니다.</p>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
              {HOURS.map((h) => {
                const checked = scheduleHours.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggleHour(h)}
                    className={`text-xs py-1.5 rounded border transition-colors ${
                      checked ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {h}시
                  </button>
                );
              })}
            </div>
          </div>
        </MainCard>

        {submitError ? <div className="rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{submitError}</div> : null}

        <div className="flex justify-end gap-2">
          <TailwindButton variant="secondary" onClick={() => router.push('/snc/campaigns')} disabled={submitting}>
            취소
          </TailwindButton>
          <TailwindButton variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '생성 중…' : '캠페인 생성'}
          </TailwindButton>
        </div>
      </form>
    </div>
  );
}
