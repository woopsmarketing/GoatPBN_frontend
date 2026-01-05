// v1.1 - 다중 사이트 배포 및 자동 배포 로직 개선 (2026.01.05)
/**
 * 🎯 캠페인 생성 페이지 (완전 개선 버전)
 * 모든 콘텐츠 생성 옵션을 포함한 캠페인 설정 페이지
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '../../../../components/MainCard';
import TailwindButton from '../../../../components/ui/TailwindButton';
import CreditCalculator from '../../../../components/CreditCalculator';
import { sitesAPI } from '../../../../lib/api/sites';
import { campaignsAPI } from '../../../../lib/api/campaigns';
import { buildApiUrl } from '../../../../lib/api/httpClient';
import { authAPI } from '../../../../lib/supabase';

export default function CampaignCreatePage() {
  const router = useRouter();

  // 폼 상태 관리
  const [formData, setFormData] = useState({
    // 기본 정보
    name: '',
    description: '',

    // 사이트 설정 (완전 개선)
    siteDistribution: 'manual', // auto, manual
    selectedSites: [], // 선택된 사이트 ID 배열
    targetSite: '',

    // 키워드 설정
    keywords: [],

    // 수량 및 기간
    quantity: '',
    duration: '',

    // 시작 시간 설정
    startType: 'delayed', // immediate, delayed, scheduled (기본값을 delayed로 변경)
    scheduledDate: '',
    scheduledTime: '',
    delayMinutes: 10, // 기본값을 10분으로 변경

    // 콘텐츠 생성 옵션 (content_generation_pipeline.py 매개변수와 일치)
    persona: 'expert', // expert, beginner, professional
    sectionCount: 5, // 기본값 6 → 5로 변경
    includeImages: false, // 기본값 false (사용자가 선택하도록)
    sectionImageCount: 0, // 섹션 이미지 개수 (확률 방식 폐기)
    includeToc: false,
    includeBacklinks: false, // 기본값을 false로 변경
    includeInternalLinks: false, // 기본값을 false로 변경
    contentLanguage: 'ko' // 기본 언어 설정
  });

  // 사용 가능한 옵션들
  const personaOptions = [
    { value: 'expert', label: '전문가 (Expert)', description: '전문적이고 상세한 내용' },
    { value: 'beginner', label: '초보자 (Beginner)', description: '쉽고 이해하기 좋은 내용' },
    { value: 'professional', label: '프로페셔널 (Professional)', description: '비즈니스 중심의 내용' }
  ];

  // 기타 상태
  const [newKeyword, setNewKeyword] = useState('');
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [userCredits, setUserCredits] = useState(100); // 사용자 보유 크레딧

  // 계산된 값들
  const [calculations, setCalculations] = useState({
    dailyTarget: 0,
    estimatedCompletion: null
  });

  // 사이트 목록 및 크레딧 로드
  useEffect(() => {
    loadSites();
    loadUserCredits();
  }, []);

  // 사용자 크레딧 로드
  const loadUserCredits = async () => {
    try {
      // 사용자 ID 가져오기 (실제로는 Auth에서)
      const {
        data: { session }
      } = await authAPI.getSession();

      const userId = session?.user?.id;
      if (!userId) {
        console.warn('크레딧 정보를 불러올 수 있는 로그인 세션이 없습니다.');
        return;
      }

      const response = await fetch(buildApiUrl(`/api/credits/summary/${userId}`));
      if (response.ok) {
        const data = await response.json();
        setUserCredits(data.credits_remaining || 100);
      }
    } catch (error) {
      console.error('크레딧 로드 실패:', error);
      setUserCredits(100); // 기본값 유지
    }
  };

  // 일일 목표 계산
  useEffect(() => {
    if (formData.quantity && formData.duration) {
      const quantity = parseInt(formData.quantity);
      const duration = parseInt(formData.duration);
      const dailyTarget = Math.ceil(quantity / duration);

      const today = new Date();
      const completionDate = new Date(today.getTime() + duration * 24 * 60 * 60 * 1000);

      setCalculations({
        dailyTarget,
        estimatedCompletion: completionDate
      });
    }
  }, [formData.quantity, formData.duration]);

  const loadSites = async () => {
    try {
      const result = await sitesAPI.getSites();
      if (result.success) {
        setSites(result.data || []);
      }
    } catch (error) {
      console.error('사이트 로드 실패:', error);
    }
  };

  // 💳 크레딧 계산 함수
  const calculateCreditsPerContent = (formData) => {
    let credits = 10; // 기본 크레딧

    // 추가 섹션
    const sectionCount = parseInt(formData.sectionCount) || 5;
    if (sectionCount > 5) {
      credits += sectionCount - 5;
    }

    // 섹션 이미지
    if (formData.includeImages) {
      const imageCount = parseInt(formData.sectionImageCount) || 0;
      credits += imageCount * 2;
    }

    // 옵션들
    if (formData.includeToc) credits += 1;
    if (formData.includeBacklinks) credits += 1;
    if (formData.includeInternalLinks) credits += 1;

    return credits;
  };

  // 키워드 추가 (콤마로 구분된 여러 키워드 지원)
  const addKeyword = () => {
    if (newKeyword.trim()) {
      // 콤마로 구분된 키워드들을 분리하고 공백 제거
      const keywordsToAdd = newKeyword
        .split(',')
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword && !formData.keywords.includes(keyword));

      if (keywordsToAdd.length > 0) {
        setFormData((prev) => ({
          ...prev,
          keywords: [...prev.keywords, ...keywordsToAdd]
        }));
        setNewKeyword('');
      }
    }
  };

  // 키워드 제거
  const removeKeyword = (index) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }));
  };

  // 사이트 선택/해제
  const toggleSiteSelection = (siteId) => {
    setFormData((prev) => ({
      ...prev,
      selectedSites: prev.selectedSites.includes(siteId)
        ? prev.selectedSites.filter((id) => id !== siteId)
        : [...prev.selectedSites, siteId]
    }));
  };

  // 전체 사이트 선택/해제
  const toggleAllSites = () => {
    if (formData.selectedSites.length === sites.length) {
      // 모든 사이트가 선택된 경우 -> 모두 해제
      setFormData((prev) => ({
        ...prev,
        selectedSites: []
      }));
    } else {
      // 일부 또는 아무것도 선택되지 않은 경우 -> 모두 선택
      setFormData((prev) => ({
        ...prev,
        selectedSites: sites.map((site) => site.id)
      }));
    }
  };

  // 폼 검증
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = '캠페인 이름을 입력하세요';
    if (!formData.targetSite.trim()) newErrors.targetSite = '타겟 사이트를 입력하세요';
    if (formData.keywords.length === 0) newErrors.keywords = '최소 1개의 키워드를 추가하세요';
    if (!formData.quantity || formData.quantity < 1) newErrors.quantity = '올바른 수량을 입력하세요';
    if (!formData.duration || formData.duration < 1) newErrors.duration = '올바른 기간을 입력하세요';

    if (formData.siteDistribution === 'manual') {
      if (formData.selectedSites.length === 0) {
        newErrors.selectedSites = '최소 1개의 사이트를 선택하세요';
      }
    } else {
      if (sites.length === 0) {
        newErrors.siteDistribution = '등록된 사이트가 없습니다. 먼저 사이트를 추가해주세요.';
      }
    }

    if (formData.startType === 'scheduled') {
      if (!formData.scheduledDate) newErrors.scheduledDate = '시작 날짜를 선택하세요';
      if (!formData.scheduledTime) newErrors.scheduledTime = '시작 시간을 선택하세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 캠페인 생성 처리
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      // 사이트 배포 대상 계산 (자동 배포인 경우 전체 사이트 활용)
      const targetSiteIds =
        formData.siteDistribution === 'auto' ? sites.map((site) => site.id) : formData.selectedSites;

      if (targetSiteIds.length === 0) {
        alert('캠페인을 배포할 사이트가 없습니다. 선택 상태를 확인해주세요.');
        return;
      }

      // 시작 시간 계산
      let scheduledStart = null;
      if (formData.startType === 'delayed') {
        scheduledStart = new Date(Date.now() + formData.delayMinutes * 60 * 1000);
      } else if (formData.startType === 'scheduled') {
        scheduledStart = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      }

      // 공통 캠페인 데이터 템플릿
      const campaignDataTemplate = {
        name: formData.name,
        description: formData.description,
        site_distribution: formData.siteDistribution,
        selected_sites: targetSiteIds,
        target_site: formData.targetSite,
        keywords: formData.keywords,
        quantity: parseInt(formData.quantity),
        duration: parseInt(formData.duration),
        start_type: formData.startType,
        scheduled_start: scheduledStart?.toISOString(),
        delay_minutes: parseInt(formData.delayMinutes), // delayMinutes 추가

        // 콘텐츠 생성 옵션
        persona: formData.persona,
        sectionCount: parseInt(formData.sectionCount),
        includeImages: formData.includeImages,
        sectionImageCount: parseInt(formData.sectionImageCount), // 🆕 고정 개수 방식
        includeToc: formData.includeToc,
        includeBacklinks: formData.includeBacklinks,
        includeInternalLinks: formData.includeInternalLinks,
        contentLanguage: formData.contentLanguage,

        // 💳 크레딧 계산 (프론트엔드에서 계산하여 전달)
        creditsPerContent: calculateCreditsPerContent(formData),

        status: 'pending' // 초기 상태
      };

      // 결과 요약 저장용 변수
      const successSiteIds = [];
      const failedSites = [];
      const siteMap = new Map(sites.map((site) => [site.id, site]));

      // 사이트별로 캠페인 생성 (수동 선택 시 선택된 사이트만, 자동 배포 시 전체 사이트)
      for (const siteId of targetSiteIds) {
        const payload = { ...campaignDataTemplate, site_id: siteId, delayMinutes: parseInt(formData.delayMinutes) };

        console.log('캠페인 생성 데이터:', payload);

        try {
          const result = await campaignsAPI.createCampaign(payload);
          if (result.success) {
            successSiteIds.push(siteId);
          } else {
            failedSites.push({
              siteId,
              error: result.error || '알 수 없는 오류'
            });
          }
        } catch (error) {
          failedSites.push({
            siteId,
            error: error.message
          });
        }
      }

      if (successSiteIds.length > 0) {
        const successSiteNames = successSiteIds
          .map((id) => siteMap.get(id)?.name || '알 수 없는 사이트')
          .join(', ');

        let summaryMessage = `총 ${targetSiteIds.length}개 사이트 중 ${successSiteIds.length}곳에 캠페인을 생성했습니다.\n\n✅ 성공: ${successSiteNames}`;

        if (failedSites.length > 0) {
          const failedNames = failedSites
            .map((item) => `${siteMap.get(item.siteId)?.name || '알 수 없는 사이트'} (${item.error})`)
            .join(', ');
          summaryMessage += `\n\n⚠️ 실패: ${failedNames}`;
        }

        alert(summaryMessage);
        router.push('/campaigns');
      } else {
        const failedNames = failedSites
          .map((item) => `${siteMap.get(item.siteId)?.name || '알 수 없는 사이트'} (${item.error})`)
          .join(', ');
        throw new Error(`선택한 모든 사이트에서 캠페인 생성이 실패했습니다.\n실패 목록: ${failedNames}`);
      }
    } catch (error) {
      console.error('캠페인 생성 오류:', error);
      alert(`캠페인 생성 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">새 캠페인 생성</h1>
          <p className="text-gray-600">백링크 캠페인을 설정하고 자동 콘텐츠 생성을 시작하세요</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <MainCard title="📋 기본 정보">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">캠페인 이름 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 아르바이트 백링크 캠페인"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">콘텐츠 톤앤매너 *</label>
              <select
                value={formData.persona}
                onChange={(e) => setFormData((prev) => ({ ...prev, persona: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {personaOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{personaOptions.find((p) => p.value === formData.persona)?.description}</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">캠페인 설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="캠페인의 목적과 전략을 설명하세요..."
            />
          </div>
        </MainCard>

        {/* 백링크 설정 */}
        <MainCard title="🔗 백링크 설정">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">백링크를 받을 사이트 주소 *</label>
            <input
              type="url"
              value={formData.targetSite}
              onChange={(e) => setFormData((prev) => ({ ...prev, targetSite: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
            />
            <p className="text-xs text-gray-500 mt-1">http:// 또는 https://를 포함해서 입력하세요</p>
            {errors.targetSite && <p className="text-red-500 text-sm mt-1">{errors.targetSite}</p>}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">키워드 (앵커텍스트) *</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="키워드를 입력하세요 (콤마로 구분하여 여러 키워드 입력 가능)"
              />
              <TailwindButton type="button" onClick={addKeyword} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                추가
              </TailwindButton>
            </div>

            {formData.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.keywords.map((keyword, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {keyword}
                    <button type="button" onClick={() => removeKeyword(index)} className="ml-2 text-blue-600 hover:text-blue-800">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {errors.keywords && <p className="text-red-500 text-sm mt-1">{errors.keywords}</p>}
          </div>
        </MainCard>

        {/* 사이트 선택 */}
        <MainCard title="🌐 사이트 선택">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">사이트 배포 방식</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="siteDistribution"
                    value="auto"
                    checked={formData.siteDistribution === 'auto'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, siteDistribution: e.target.value }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">자동 배포</span>
                  <span className="ml-2 text-xs text-gray-500">(등록된 모든 사이트에 자동 배포)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="siteDistribution"
                    value="manual"
                    checked={formData.siteDistribution === 'manual'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, siteDistribution: e.target.value }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">수동 선택</span>
                  <span className="ml-2 text-xs text-gray-500">(원하는 사이트만 선택)</span>
                </label>
              </div>
              {errors.siteDistribution && <p className="text-red-500 text-sm mt-2">{errors.siteDistribution}</p>}
            </div>

            {formData.siteDistribution === 'manual' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">사용할 사이트 선택 *</label>
                  <TailwindButton
                    type="button"
                    onClick={toggleAllSites}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {formData.selectedSites.length === sites.length ? '전체 해제' : '전체 선택'}
                  </TailwindButton>
                </div>

                {sites.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      등록된 사이트가 없습니다. 먼저{' '}
                      <a href="/sites/add" className="text-blue-600 hover:underline">
                        사이트를 추가
                      </a>
                      해주세요.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sites.map((site) => (
                      <div
                        key={site.id}
                        className={`p-3 border rounded-md cursor-pointer transition-colors ${
                          formData.selectedSites.includes(site.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => toggleSiteSelection(site.id)}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.selectedSites.includes(site.id)}
                            onChange={() => toggleSiteSelection(site.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3 flex-1">
                            <div className="text-sm font-medium text-gray-900">{site.name}</div>
                            <div className="text-xs text-gray-500">{site.url}</div>
                            <div className="flex items-center mt-1">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  site.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {site.status === 'connected' ? '연결됨' : '연결 안됨'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {formData.selectedSites.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>{formData.selectedSites.length}개</strong> 사이트가 선택되었습니다.
                    </p>
                  </div>
                )}

                {errors.selectedSites && <p className="text-red-500 text-sm mt-1">{errors.selectedSites}</p>}
              </div>
            )}
          </div>
        </MainCard>

        {/* 캠페인 설정 */}
        <MainCard title="⚙️ 캠페인 설정">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">생성할 콘텐츠 수량 *</label>
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

          {calculations.dailyTarget > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">📊 예상 실행 계획</h4>
              <div className="mt-2 text-sm text-blue-700">
                <p>• 일일 목표: 약 {calculations.dailyTarget}개 콘텐츠</p>
                {calculations.estimatedCompletion && <p>• 예상 완료일: {calculations.estimatedCompletion.toLocaleDateString()}</p>}
              </div>
            </div>
          )}
        </MainCard>

        {/* 콘텐츠 생성 옵션 */}
        <MainCard title="📝 콘텐츠 생성 옵션">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">섹션 수</label>
              <input
                type="number"
                min="3"
                max="15"
                value={formData.sectionCount}
                onChange={(e) => setFormData((prev) => ({ ...prev, sectionCount: parseInt(e.target.value) || 5 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                콘텐츠에 포함될 섹션 개수 (3-15개).
                <span className="text-blue-600 font-semibold">5개 초과 시 +1 크레딧/개</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">섹션 이미지 개수</label>
              <input
                type="number"
                min="0"
                max={formData.sectionCount || 5}
                value={formData.sectionImageCount}
                onChange={(e) => setFormData((prev) => ({ ...prev, sectionImageCount: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.includeImages}
              />
              <p className="text-xs text-gray-500 mt-1">메인 이미지(1개)는 자동 생성됩니다. +2 크레딧/개</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeImages"
                checked={formData.includeImages}
                onChange={(e) => setFormData((prev) => ({ ...prev, includeImages: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="includeImages" className="ml-2 text-sm text-gray-700">
                이미지 생성
              </label>
              <span className="ml-2 text-xs text-gray-500">AI로 관련 이미지를 자동 생성합니다</span>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeToc"
                checked={formData.includeToc}
                onChange={(e) => setFormData((prev) => ({ ...prev, includeToc: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="includeToc" className="ml-2 text-sm text-gray-700">
                목차 포함 <span className="text-blue-600 font-semibold">(+1 크레딧)</span>
              </label>
              <span className="ml-2 text-xs text-gray-500">콘텐츠 상단에 목차를 추가합니다</span>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeBacklinks"
                checked={formData.includeBacklinks}
                onChange={(e) => setFormData((prev) => ({ ...prev, includeBacklinks: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="includeBacklinks" className="ml-2 text-sm text-gray-700">
                외부 백링크 생성 <span className="text-blue-600 font-semibold">(+1 크레딧)</span>
              </label>
              <span className="ml-2 text-xs text-gray-500">메인 키워드에 타겟 사이트로의 링크를 추가합니다</span>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeInternalLinks"
                checked={formData.includeInternalLinks}
                onChange={(e) => setFormData((prev) => ({ ...prev, includeInternalLinks: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="includeInternalLinks" className="ml-2 text-sm text-gray-700">
                내부 링크 생성 <span className="text-blue-600 font-semibold">(+1 크레딧)</span>
              </label>
              <span className="ml-2 text-xs text-gray-500">키워드 기반으로 내부 콘텐츠 간 링크를 자동 생성합니다</span>
            </div>
          </div>
        </MainCard>

        {/* 크레딧 계산기 */}
        <CreditCalculator formData={formData} userCredits={userCredits} />

        {/* 시작 시간 설정 */}
        <MainCard title="⏰ 시작 시간 설정">
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="radio"
                id="immediate"
                name="startType"
                value="immediate"
                checked={formData.startType === 'immediate'}
                onChange={(e) => setFormData((prev) => ({ ...prev, startType: e.target.value }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="immediate" className="ml-2 text-sm text-gray-700">
                즉시 시작
              </label>
              <span className="ml-2 text-xs text-gray-500">캠페인 생성 후 바로 시작</span>
            </div>

            <div className="flex items-center">
              <input
                type="radio"
                id="delayed"
                name="startType"
                value="delayed"
                checked={formData.startType === 'delayed'}
                onChange={(e) => setFormData((prev) => ({ ...prev, startType: e.target.value }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="delayed" className="ml-2 text-sm text-gray-700">
                지연 시작 (추천)
              </label>
              {formData.startType === 'delayed' && (
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={formData.delayMinutes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, delayMinutes: e.target.value }))}
                  className="ml-2 w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              )}
              <span className="ml-2 text-xs text-gray-500">
                {formData.startType === 'delayed' ? `${formData.delayMinutes}분 후 시작` : '캠페인 생성 후 지정된 시간 후 시작'}
              </span>
            </div>

            <div className="flex items-center">
              <input
                type="radio"
                id="scheduled"
                name="startType"
                value="scheduled"
                checked={formData.startType === 'scheduled'}
                onChange={(e) => setFormData((prev) => ({ ...prev, startType: e.target.value }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="scheduled" className="ml-2 text-sm text-gray-700">
                예약 시작
              </label>
              <span className="ml-2 text-xs text-gray-500">특정 날짜와 시간에 시작</span>
            </div>

            {formData.startType === 'scheduled' && (
              <div className="ml-6 grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.scheduledDate && <p className="text-red-500 text-sm mt-1">{errors.scheduledDate}</p>}
                </div>
                <div>
                  <input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, scheduledTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.scheduledTime && <p className="text-red-500 text-sm mt-1">{errors.scheduledTime}</p>}
                </div>
              </div>
            )}
          </div>
        </MainCard>

        {/* 제출 버튼 */}
        <div className="flex justify-end space-x-4">
          <TailwindButton
            type="button"
            onClick={() => router.push('/campaigns')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            취소
          </TailwindButton>
          <TailwindButton
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '생성 중...' : '캠페인 생성'}
          </TailwindButton>
        </div>
      </form>
    </div>
  );
}
