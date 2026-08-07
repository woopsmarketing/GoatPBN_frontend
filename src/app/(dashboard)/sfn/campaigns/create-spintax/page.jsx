/**
 * SFN 스핀택스 캠페인 생성 페이지 (2026-07-30).
 *
 * 기존 LLM 캠페인(create/page.jsx)과 다른 점:
 *   - 키워드 입력 없음 — 스핀택스 템플릿에 이미 키워드가 내장돼 있다.
 *   - 타겟 URL 을 제한 없이 여러 개 넣는다(칩 리스트). 한 글은 그중 랜덤 1개 사이트로
 *     모든 외부링크가 통일되고(single_target), 글마다는 랜덤이라 전체적으로 고루 분산된다.
 *   - 대표이미지(썸네일) 자동 생성 + 발행 상태(초안/공개) 옵션.
 *   - 콘텐츠 생성 비용 0(스핀 엔진, LLM 0콜). 배경 이미지는 1회 생성분 재사용.
 *
 * 저장: sfn_campaigns.target_url 에 설정 JSON 을 담는다(zero-DDL). 워커의
 *       sfn.scan_spintax_campaigns 가 이를 읽어 자동 발행한다.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '../../../../../components/MainCard';
import TailwindButton from '../../../../../components/ui/TailwindButton';
import { sfnSitesAPI, sfnSpintaxTemplatesAPI, sfnSpintaxCampaignCreateAPI } from '../../../../../features/sfn/api';

const GROUP_LABELS = { 'sfn-own': '자사 PBN', 'sfn-client': '고객 PBN', 'sfn-client2': '타사 PBN 2', sfn: 'SFN' };
const GROUP_ORDER = { 'sfn-own': 0, 'sfn-client': 1, 'sfn-client2': 2 };

function FieldLabel({ children, required }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required ? <span className="text-red-500 ml-0.5">*</span> : null}
    </label>
  );
}

function normalizeUrl(raw) {
  const s = (raw || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

export default function SfnSpintaxCampaignCreatePage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [template, setTemplate] = useState('');

  const [urlInput, setUrlInput] = useState('');
  const [urls, setUrls] = useState([]);

  const [quantity, setQuantity] = useState(10);
  const [duration, setDuration] = useState(7);
  const [publishStatus, setPublishStatus] = useState('published');
  const [singleTarget, setSingleTarget] = useState(true);
  const [includeImage, setIncludeImage] = useState(true);

  const [selectedSites, setSelectedSites] = useState([]);
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sitesError, setSitesError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loadSites = useCallback(async () => {
    setSitesLoading(true);
    setSitesError('');
    const { data, error } = await sfnSitesAPI.listEnabled();
    if (error) {
      setSitesError(error.message || '사이트 목록을 불러오지 못했습니다.');
      setSites([]);
    } else {
      setSites(data || []);
    }
    setSitesLoading(false);
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    const { data } = await sfnSpintaxTemplatesAPI.list();
    const list = data || [];
    setTemplates(list);
    if (list.length > 0) setTemplate((prev) => prev || list[0].name);
    setTemplatesLoading(false);
  }, []);

  useEffect(() => {
    loadSites();
    loadTemplates();
  }, [loadSites, loadTemplates]);

  const handleAddUrls = () => {
    const parsed = urlInput
      .split(/[\n,\s]+/)
      .map((u) => normalizeUrl(u))
      .filter(Boolean);
    if (parsed.length === 0) {
      if (urlInput.trim()) setSubmitError('올바른 URL 형식이 아닙니다 (http:// 또는 https:// 포함).');
      return;
    }
    setSubmitError('');
    setUrls((prev) => {
      const seen = new Set(prev);
      const merged = [...prev];
      for (const u of parsed) {
        if (!seen.has(u)) {
          seen.add(u);
          merged.push(u);
        }
      }
      return merged;
    });
    setUrlInput('');
  };

  const handleUrlKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddUrls();
    }
  };

  const removeUrl = (u) => setUrls((prev) => prev.filter((x) => x !== u));

  const sitesByGroup = useMemo(() => {
    const map = new Map();
    for (const s of sites) {
      const key = s.group_tag || '(기타)';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (GROUP_ORDER[a] ?? 9) - (GROUP_ORDER[b] ?? 9) || a.localeCompare(b));
  }, [sites]);

  const toggleSite = (siteId) => {
    setSelectedSites((prev) => (prev.includes(siteId) ? prev.filter((s) => s !== siteId) : [...prev, siteId]));
  };

  const ownSiteIds = useMemo(() => sites.filter((s) => s.group_tag === 'sfn-own').map((s) => s.site_id), [sites]);
  const clientSiteIds = useMemo(() => sites.filter((s) => s.group_tag === 'sfn-client').map((s) => s.site_id), [sites]);
  const client2SiteIds = useMemo(() => sites.filter((s) => s.group_tag === 'sfn-client2').map((s) => s.site_id), [sites]);
  const addSites = (ids) => setSelectedSites((prev) => Array.from(new Set([...prev, ...ids])));

  const dailyTarget = useMemo(() => {
    if (quantity <= 0 || duration <= 0) return 0;
    return Math.ceil(quantity / duration);
  }, [quantity, duration]);
  const intervalHours = useMemo(() => (dailyTarget <= 0 ? 0 : 24 / dailyTarget), [dailyTarget]);

  const validate = () => {
    if (!name.trim()) return '캠페인 이름을 입력하세요.';
    if (!template) return '스핀택스 템플릿을 선택하세요.';
    if (urls.length === 0) return '타겟 URL을 1개 이상 추가하세요.';
    if (selectedSites.length === 0) return '발행 대상 사이트를 1개 이상 선택하세요.';
    if (!Number.isInteger(quantity) || quantity <= 0) return '발행 수량은 1 이상의 정수여야 합니다.';
    if (!Number.isInteger(duration) || duration <= 0) return '캠페인 기간은 1일 이상이어야 합니다.';
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
    const { data, error } = await sfnSpintaxCampaignCreateAPI.create({
      name: name.trim(),
      template,
      targetUrls: urls,
      selectedSites,
      quantity,
      duration,
      publishStatus,
      singleTarget,
      includeImage,
      linkRange: [3, 5],
      status: 'paused'
    });
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message || '생성 실패');
      return;
    }
    if (data?.id) router.push(`/sfn/campaigns/${data.id}`);
    else router.push('/sfn/campaigns');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <TailwindButton variant="secondary" size="sm" onClick={() => router.push('/sfn/campaigns')}>
          ← 목록으로
        </TailwindButton>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <MainCard>
          <div className="space-y-4">
            <div>
              <h1 className="text-lg font-semibold">새 스핀택스 캠페인 생성</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                스핀택스 템플릿 1개 + 타겟 URL 여러 개로 콘텐츠를 무제한 생성해 발행합니다. 콘텐츠 생성 비용 0(LLM 0콜). 생성 후 일시정지
                상태로 시작되니 검토 후 "시작"을 누르세요.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>캠페인 이름</FieldLabel>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="예: 밤알바 스핀택스 1차"
                />
              </div>
              <div>
                <FieldLabel required>스핀택스 템플릿</FieldLabel>
                {templatesLoading ? (
                  <div className="text-sm text-gray-500 py-2">템플릿 불러오는 중…</div>
                ) : templates.length === 0 ? (
                  <div className="text-sm text-red-600 py-2">사용 가능한 스핀택스 템플릿이 없습니다.</div>
                ) : (
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm bg-white"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                        {t.main_keyword ? ` — ${t.main_keyword}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FieldLabel required>타겟 URL (백링크 대상) — {urls.length}개</FieldLabel>
                {urls.length > 0 ? (
                  <button type="button" onClick={() => setUrls([])} className="text-xs text-gray-500 hover:text-red-600 hover:underline">
                    전체 삭제
                  </button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={handleUrlKeyDown}
                  className="flex-1 border rounded px-3 py-2 text-sm font-mono"
                  placeholder="https://example.com/  (여러 개는 콤마·줄바꿈·공백으로 구분)"
                />
                <TailwindButton type="button" variant="primary" onClick={handleAddUrls} disabled={!urlInput.trim()}>
                  추가
                </TailwindButton>
              </div>
              {urls.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {urls.map((u) => (
                    <span
                      key={u}
                      className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded text-xs font-mono"
                    >
                      {u}
                      <button
                        type="button"
                        onClick={() => removeUrl(u)}
                        className="text-emerald-400 hover:text-red-500 leading-none"
                        aria-label={`${u} 삭제`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="text-xs text-gray-500">
                제한 없이 추가할 수 있습니다.{' '}
                {singleTarget
                  ? '한 글의 모든 외부링크(3~5개)는 이 중 랜덤 1개 사이트로 통일되고, 글마다 랜덤이라 전체적으로 고루 분산됩니다.'
                  : '한 글에 여러 사이트가 섞여 들어갑니다.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <FieldLabel>발행 상태</FieldLabel>
                <select
                  value={publishStatus}
                  onChange={(e) => setPublishStatus(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm bg-white"
                >
                  <option value="published">공개 (라이브 노출)</option>
                  <option value="draft">초안 (비공개 저장)</option>
                </select>
              </div>
              <label className="flex items-center gap-2 border rounded px-3 py-2 text-sm cursor-pointer mt-6 md:mt-6">
                <input type="checkbox" checked={singleTarget} onChange={(e) => setSingleTarget(e.target.checked)} />
                <span>한 글 = 한 사이트 (권장)</span>
              </label>
              <label className="flex items-center gap-2 border rounded px-3 py-2 text-sm cursor-pointer mt-6 md:mt-6">
                <input type="checkbox" checked={includeImage} onChange={(e) => setIncludeImage(e.target.checked)} />
                <span>대표이미지(썸네일) 자동 생성</span>
              </label>
            </div>
          </div>
        </MainCard>

        <MainCard>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FieldLabel required>
                대상 사이트 — 선택됨: {selectedSites.length} / {sites.length}
              </FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="text-xs border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded px-2 py-1"
                  onClick={() => addSites(ownSiteIds)}
                  disabled={ownSiteIds.length === 0}
                >
                  자사 전체 ({ownSiteIds.length})
                </button>
                <button
                  type="button"
                  className="text-xs border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded px-2 py-1"
                  onClick={() => addSites(clientSiteIds)}
                  disabled={clientSiteIds.length === 0}
                >
                  고객 전체 ({clientSiteIds.length})
                </button>
                <button
                  type="button"
                  className="text-xs border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded px-2 py-1"
                  onClick={() => addSites(client2SiteIds)}
                  disabled={client2SiteIds.length === 0}
                >
                  타사2 전체 ({client2SiteIds.length})
                </button>
                <button
                  type="button"
                  className="text-xs border border-gray-300 text-gray-600 hover:bg-gray-100 rounded px-2 py-1"
                  onClick={() => setSelectedSites([])}
                  disabled={selectedSites.length === 0}
                >
                  전체 해제
                </button>
              </div>
            </div>

            {sitesLoading ? (
              <div className="text-sm text-gray-500 py-6 text-center">사이트 목록 불러오는 중…</div>
            ) : sitesError ? (
              <div className="text-sm text-red-600">{sitesError}</div>
            ) : sites.length === 0 ? (
              <div className="text-sm text-gray-500 py-6 text-center">활성화된 SFN 사이트가 없습니다.</div>
            ) : (
              <div className="space-y-3">
                {sitesByGroup.map(([group, list]) => (
                  <div key={group}>
                    <div className="text-xs font-medium text-gray-600 mb-1.5">
                      {GROUP_LABELS[group] || group} <span className="text-gray-400">({list.length})</span>
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
                              {s.domain ? <div className="text-gray-400 truncate mt-0.5">{s.domain}</div> : null}
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
            <div className="text-sm font-medium text-gray-700">자동 발행 분배 (참고)</div>
            <p className="text-xs text-gray-500">발행 수량과 기간을 기반으로 worker 가 24시간 안에 균등 분배합니다.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs pt-1">
              <div className="border rounded px-2 py-1.5 bg-gray-50">
                <div className="text-gray-500">예상 일일 발행</div>
                <div className="font-medium">{dailyTarget > 0 ? `${dailyTarget}건/일` : '-'}</div>
              </div>
              <div className="border rounded px-2 py-1.5 bg-gray-50">
                <div className="text-gray-500">발행 간격</div>
                <div className="font-medium">{intervalHours > 0 ? `약 ${intervalHours.toFixed(1)}시간` : '-'}</div>
              </div>
              <div className="border rounded px-2 py-1.5 bg-gray-50">
                <div className="text-gray-500">총 기간</div>
                <div className="font-medium">{duration > 0 ? `${duration}일 (${quantity}건)` : '-'}</div>
              </div>
            </div>
          </div>
        </MainCard>

        {submitError ? <div className="rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{submitError}</div> : null}

        <div className="flex justify-end gap-2">
          <TailwindButton variant="secondary" onClick={() => router.push('/sfn/campaigns')} disabled={submitting}>
            취소
          </TailwindButton>
          <TailwindButton variant="primary" onClick={handleSubmit} disabled={submitting || templates.length === 0}>
            {submitting ? '생성 중…' : '스핀택스 캠페인 생성'}
          </TailwindButton>
        </div>
      </form>
    </div>
  );
}
