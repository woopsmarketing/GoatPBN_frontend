'use client';

// v1.1 - 영문 콘텐츠 생성기 전용 페이지 구현 (2025.11.13)
// 기능 요약: 영어 UI와 안내 문구로 콘텐츠 생성 플로우 제공, 한글판과 로직 동일

import { useState, useEffect } from 'react';
import { sitesAPI } from '@/lib/api/sites';
import { campaignsAPI } from '@/lib/api/campaigns';
import { supabase } from '@/lib/supabase';

/**
 * 🚀 Content Generator Page (English)
 * 사용 예: /en/tools/content-generator
 */
export default function ContentGeneratorPageEn() {
  // 기본 상태 관리
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 사이트 관련 상태
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [useRandomSite, setUseRandomSite] = useState(false);

  // 콘텐츠 생성 옵션
  const [formData, setFormData] = useState({
    mainKeyword: '',
    persona: 'expert',
    sectionCount: 5,
    includeImages: true,
    imageProbability: 30,
    includeToc: true,
    includeBacklinks: true,
    includeInternalLinks: true,
    targetUrl: ''
  });

  // 페르소나 옵션 목록
  const personas = [
    { id: 'expert', name: 'Expert', description: 'Authoritative, in-depth explanations' },
    { id: 'beginner', name: 'Beginner Friendly', description: 'Easy explanations for newcomers' },
    { id: 'practical', name: 'Practical Coach', description: 'Hands-on guidance with actionable tips' },
    { id: 'storyteller', name: 'Storyteller', description: 'Engaging narratives and examples' },
    { id: 'analyst', name: 'Analyst', description: 'Data-driven insights and breakdowns' },
    { id: 'reviewer', name: 'Reviewer', description: 'Balanced, objective product reviews' }
  ];

  // 마운트 시 사이트 데이터 및 사용자별 최근 결과 복원
  useEffect(() => {
    loadSites();

    const loadUserSpecificResult = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (user) {
          const userSpecificKey = `lastContentResult_${user.id}`;
          const savedResult = localStorage.getItem(userSpecificKey);
          if (savedResult) {
            const parsedResult = JSON.parse(savedResult);
            setResult(parsedResult);
          }
        }
      } catch (err) {
        console.error('⚠️ Failed to restore saved result:', err);
      }
    };

    loadUserSpecificResult();
  }, []);

  // 사이트 목록 로드
  const loadSites = async () => {
    try {
      const response = await sitesAPI.getSites();
      if (response.success) {
        setSites(response.data);
        if (response.data.length > 0) {
          setSelectedSite(response.data[0].id);
        }
      }
    } catch (err) {
      console.error('⚠️ Failed to load sites:', err);
    }
  };

  // 폼 데이터 업데이트 헬퍼
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // 콘텐츠 생성 실행
  const handleGenerate = async () => {
    if (!formData.mainKeyword.trim()) {
      setError('Please enter a primary keyword.');
      return;
    }

    if (formData.includeBacklinks && !formData.targetUrl.trim()) {
      setError('Target URL is required when backlinks are enabled.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      let targetSiteId = selectedSite;
      if (useRandomSite && sites.length > 0) {
        const randomIndex = Math.floor(Math.random() * sites.length);
        targetSiteId = sites[randomIndex].id;
      }

      const requestData = {
        mainKeyword: formData.mainKeyword,
        persona: formData.persona,
        sectionCount: formData.sectionCount,
        includeImages: formData.includeImages,
        imageProbability: formData.imageProbability,
        includeToc: formData.includeToc,
        includeBacklinks: formData.includeBacklinks,
        includeInternalLinks: formData.includeInternalLinks,
        targetUrl: formData.targetUrl,
        siteId: targetSiteId
      };

      console.log('🚧 Content generation request payload:', requestData);

      const response = await fetch('http://localhost:8000/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);

        try {
          const {
            data: { user }
          } = await supabase.auth.getUser();
          if (user) {
            const userSpecificKey = `lastContentResult_${user.id}`;
            localStorage.setItem(userSpecificKey, JSON.stringify(data));
          }
        } catch (storageError) {
          console.error('⚠️ Failed to persist generation result:', storageError);
        }

        console.log('✅ Content generation succeeded:', data);
      } else {
        setError(data.error || 'Failed to generate content.');
      }
    } catch (err) {
      console.error('❌ Content generation error:', err);
      setError('An unexpected error occurred while generating content.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 영역 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚀 AI Content Generator</h1>
          <p className="text-gray-600">
            Configure your keyword and options, then auto-generate articles and publish them to WordPress.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 설정 패널 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">📝 Content settings</h2>

              <div className="space-y-6">
                {/* 기본 설정 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary keyword *</label>
                    <input
                      type="text"
                      value={formData.mainKeyword}
                      onChange={(e) => handleInputChange('mainKeyword', e.target.value)}
                      placeholder="e.g. part-time jobs, WordPress monetization"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Persona</label>
                    <select
                      value={formData.persona}
                      onChange={(e) => handleInputChange('persona', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {personas.map((persona) => (
                        <option key={persona.id} value={persona.id}>
                          {persona.name} - {persona.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 섹션 및 이미지 설정 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sections per article</label>
                    <select
                      value={formData.sectionCount}
                      onChange={(e) => handleInputChange('sectionCount', parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={3}>3 sections</option>
                      <option value={4}>4 sections</option>
                      <option value={5}>5 sections (default)</option>
                      <option value={6}>6 sections</option>
                      <option value={7}>7 sections</option>
                      <option value={8}>8 sections</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image insertion rate</label>
                    <select
                      value={formData.imageProbability}
                      onChange={(e) => handleInputChange('imageProbability', parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>0% (no images)</option>
                      <option value={20}>20%</option>
                      <option value={30}>30%</option>
                      <option value={50}>50%</option>
                      <option value={70}>70%</option>
                      <option value={100}>100% (all sections)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target URL (for backlinks)</label>
                    <input
                      type="url"
                      value={formData.targetUrl}
                      onChange={(e) => handleInputChange('targetUrl', e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 옵션 체크박스 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.includeImages}
                      onChange={(e) => handleInputChange('includeImages', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Generate images</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.includeToc}
                      onChange={(e) => handleInputChange('includeToc', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Include table of contents</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.includeBacklinks}
                      onChange={(e) => handleInputChange('includeBacklinks', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Add external backlinks</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.includeInternalLinks}
                      onChange={(e) => handleInputChange('includeInternalLinks', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Add internal links</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 사이트 선택 패널 */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🌐 Publishing site</h2>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input type="radio" checked={!useRandomSite} onChange={() => setUseRandomSite(false)} className="mr-2" />
                    <span className="text-sm text-gray-700">Select manually</span>
                  </label>

                  <label className="flex items-center">
                    <input type="radio" checked={useRandomSite} onChange={() => setUseRandomSite(true)} className="mr-2" />
                    <span className="text-sm text-gray-700">Choose randomly</span>
                  </label>
                </div>

                {!useRandomSite && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Site to publish</label>
                    <select
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name} ({site.url})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {useRandomSite && (
                  <div className="bg-blue-50 p-4 rounded-md">
                    <p className="text-sm text-blue-700">💡 One of your {sites.length} registered sites will be selected at random.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 생성 버튼 */}
            <div className="mt-6">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !formData.mainKeyword.trim()}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Generating content...
                  </span>
                ) : (
                  '🚀 Generate & publish content'
                )}
              </button>
            </div>
          </div>

          {/* 결과 패널 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Result summary</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Generation failed</h3>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Generation completed!</h3>
                        <p className="text-sm text-green-700 mt-1">The article has been generated and published successfully.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Generated title</h4>
                      <p className="text-sm text-gray-600 mt-1">{result.title}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Published URL</h4>
                      <a
                        href={result.publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 break-all"
                      >
                        {result.publishedUrl}
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Sections:</span>
                        <span className="ml-1 font-medium">{result.sectionCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Word count:</span>
                        <span className="ml-1 font-medium">{result.wordCount?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Generation time:</span>
                        <span className="ml-1 font-medium">{result.generationTime?.toFixed(1)}s</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Upload time:</span>
                        <span className="ml-1 font-medium">{result.uploadTime?.toFixed(1)}s</span>
                      </div>
                    </div>

                    {result.features && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Enabled features</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {result.features.map((feature, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!result && !error && !isGenerating && (
                <div className="text-center text-gray-500 py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="mt-2 text-sm">The generation result will appear here once ready.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
