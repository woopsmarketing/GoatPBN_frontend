'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '../../../../components/MainCard';
import TailwindButton from '../../../../components/ui/TailwindButton';
import { sitesAPI } from '../../../../lib/api/sites';
import { spintaxAPI } from '../../../../lib/api/spintax';
import { spintaxCampaignsAPI } from '../../../../lib/api/spintaxCampaigns';
import { buildApiUrl } from '../../../../lib/api/httpClient';
import { authAPI } from '../../../../lib/supabase';

export default function SpintaxCampaignCreatePage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    spintaxTemplateId: '',
    siteDistribution: 'manual',
    selectedSites: [],
    targetSite: '',
    quantity: '',
    duration: '',
    startType: 'delayed',
    delayMinutes: 10,
    scheduledDate: '',
    scheduledTime: '',
    includeToc: true,
    includeImages: false,
    sectionImageCount: 2,
    includeBacklinks: true,
    includeInternalLinks: false,
    contentLanguage: 'ko'
  });

  const [templates, setTemplates] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [userCredits, setUserCredits] = useState(0);

  useEffect(() => {
    loadTemplates();
    loadSites();
    loadUserCredits();
  }, []);

  const loadTemplates = async () => {
    try {
      const result = await spintaxAPI.getReadyTemplates();
      if (result.success) {
        setTemplates(result.templates || []);
      }
    } catch (err) {
      console.error('템플릿 로드 실패:', err.message);
    }
  };

  const loadSites = async () => {
    try {
      const result = await sitesAPI.getSites();
      if (result.success) {
        setSites(result.data || []);
      }
    } catch (err) {
      console.error('사이트 로드 실패:', err);
    }
  };

  const loadUserCredits = async () => {
    try {
      const {
        data: { session }
      } = await authAPI.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const response = await fetch(buildApiUrl(`/api/credits/summary/${userId}`));
      if (response.ok) {
        const data = await response.json();
        setUserCredits(data.credits_remaining || 0);
      }
    } catch (err) {
      console.error('크레딧 로드 실패:', err);
    }
  };

  const toggleSiteSelection = (siteId) => {
    setFormData((prev) => ({
      ...prev,
      selectedSites: prev.selectedSites.includes(siteId)
        ? prev.selectedSites.filter((id) => id !== siteId)
        : [...prev.selectedSites, siteId]
    }));
  };

  const toggleAllSites = () => {
    if (formData.selectedSites.length === sites.length) {
      setFormData((prev) => ({ ...prev, selectedSites: [] }));
    } else {
      setFormData((prev) => ({ ...prev, selectedSites: sites.map((s) => s.id) }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = '캠페인 이름을 입력하세요';
    if (!formData.spintaxTemplateId) newErrors.spintaxTemplateId = '템플릿을 선택하세요';
    if (!formData.targetSite.trim()) newErrors.targetSite = '타겟 사이트를 입력하세요';
    if (!formData.quantity || formData.quantity < 1) newErrors.quantity = '올바른 수량을 입력하세요';
    if (!formData.duration || formData.duration < 1) newErrors.duration = '올바른 기간을 입력하세요';

    if (formData.siteDistribution === 'manual' && formData.selectedSites.length === 0) {
      newErrors.selectedSites = '최소 1개의 사이트를 선택하세요';
    }
    if (formData.siteDistribution === 'auto' && sites.length === 0) {
      newErrors.siteDistribution = '등록된 사이트가 없습니다.';
    }
    if (formData.startType === 'scheduled') {
      if (!formData.scheduledDate) newErrors.scheduledDate = '시작 날짜를 선택하세요';
      if (!formData.scheduledTime) newErrors.scheduledTime = '시작 시간을 선택하세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const targetSiteIds = formData.siteDistribution === 'auto' ? sites.map((s) => s.id) : formData.selectedSites;

      if (targetSiteIds.length === 0) {
        alert('배포할 사이트가 없습니다.');
        setLoading(false);
        return;
      }

      let scheduledStart = null;
      if (formData.startType === 'delayed') {
        scheduledStart = new Date(Date.now() + formData.delayMinutes * 60 * 1000);
      } else if (formData.startType === 'scheduled') {
        scheduledStart = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      }

      const totalCredits = parseInt(formData.quantity) * 1;
      if (totalCredits > userCredits) {
        if (!confirm(`필요 크레딧(${totalCredits})이 보유 크레딧(${userCredits})보다 많습니다. 계속하시겠습니까?`)) {
          setLoading(false);
          return;
        }
      }

      const result = await spintaxCampaignsAPI.createCampaign({
        name: formData.name,
        description: formData.description,
        spintax_template_id: formData.spintaxTemplateId,
        site_id: targetSiteIds[0] || null,
        selected_site_ids: targetSiteIds,
        target_site: formData.targetSite,
        quantity: parseInt(formData.quantity),
        duration: parseInt(formData.duration),
        start_type: formData.startType,
        delay_minutes: parseInt(formData.delayMinutes),
        scheduled_start: scheduledStart?.toISOString(),
        include_toc: formData.includeToc,
        include_images: formData.includeImages,
        section_image_count: parseInt(formData.sectionImageCount),
        include_backlinks: formData.includeBacklinks,
        include_internal_links: formData.includeInternalLinks,
        content_language: formData.contentLanguage,
        credits_per_content: 1
      });

      if (result.success) {
        alert(`스핀택스 캠페인이 생성되었습니다!\n${targetSiteIds.length}개 사이트에 배포됩니다.`);
        router.push('/campaigns/spintax/list');
      } else {
        throw new Error(result.error || '캠페인 생성 실패');
      }
    } catch (err) {
      console.error('캠페인 생성 오류:', err);
      alert(`캠페인 생성 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === formData.spintaxTemplateId);
  const dailyTarget = formData.quantity && formData.duration ? Math.ceil(parseInt(formData.quantity) / parseInt(formData.duration)) : 0;
  const totalCredits = parseInt(formData.quantity || 0) * 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">스핀택스 캠페인 생성</h1>
        <p className="text-gray-600">템플릿 기반으로 빠르고 저렴하게 콘텐츠를 생성합니다. 크레딧 1/건</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <MainCard title="기본 정보">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">캠페인 이름 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 스포츠중계 스핀택스 캠페인"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="캠페인 목적 (선택)"
              />
            </div>
          </div>
        </MainCard>

        {/* 템플릿 선택 */}
        <MainCard title="스핀택스 템플릿 선택 *">
          {templates.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              사용 가능한 템플릿이 없습니다.{' '}
              <a href="/templates/create" className="text-blue-600 underline font-medium">
                템플릿 먼저 생성하기
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.spintaxTemplateId === t.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={t.id}
                    checked={formData.spintaxTemplateId === t.id}
                    onChange={() => setFormData((prev) => ({ ...prev, spintaxTemplateId: t.id }))}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{t.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      키워드: {t.main_keyword} | 마스터: {t.master_count || '-'}편 | 사용: {t.spin_count || 0}회
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">준비 완료</span>
                </label>
              ))}
            </div>
          )}
          {errors.spintaxTemplateId && <p className="text-red-500 text-sm mt-2">{errors.spintaxTemplateId}</p>}
        </MainCard>

        {/* 백링크 설정 */}
        <MainCard title="백링크 설정">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">백링크를 받을 사이트 주소 *</label>
            <input
              type="url"
              value={formData.targetSite}
              onChange={(e) => setFormData((prev) => ({ ...prev, targetSite: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
            />
            {errors.targetSite && <p className="text-red-500 text-sm mt-1">{errors.targetSite}</p>}
          </div>
        </MainCard>

        {/* 사이트 선택 */}
        <MainCard title="PBN 사이트 선택">
          <div className="space-y-4">
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="siteDistribution"
                  value="auto"
                  checked={formData.siteDistribution === 'auto'}
                  onChange={(e) => setFormData((prev) => ({ ...prev, siteDistribution: e.target.value }))}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">자동 배포 (모든 사이트)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="siteDistribution"
                  value="manual"
                  checked={formData.siteDistribution === 'manual'}
                  onChange={(e) => setFormData((prev) => ({ ...prev, siteDistribution: e.target.value }))}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">수동 선택</span>
              </label>
            </div>
            {errors.siteDistribution && <p className="text-red-500 text-sm">{errors.siteDistribution}</p>}

            {formData.siteDistribution === 'manual' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {formData.selectedSites.length}/{sites.length}개 선택
                  </span>
                  <button type="button" onClick={toggleAllSites} className="text-sm text-blue-600 hover:text-blue-800">
                    {formData.selectedSites.length === sites.length ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                  {sites.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">등록된 사이트가 없습니다</div>
                  ) : (
                    sites.map((site) => (
                      <label
                        key={site.id}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedSites.includes(site.id)}
                          onChange={() => toggleSiteSelection(site.id)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-700 truncate">{site.url || site.name}</span>
                      </label>
                    ))
                  )}
                </div>
                {errors.selectedSites && <p className="text-red-500 text-sm mt-1">{errors.selectedSites}</p>}
              </div>
            )}
          </div>
        </MainCard>

        {/* 수량 및 기간 */}
        <MainCard title="수량 및 기간">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">총 콘텐츠 수 *</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 50"
              />
              {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">캠페인 기간 (일) *</label>
              <input
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 20"
              />
              {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration}</p>}
            </div>
          </div>

          {dailyTarget > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">예상 실행 계획</h4>
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                <p>일일 목표: 약 {dailyTarget}개 콘텐츠</p>
                <p>
                  필요 크레딧: {totalCredits} (보유: {userCredits})
                </p>
                <p className="text-blue-600 font-semibold">스핀택스는 건당 1 크레딧만 사용합니다!</p>
              </div>
            </div>
          )}
        </MainCard>

        {/* 콘텐츠 옵션 */}
        <MainCard title="콘텐츠 옵션">
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeToc"
                checked={formData.includeToc}
                onChange={(e) => setFormData((prev) => ({ ...prev, includeToc: e.target.checked }))}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="includeToc" className="ml-2 text-sm text-gray-700">
                목차 포함
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeImages"
                checked={formData.includeImages}
                onChange={(e) => setFormData((prev) => ({ ...prev, includeImages: e.target.checked }))}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="includeImages" className="ml-2 text-sm text-gray-700">
                AI 이미지 생성 (gpt-image-1)
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeBacklinks"
                checked={formData.includeBacklinks}
                onChange={(e) => setFormData((prev) => ({ ...prev, includeBacklinks: e.target.checked }))}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="includeBacklinks" className="ml-2 text-sm text-gray-700">
                백링크 삽입
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeInternalLinks"
                checked={formData.includeInternalLinks}
                onChange={(e) => setFormData((prev) => ({ ...prev, includeInternalLinks: e.target.checked }))}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="includeInternalLinks" className="ml-2 text-sm text-gray-700">
                내부 링크 생성
              </label>
            </div>
          </div>
        </MainCard>

        {/* 시작 시간 */}
        <MainCard title="시작 시간">
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="startType"
                value="immediate"
                checked={formData.startType === 'immediate'}
                onChange={(e) => setFormData((prev) => ({ ...prev, startType: e.target.value }))}
                className="h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">즉시 시작</span>
            </label>

            <div className="flex items-center gap-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="startType"
                  value="delayed"
                  checked={formData.startType === 'delayed'}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startType: e.target.value }))}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">지연 시작 (추천)</span>
              </label>
              {formData.startType === 'delayed' && (
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={formData.delayMinutes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, delayMinutes: e.target.value }))}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              )}
              {formData.startType === 'delayed' && <span className="text-sm text-gray-500">분 후</span>}
            </div>

            <label className="flex items-center">
              <input
                type="radio"
                name="startType"
                value="scheduled"
                checked={formData.startType === 'scheduled'}
                onChange={(e) => setFormData((prev) => ({ ...prev, startType: e.target.value }))}
                className="h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">예약 시작</span>
            </label>

            {formData.startType === 'scheduled' && (
              <div className="flex gap-3 ml-6">
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, scheduledTime: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}
            {errors.scheduledDate && <p className="text-red-500 text-sm">{errors.scheduledDate}</p>}
            {errors.scheduledTime && <p className="text-red-500 text-sm">{errors.scheduledTime}</p>}
          </div>
        </MainCard>

        {/* 요약 & 제출 */}
        <MainCard>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedTemplate && (
                <span>
                  템플릿: <strong>{selectedTemplate.name}</strong> |{' '}
                </span>
              )}
              {formData.quantity && (
                <span>
                  총 {formData.quantity}건 | 크레딧 {totalCredits} 필요
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <TailwindButton type="button" variant="outlined" onClick={() => router.back()}>
                취소
              </TailwindButton>
              <TailwindButton type="submit" variant="contained" disabled={loading}>
                {loading ? '생성 중...' : '스핀택스 캠페인 시작'}
              </TailwindButton>
            </div>
          </div>
        </MainCard>
      </form>
    </div>
  );
}
