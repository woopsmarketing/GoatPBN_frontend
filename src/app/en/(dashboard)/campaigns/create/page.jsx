'use client';

/**
 * 🎯 Create Campaign Page (EN Version)
 * 캠페인 생성 로직은 동일하게 유지하되, UI 텍스트만 영어로 구성
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import CreditCalculator from '@/components/CreditCalculator';
import { sitesAPI } from '@/lib/api/sites';
import { campaignsAPI } from '@/lib/api/campaigns';
import { buildApiUrl } from '@/lib/api/httpClient';
import { authAPI } from '@/lib/supabase';

export default function CampaignCreatePageEn() {
  const router = useRouter();

  // 폼 상태 관리
  const [formData, setFormData] = useState({
    // 기본 정보
    name: '',
    description: '',

    // 사이트 설정
    siteDistribution: 'manual', // auto, manual
    selectedSites: [], // 선택된 사이트 ID 배열
    targetSite: '',

    // 키워드 설정
    keywords: [],

    // 수량 및 기간
    quantity: '',
    duration: '',

    // 시작 시간 설정
    startType: 'delayed', // immediate, delayed, scheduled
    scheduledDate: '',
    scheduledTime: '',
    delayMinutes: 10,

    // 콘텐츠 생성 옵션
    persona: 'expert', // expert, beginner, professional
    sectionCount: 5,
    includeImages: false,
    sectionImageCount: 0,
    includeToc: false,
    includeBacklinks: false,
    includeInternalLinks: false,
    contentLanguage: 'en'
  });

  // 사용 가능한 옵션들
  const personaOptions = [
    { value: 'expert', label: 'Expert tone', description: 'Detailed and authoritative content style' },
    { value: 'beginner', label: 'Beginner friendly', description: 'Easy-to-understand explanations for newcomers' },
    { value: 'professional', label: 'Professional tone', description: 'Business-focused content voice' }
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
      const {
        data: { session }
      } = await authAPI.getSession();

      const userId = session?.user?.id;
      if (!userId) {
        console.warn('No active user session detected while loading credits.');
        return;
      }

      const response = await fetch(buildApiUrl(`/api/credits/summary/${userId}`));
      if (response.ok) {
        const data = await response.json();
        setUserCredits(data.credits_remaining || 100);
      }
    } catch (error) {
      console.error('Failed to load credits:', error);
      setUserCredits(100);
    }
  };

  // 일일 목표 계산
  useEffect(() => {
    if (formData.quantity && formData.duration) {
      const quantity = parseInt(formData.quantity, 10);
      const duration = parseInt(formData.duration, 10);
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
      console.error('Failed to load sites:', error);
    }
  };

  // 💳 크레딧 계산 함수
  const calculateCreditsPerContent = (data) => {
    let credits = 10; // 기본 크레딧

    // 추가 섹션
    const sectionCount = parseInt(data.sectionCount, 10) || 5;
    if (sectionCount > 5) {
      credits += sectionCount - 5;
    }

    // 섹션 이미지
    if (data.includeImages) {
      const imageCount = parseInt(data.sectionImageCount, 10) || 0;
      credits += imageCount * 2;
    }

    // 옵션들
    if (data.includeToc) credits += 1;
    if (data.includeBacklinks) credits += 1;
    if (data.includeInternalLinks) credits += 1;

    return credits;
  };

  // 키워드 추가 (콤마로 구분된 여러 키워드 지원)
  const addKeyword = () => {
    if (newKeyword.trim()) {
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
      setFormData((prev) => ({
        ...prev,
        selectedSites: []
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        selectedSites: sites.map((site) => site.id)
      }));
    }
  };

  // 폼 검증
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Please enter a campaign name.';
    if (!formData.targetSite.trim()) newErrors.targetSite = 'Please enter the target site URL.';
    if (formData.keywords.length === 0) newErrors.keywords = 'Add at least one keyword.';
    if (!formData.quantity || formData.quantity < 1) newErrors.quantity = 'Enter a valid quantity.';
    if (!formData.duration || formData.duration < 1) newErrors.duration = 'Enter a valid duration in days.';

    if (formData.siteDistribution === 'manual' && formData.selectedSites.length === 0) {
      newErrors.selectedSites = 'Select at least one site.';
    }

    if (formData.startType === 'scheduled') {
      if (!formData.scheduledDate) newErrors.scheduledDate = 'Select a start date.';
      if (!formData.scheduledTime) newErrors.scheduledTime = 'Select a start time.';
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
      // 시작 시간 계산
      let scheduledStart = null;
      if (formData.startType === 'delayed') {
        scheduledStart = new Date(Date.now() + formData.delayMinutes * 60 * 1000);
      } else if (formData.startType === 'scheduled') {
        scheduledStart = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      }

      const campaignData = {
        name: formData.name,
        description: formData.description,
        site_distribution: formData.siteDistribution,
        selected_sites: formData.selectedSites,
        site_id: formData.selectedSites.length > 0 ? formData.selectedSites[0] : null,
        target_site: formData.targetSite,
        keywords: formData.keywords,
        quantity: parseInt(formData.quantity, 10),
        duration: parseInt(formData.duration, 10),
        start_type: formData.startType,
        scheduled_start: scheduledStart?.toISOString(),
        delay_minutes: parseInt(formData.delayMinutes, 10),

        // 콘텐츠 생성 옵션
        persona: formData.persona,
        sectionCount: parseInt(formData.sectionCount, 10),
        includeImages: formData.includeImages,
        sectionImageCount: parseInt(formData.sectionImageCount, 10),
        includeToc: formData.includeToc,
        includeBacklinks: formData.includeBacklinks,
        includeInternalLinks: formData.includeInternalLinks,
        contentLanguage: formData.contentLanguage,

        // 💳 크레딧 계산
        creditsPerContent: calculateCreditsPerContent(formData),

        status: 'pending'
      };

      console.log('Campaign creation payload:', campaignData);

      const result = await campaignsAPI.createCampaign(campaignData);

      if (result.success) {
        alert('Campaign created successfully!');
        router.push('/en/campaigns');
      } else {
        throw new Error(result.error || 'Failed to create campaign.');
      }
    } catch (error) {
      console.error('Campaign creation error:', error);
      alert(`Campaign creation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Campaign</h1>
          <p className="text-gray-600">Set up a backlink campaign and automate your content production.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <MainCard title="📋 Basic Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campaign name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Part-time job backlink campaign"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content tone *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Campaign description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the purpose and strategy of this campaign..."
            />
          </div>
        </MainCard>

        {/* 백링크 설정 */}
        <MainCard title="🔗 Backlink settings">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target site URL *</label>
            <input
              type="url"
              value={formData.targetSite}
              onChange={(e) => setFormData((prev) => ({ ...prev, targetSite: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
            />
            <p className="text-xs text-gray-500 mt-1">Include http:// or https://</p>
            {errors.targetSite && <p className="text-red-500 text-sm mt-1">{errors.targetSite}</p>}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Keywords (anchor text) *</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter keywords (separate by commas)"
              />
              <TailwindButton type="button" onClick={addKeyword} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Add
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
        <MainCard title="🌐 Site selection">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Distribution method</label>
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
                  <span className="ml-2 text-sm text-gray-700">Auto distribute</span>
                  <span className="ml-2 text-xs text-gray-500">(Publish across all registered sites)</span>
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
                  <span className="ml-2 text-sm text-gray-700">Manual selection</span>
                  <span className="ml-2 text-xs text-gray-500">(Choose specific sites to publish)</span>
                </label>
              </div>
            </div>

            {formData.siteDistribution === 'manual' && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Select sites *</label>
                  <TailwindButton
                    type="button"
                    onClick={toggleAllSites}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {formData.selectedSites.length === sites.length ? 'Deselect all' : 'Select all'}
                  </TailwindButton>
                </div>

                {sites.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      No site registered. Please{' '}
                      <a href="/en/sites/add" className="text-blue-600 hover:underline">
                        add a site first
                      </a>
                      .
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
                                {site.status === 'connected' ? 'Connected' : 'Disconnected'}
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
                      <strong>{formData.selectedSites.length}</strong> site(s) selected.
                    </p>
                  </div>
                )}

                {errors.selectedSites && <p className="text-red-500 text-sm mt-1">{errors.selectedSites}</p>}
              </div>
            )}
          </div>
        </MainCard>

        {/* 캠페인 설정 */}
        <MainCard title="⚙️ Campaign settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total content quantity *</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 50"
              />
              {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campaign duration (days) *</label>
              <input
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 20"
              />
              {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration}</p>}
            </div>
          </div>

          {calculations.dailyTarget > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">📊 Estimated plan</h4>
              <div className="mt-2 text-sm text-blue-700">
                <p>• Daily target: approximately {calculations.dailyTarget} posts</p>
                {calculations.estimatedCompletion && (
                  <p>• Estimated completion date: {calculations.estimatedCompletion.toLocaleDateString('en-US')}</p>
                )}
              </div>
            </div>
          )}
        </MainCard>

        {/* 콘텐츠 생성 옵션 */}
        <MainCard title="📝 Content generation options">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of sections</label>
              <input
                type="number"
                min="3"
                max="15"
                value={formData.sectionCount}
                onChange={(e) => setFormData((prev) => ({ ...prev, sectionCount: parseInt(e.target.value, 10) || 5 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Content will include this many sections (3-15).{' '}
                <span className="text-blue-600 font-semibold">+1 credit for each section above 5.</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Images per section</label>
              <input
                type="number"
                min="0"
                max={formData.sectionCount || 5}
                value={formData.sectionImageCount}
                onChange={(e) => setFormData((prev) => ({ ...prev, sectionImageCount: parseInt(e.target.value, 10) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.includeImages}
              />
              <p className="text-xs text-gray-500 mt-1">Main image (1) is included automatically. Each extra image costs +2 credits.</p>
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
                Generate images
              </label>
              <span className="ml-2 text-xs text-gray-500">AI will create related images automatically.</span>
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
                Include table of contents <span className="text-blue-600 font-semibold">( +1 credit )</span>
              </label>
              <span className="ml-2 text-xs text-gray-500">Adds a summary table at the top of every article.</span>
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
                Generate external backlinks <span className="text-blue-600 font-semibold">( +1 credit )</span>
              </label>
              <span className="ml-2 text-xs text-gray-500">Automatically adds backlinks pointing to the target site.</span>
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
                Generate internal links <span className="text-blue-600 font-semibold">( +1 credit )</span>
              </label>
              <span className="ml-2 text-xs text-gray-500">Creates internal links between related posts automatically.</span>
            </div>
          </div>
        </MainCard>

        {/* 크레딧 계산기 */}
        <CreditCalculator formData={formData} userCredits={userCredits} />

        {/* 시작 시간 설정 */}
        <MainCard title="⏰ Start time">
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
                Start immediately
              </label>
              <span className="ml-2 text-xs text-gray-500">Launches as soon as the campaign is created.</span>
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
                Delayed start (recommended)
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
                {formData.startType === 'delayed'
                  ? `Starts in ${formData.delayMinutes} minutes`
                  : 'Launch the campaign after a short delay.'}
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
                Scheduled start
              </label>
              <span className="ml-2 text-xs text-gray-500">Run at a specific date and time.</span>
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
            onClick={() => router.push('/en/campaigns')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </TailwindButton>
          <TailwindButton
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create campaign'}
          </TailwindButton>
        </div>
      </form>
    </div>
  );
}
