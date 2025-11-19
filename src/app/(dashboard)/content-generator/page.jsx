'use client';

import { useState, useEffect } from 'react';
import { sitesAPI } from '@/lib/api/sites';
import { campaignsAPI } from '@/lib/api/campaigns';
import { supabase } from '@/lib/supabase';
import { buildApiUrl, jsonHeaders } from '@/lib/api/httpClient';

/**
 * 콘텐츠 생성기 페이지
 * 수동으로 콘텐츠를 생성하고 워드프레스에 업로드할 수 있는 시스템
 */
export default function ContentGeneratorPage() {
  // 기본 상태
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

  // 페르소나 옵션
  const personas = [
    { id: 'expert', name: '전문가', description: '권위 있고 신뢰할 수 있는 콘텐츠' },
    { id: 'beginner', name: '초보자', description: '쉽고 이해하기 쉬운 콘텐츠' },
    { id: 'practical', name: '실용가', description: '실용적이고 실행 가능한 콘텐츠' },
    { id: 'storyteller', name: '스토리텔러', description: '흥미롭고 재미있는 스토리' },
    { id: 'analyst', name: '분석가', description: '데이터 기반 분석 콘텐츠' },
    { id: 'reviewer', name: '리뷰어', description: '객관적이고 균형잡힌 리뷰' }
  ];

  // 컴포넌트 마운트 시 사이트 목록 로드 및 이전 결과 복원
  useEffect(() => {
    loadSites();

    // 현재 로그인한 사용자의 이전 생성 결과가 있다면 복원
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
      } catch (error) {
        console.error('저장된 결과 복원 실패:', error);
      }
    };

    loadUserSpecificResult();
  }, []);

  /**
   * 사이트 목록 로드
   */
  const loadSites = async () => {
    try {
      const response = await sitesAPI.getSites();
      if (response.success) {
        setSites(response.data);
        if (response.data.length > 0) {
          setSelectedSite(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('사이트 목록 로드 실패:', error);
    }
  };

  /**
   * 폼 데이터 업데이트
   */
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * 콘텐츠 생성 실행
   */
  const handleGenerate = async () => {
    if (!formData.mainKeyword.trim()) {
      setError('메인 키워드를 입력해주세요.');
      return;
    }

    if (formData.includeBacklinks && !formData.targetUrl.trim()) {
      setError('백링크를 활성화한 경우 타겟 URL을 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      // 랜덤 사이트 선택
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

      console.log('콘텐츠 생성 요청:', requestData);

      // 백엔드 API 호출
      const response = await fetch(buildApiUrl('/api/content/generate'), {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);

        // 현재 로그인한 사용자별로 결과를 localStorage에 저장
        try {
          const {
            data: { user }
          } = await supabase.auth.getUser();
          if (user) {
            const userSpecificKey = `lastContentResult_${user.id}`;
            localStorage.setItem(userSpecificKey, JSON.stringify(data));
          }
        } catch (error) {
          console.error('localStorage 저장 실패:', error);
        }

        console.log('콘텐츠 생성 성공:', data);
      } else {
        setError(data.error || '콘텐츠 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('콘텐츠 생성 오류:', error);
      setError('콘텐츠 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚀 AI 콘텐츠 생성기</h1>
          <p className="text-gray-600">키워드와 옵션을 설정하여 자동으로 콘텐츠를 생성하고 워드프레스에 업로드합니다</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 설정 패널 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">📝 콘텐츠 생성 설정</h2>

              <div className="space-y-6">
                {/* 기본 설정 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">메인 키워드 *</label>
                    <input
                      type="text"
                      value={formData.mainKeyword}
                      onChange={(e) => handleInputChange('mainKeyword', e.target.value)}
                      placeholder="예: 릴담배, 블로그수익화, 워드프레스"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">페르소나</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">섹션 개수</label>
                    <select
                      value={formData.sectionCount}
                      onChange={(e) => handleInputChange('sectionCount', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={3}>3개</option>
                      <option value={4}>4개</option>
                      <option value={5}>5개</option>
                      <option value={6}>6개</option>
                      <option value={7}>7개</option>
                      <option value={8}>8개</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">이미지 생성 확률</label>
                    <select
                      value={formData.imageProbability}
                      onChange={(e) => handleInputChange('imageProbability', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>0% (이미지 없음)</option>
                      <option value={20}>20%</option>
                      <option value={30}>30%</option>
                      <option value={50}>50%</option>
                      <option value={70}>70%</option>
                      <option value={100}>100% (모든 섹션)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">타겟 URL (백링크용)</label>
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
                    <span className="text-sm text-gray-700">이미지 생성</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.includeToc}
                      onChange={(e) => handleInputChange('includeToc', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">목차 포함</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.includeBacklinks}
                      onChange={(e) => handleInputChange('includeBacklinks', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">백링크 추가</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.includeInternalLinks}
                      onChange={(e) => handleInputChange('includeInternalLinks', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">내부링크 추가</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 사이트 선택 패널 */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🌐 업로드 사이트 선택</h2>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input type="radio" checked={!useRandomSite} onChange={() => setUseRandomSite(false)} className="mr-2" />
                    <span className="text-sm text-gray-700">사이트 직접 선택</span>
                  </label>

                  <label className="flex items-center">
                    <input type="radio" checked={useRandomSite} onChange={() => setUseRandomSite(true)} className="mr-2" />
                    <span className="text-sm text-gray-700">랜덤 선택</span>
                  </label>
                </div>

                {!useRandomSite && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">업로드할 사이트</label>
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
                    <p className="text-sm text-blue-700">💡 등록된 {sites.length}개 사이트 중 랜덤으로 선택됩니다</p>
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
                    콘텐츠 생성 중...
                  </span>
                ) : (
                  '🚀 콘텐츠 생성 및 업로드'
                )}
              </button>
            </div>
          </div>

          {/* 결과 패널 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 생성 결과</h2>

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
                      <h3 className="text-sm font-medium text-red-800">오류 발생</h3>
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
                        <h3 className="text-sm font-medium text-green-800">생성 완료!</h3>
                        <p className="text-sm text-green-700 mt-1">콘텐츠가 성공적으로 생성되고 업로드되었습니다.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">생성된 제목</h4>
                      <p className="text-sm text-gray-600 mt-1">{result.title}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900">업로드된 URL</h4>
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
                        <span className="text-gray-500">섹션 수:</span>
                        <span className="ml-1 font-medium">{result.sectionCount}개</span>
                      </div>
                      <div>
                        <span className="text-gray-500">단어 수:</span>
                        <span className="ml-1 font-medium">{result.wordCount?.toLocaleString()}개</span>
                      </div>
                      <div>
                        <span className="text-gray-500">생성 시간:</span>
                        <span className="ml-1 font-medium">{result.generationTime?.toFixed(1)}초</span>
                      </div>
                      <div>
                        <span className="text-gray-500">업로드 시간:</span>
                        <span className="ml-1 font-medium">{result.uploadTime?.toFixed(1)}초</span>
                      </div>
                    </div>

                    {result.features && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">활성화된 기능</h4>
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
                  <p className="mt-2 text-sm">콘텐츠 생성 결과가 여기에 표시됩니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
