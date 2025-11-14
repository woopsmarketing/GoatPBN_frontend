/**
 * 🎯 콘텐츠 생성기 페이지
 * 키워드와 페르소나를 기반으로 제목을 생성하는 페이지
 *
 * 주요 기능:
 * - 페르소나 선택
 * - 키워드 입력 (LSI, 롱테일)
 * - 제목 생성
 * - 결과 표시 및 복사
 */

'use client';

import { useState, useEffect } from 'react';
import MainCard from '../../../../components/MainCard';
import TailwindButton from '../../../../components/ui/TailwindButton';
import { titleAPI } from '../../../../lib/api/title';
import { keywordAPI } from '../../../../lib/api/keyword';
import { contentStructureAPI } from '../../../../lib/api/contentStructure';
import { sectionContentAPI } from '../../../../lib/api/sectionContent';

export default function ContentGeneratorPage() {
  // 페르소나 관련 상태
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('expert');
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(false);

  // 키워드 관련 상태
  const [mainKeyword, setMainKeyword] = useState('');
  const [lsiKeywords, setLsiKeywords] = useState([]);
  const [longtailKeywords, setLongtailKeywords] = useState([]);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [lsiCount, setLsiCount] = useState(5);
  const [longtailCount, setLongtailCount] = useState(5);

  // 제목 생성 관련 상태
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

  // 콘텐츠 구조 생성 관련 상태
  const [contentStructure, setContentStructure] = useState({
    sections: [],
    sectionCount: 0,
    isGenerating: false
  });
  const [sectionCount, setSectionCount] = useState(6);

  // 섹션별 콘텐츠 생성 관련 상태
  const [sectionContent, setSectionContent] = useState({
    sections: [],
    combinedContent: '',
    totalSections: 0,
    successfulSections: 0,
    failedSections: 0,
    totalWordCount: 0,
    totalGenerationTime: 0,
    isGenerating: false
  });

  // 컴포넌트 마운트 시 페르소나 로드
  useEffect(() => {
    loadPersonas();
  }, []);

  // 페르소나 목록 로드 함수
  const loadPersonas = async () => {
    try {
      setIsLoadingPersonas(true);
      console.log('페르소나 로딩 시작...');

      const result = await titleAPI.getPersonas();
      console.log('페르소나 API 응답:', result);

      if (!result.success) {
        console.error('페르소나 로드 실패:', result.error);
        alert(`페르소나 로드 실패: ${result.error}`);
        return;
      }

      const personas = result.data.personas || [];
      console.log('로드된 페르소나:', personas);
      setPersonas(personas);

      if (personas.length > 0) {
        setSelectedPersona(personas[0].id); // 첫 번째 페르소나를 기본 선택
      }
    } catch (error) {
      console.error('페르소나 로드 오류:', error);
      alert(`페르소나 로드 오류: ${error.message}`);
    } finally {
      setIsLoadingPersonas(false);
    }
  };

  // 키워드 생성 함수
  const generateKeywords = async () => {
    if (!mainKeyword.trim()) {
      alert('메인 키워드를 입력해주세요.');
      return;
    }

    try {
      setIsGeneratingKeywords(true);
      console.log('키워드 생성 시작:', { mainKeyword, lsiCount, longtailCount });

      const result = await keywordAPI.generateKeywords({
        main_keyword: mainKeyword,
        lsi_count: lsiCount,
        longtail_count: longtailCount
      });

      console.log('키워드 생성 API 응답:', result);

      if (!result.success) {
        console.error('키워드 생성 실패:', result.error);
        alert(`키워드 생성에 실패했습니다: ${result.error}`);
        return;
      }

      const data = result.data;
      console.log('생성된 키워드:', data);

      setLsiKeywords(data.lsi_keywords || []);
      setLongtailKeywords(data.longtail_keywords || []);

      console.log('키워드 상태 업데이트 완료');
    } catch (error) {
      console.error('키워드 생성 오류:', error);
      alert(`키워드 생성에 실패했습니다: ${error.message}`);
    } finally {
      setIsGeneratingKeywords(false);
    }
  };

  // 제목 생성 함수
  const generateTitle = async () => {
    if (!mainKeyword.trim()) {
      alert('메인 키워드를 입력해주세요.');
      return;
    }

    if (lsiKeywords.length === 0 || longtailKeywords.length === 0) {
      alert('먼저 키워드를 생성해주세요.');
      return;
    }

    if (!selectedPersona) {
      alert('페르소나를 선택해주세요.');
      return;
    }

    try {
      setIsGeneratingTitle(true);
      console.log('제목 생성 시작:', { mainKeyword, lsiKeywords, longtailKeywords, selectedPersona });

      const result = await titleAPI.generateTitle({
        main_keyword: mainKeyword,
        lsi_keywords: lsiKeywords,
        longtail_keywords: longtailKeywords,
        persona: selectedPersona
      });

      console.log('제목 생성 API 응답:', result);

      if (!result.success) {
        console.error('제목 생성 실패:', result.error);
        alert(`제목 생성에 실패했습니다: ${result.error}`);
        return;
      }

      const data = result.data;
      console.log('생성된 제목:', data);

      setGeneratedTitle(data.title);
      console.log('제목 상태 업데이트 완료');
    } catch (error) {
      console.error('제목 생성 오류:', error);
      alert(`제목 생성에 실패했습니다: ${error.message}`);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  // 제목 복사 함수
  const copyTitle = () => {
    if (generatedTitle) {
      navigator.clipboard.writeText(generatedTitle);
      alert('제목이 클립보드에 복사되었습니다.');
    }
  };

  // 콘텐츠 구조 생성 함수
  const generateContentStructure = async () => {
    if (!generatedTitle) {
      alert('먼저 제목을 생성해주세요.');
      return;
    }

    if (lsiKeywords.length === 0 || longtailKeywords.length === 0) {
      alert('먼저 키워드를 생성해주세요.');
      return;
    }

    if (!selectedPersona) {
      alert('페르소나를 선택해주세요.');
      return;
    }

    try {
      setContentStructure((prev) => ({ ...prev, isGenerating: true }));
      console.log('콘텐츠 구조 생성 시작:', {
        title: generatedTitle,
        mainKeyword,
        lsiKeywords,
        longtailKeywords,
        selectedPersona,
        sectionCount
      });

      const result = await contentStructureAPI.generateContentStructure({
        title: generatedTitle,
        main_keyword: mainKeyword,
        lsi_keywords: lsiKeywords,
        longtail_keywords: longtailKeywords,
        persona: selectedPersona,
        section_count: sectionCount
      });

      console.log('콘텐츠 구조 생성 API 응답:', result);

      if (!result.success) {
        console.error('콘텐츠 구조 생성 실패:', result.error);
        alert(`콘텐츠 구조 생성에 실패했습니다: ${result.error}`);
        return;
      }

      const data = result.data;
      console.log('생성된 구조:', data);

      setContentStructure({
        sections: data.sections || [],
        sectionCount: data.section_count || 0,
        isGenerating: false
      });

      console.log('구조 상태 업데이트 완료');
    } catch (error) {
      console.error('콘텐츠 구조 생성 오류:', error);
      alert(`콘텐츠 구조 생성에 실패했습니다: ${error.message}`);
      setContentStructure((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  // 섹션별 콘텐츠 생성 함수
  const generateSectionContent = async () => {
    if (!contentStructure.sections || contentStructure.sections.length === 0) {
      alert('먼저 콘텐츠 구조를 생성해주세요.');
      return;
    }

    if (!lsiKeywords || lsiKeywords.length === 0 || !longtailKeywords || longtailKeywords.length === 0) {
      alert('먼저 키워드를 생성해주세요.');
      return;
    }

    if (!selectedPersona) {
      alert('페르소나를 선택해주세요.');
      return;
    }

    try {
      setSectionContent((prev) => ({ ...prev, isGenerating: true }));
      console.log('섹션별 콘텐츠 생성 시작:', {
        sections: contentStructure.sections,
        mainKeyword,
        lsiKeywords,
        longtailKeywords,
        selectedPersona
      });

      const result = await sectionContentAPI.generateSectionContent({
        sections: contentStructure.sections,
        main_keyword: mainKeyword,
        lsi_keywords: lsiKeywords,
        longtail_keywords: longtailKeywords,
        persona: selectedPersona
      });

      console.log('섹션별 콘텐츠 생성 API 응답:', result);

      if (!result.success) {
        console.error('섹션별 콘텐츠 생성 실패:', result.error);
        alert(`섹션별 콘텐츠 생성에 실패했습니다: ${result.error}`);
        return;
      }

      const data = result.data;
      console.log('생성된 섹션 콘텐츠:', data);

      setSectionContent({
        sections: data.sections || [],
        combinedContent: data.combined_content || '',
        totalSections: data.total_sections || 0,
        successfulSections: data.successful_sections || 0,
        failedSections: data.failed_sections || 0,
        totalWordCount: data.total_word_count || 0,
        totalGenerationTime: data.total_generation_time || 0,
        isGenerating: false
      });

      console.log('섹션 콘텐츠 상태 업데이트 완료');
    } catch (error) {
      console.error('섹션별 콘텐츠 생성 오류:', error);
      alert(`섹션별 콘텐츠 생성에 실패했습니다: ${error.message}`);
      setSectionContent((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  // 결합된 콘텐츠 복사 함수
  const copyCombinedContent = async () => {
    if (!sectionContent.combinedContent) {
      alert('복사할 콘텐츠가 없습니다.');
      return;
    }

    try {
      await navigator.clipboard.writeText(sectionContent.combinedContent);
      alert('결합된 콘텐츠가 클립보드에 복사되었습니다!');
    } catch (error) {
      console.error('콘텐츠 복사 실패:', error);
      alert('콘텐츠 복사에 실패했습니다.');
    }
  };

  // 구조 복사 함수
  const copyStructure = () => {
    if (contentStructure.sections.length > 0) {
      const structureText = contentStructure.sections
        .map((section, index) => {
          let text = `${index + 1}. ${section.h2}\n`;
          section.h3.forEach((h3) => {
            text += `   - ${h3}\n`;
            if (section.h4_map && section.h4_map[h3]) {
              section.h4_map[h3].forEach((h4) => {
                text += `     * ${h4}\n`;
              });
            }
          });
          return text;
        })
        .join('\n');

      navigator.clipboard.writeText(structureText);
      alert('콘텐츠 구조가 클립보드에 복사되었습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">콘텐츠 생성기</h1>
        <p className="text-gray-600 mt-2">키워드와 페르소나를 기반으로 매력적인 제목을 생성하세요.</p>
      </div>

      {/* 1단계: 페르소나 선택 */}
      <MainCard title="🎭 1단계: 페르소나 선택">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">페르소나 선택</label>
            {isLoadingPersonas ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">페르소나 로딩 중...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {personas.map((persona) => (
                  <label
                    key={persona.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPersona === persona.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="persona"
                      value={persona.id}
                      checked={selectedPersona === persona.id}
                      onChange={(e) => setSelectedPersona(e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {persona.emoji} {persona.name}
                      </div>
                      <div className="text-sm text-gray-600">{persona.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedPersona && personas.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                {personas.find((p) => p.id === selectedPersona)?.emoji} {personas.find((p) => p.id === selectedPersona)?.name}
              </h4>
              <p className="text-sm text-blue-700">{personas.find((p) => p.id === selectedPersona)?.description}</p>
            </div>
          )}
        </div>
      </MainCard>

      {/* 2단계: 키워드 생성 */}
      <MainCard title="🔑 2단계: 키워드 생성">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">메인 키워드</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={mainKeyword}
                onChange={(e) => setMainKeyword(e.target.value)}
                placeholder="예: 아르바이트"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <TailwindButton
                onClick={generateKeywords}
                disabled={isGeneratingKeywords || !mainKeyword.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isGeneratingKeywords ? '생성 중...' : '키워드 생성'}
              </TailwindButton>
            </div>
          </div>

          {/* 키워드 개수 설정 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">LSI 키워드 개수</label>
              <select
                value={lsiCount}
                onChange={(e) => setLsiCount(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>
                    {num}개
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">롱테일 키워드 개수</label>
              <select
                value={longtailCount}
                onChange={(e) => setLongtailCount(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>
                    {num}개
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 생성된 키워드 표시 */}
          {(lsiKeywords.length > 0 || longtailKeywords.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">LSI 키워드</h4>
                <div className="flex flex-wrap gap-2">
                  {lsiKeywords.map((keyword, index) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">롱테일 키워드</h4>
                <div className="flex flex-wrap gap-2">
                  {longtailKeywords.map((keyword, index) => (
                    <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </MainCard>

      {/* 3단계: 제목 생성 */}
      <MainCard title="📝 3단계: 제목 생성">
        <div className="space-y-4">
          <TailwindButton
            onClick={generateTitle}
            disabled={
              isGeneratingTitle || !mainKeyword.trim() || lsiKeywords.length === 0 || longtailKeywords.length === 0 || !selectedPersona
            }
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isGeneratingTitle ? '제목 생성 중...' : '제목 생성하기'}
          </TailwindButton>

          {/* 생성된 제목 표시 */}
          {generatedTitle && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">생성된 제목</h4>
              <p className="text-lg text-gray-800 mb-3">{generatedTitle}</p>
              <TailwindButton onClick={copyTitle} className="bg-green-600 hover:bg-green-700 text-white">
                📋 제목 복사
              </TailwindButton>
            </div>
          )}
        </div>
      </MainCard>

      {/* 4단계: 콘텐츠 구조 생성 */}
      <MainCard title="📋 4단계: 콘텐츠 구조 생성">
        <div className="space-y-4">
          {/* 섹션 개수 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">섹션 개수 (5-10개)</label>
            <select
              value={sectionCount}
              onChange={(e) => setSectionCount(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num}개
                </option>
              ))}
            </select>
          </div>

          <TailwindButton
            onClick={generateContentStructure}
            disabled={
              contentStructure.isGenerating ||
              !generatedTitle ||
              lsiKeywords.length === 0 ||
              longtailKeywords.length === 0 ||
              !selectedPersona
            }
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {contentStructure.isGenerating ? '구조 생성 중...' : '콘텐츠 구조 생성하기'}
          </TailwindButton>

          {/* 생성된 구조 표시 */}
          {contentStructure.sections.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900">생성된 콘텐츠 구조 ({contentStructure.sectionCount}개 섹션)</h4>
                <TailwindButton onClick={copyStructure} className="bg-green-600 hover:bg-green-700 text-white text-sm">
                  📋 구조 복사
                </TailwindButton>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {contentStructure.sections.map((section, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <h5 className="font-medium text-gray-900 mb-2">
                      {index + 1}. {section.h2}
                    </h5>
                    <div className="ml-4 space-y-1">
                      {section.h3.map((h3, h3Index) => (
                        <div key={h3Index}>
                          <p className="text-sm text-gray-700">- {h3}</p>
                          {section.h4_map && section.h4_map[h3] && (
                            <div className="ml-4 space-y-1">
                              {section.h4_map[h3].map((h4, h4Index) => (
                                <p key={h4Index} className="text-xs text-gray-600">
                                  * {h4}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </MainCard>

      {/* 5단계: 섹션별 콘텐츠 생성 */}
      <MainCard title="📝 5단계: 섹션별 콘텐츠 생성">
        <div className="space-y-4">
          <TailwindButton
            onClick={generateSectionContent}
            disabled={
              sectionContent.isGenerating ||
              !contentStructure.sections ||
              contentStructure.sections.length === 0 ||
              !lsiKeywords ||
              lsiKeywords.length === 0 ||
              !longtailKeywords ||
              longtailKeywords.length === 0 ||
              !selectedPersona
            }
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            {sectionContent.isGenerating ? '섹션별 콘텐츠 생성 중...' : '섹션별 콘텐츠 생성하기'}
          </TailwindButton>

          {/* 생성된 섹션 콘텐츠 표시 */}
          {sectionContent.sections && sectionContent.sections.length > 0 && (
            <div className="space-y-4">
              {/* 생성 통계 */}
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">생성 통계</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-orange-700">총 섹션:</span>
                    <span className="ml-1 font-medium">{sectionContent.totalSections}개</span>
                  </div>
                  <div>
                    <span className="text-orange-700">성공:</span>
                    <span className="ml-1 font-medium text-green-600">{sectionContent.successfulSections}개</span>
                  </div>
                  <div>
                    <span className="text-orange-700">실패:</span>
                    <span className="ml-1 font-medium text-red-600">{sectionContent.failedSections}개</span>
                  </div>
                  <div>
                    <span className="text-orange-700">총 단어:</span>
                    <span className="ml-1 font-medium">{sectionContent.totalWordCount.toLocaleString()}단어</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-orange-700">
                  <span>소요 시간: {sectionContent.totalGenerationTime.toFixed(2)}초</span>
                </div>
              </div>

              {/* 섹션별 콘텐츠 미리보기 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">섹션별 콘텐츠 미리보기</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sectionContent.sections.map((section, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <h5 className="font-medium text-gray-900 mb-2">
                        {index + 1}. {section.h2_title}
                      </h5>
                      <div className="text-sm text-gray-600 mb-2">
                        단어 수: {section.word_count}개 | 생성 시간: {section.generation_time.toFixed(2)}초
                      </div>
                      <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                        {section.content.substring(0, 200)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 결합된 콘텐츠 */}
              {sectionContent.combinedContent && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">결합된 전체 콘텐츠</h4>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {sectionContent.combinedContent.substring(0, 1000)}
                      {sectionContent.combinedContent.length > 1000 && '...'}
                    </pre>
                  </div>
                  <TailwindButton onClick={copyCombinedContent} className="mt-2 bg-green-600 hover:bg-green-700 text-white">
                    📋 전체 콘텐츠 복사
                  </TailwindButton>
                </div>
              )}
            </div>
          )}
        </div>
      </MainCard>

      {/* 전체 프로세스 요약 */}
      <MainCard title="📊 프로세스 요약">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">🎭</div>
            <h4 className="font-medium text-blue-900">페르소나</h4>
            <p className="text-sm text-blue-700">{personas.find((p) => p.id === selectedPersona)?.name || '선택 안됨'}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">🔑</div>
            <h4 className="font-medium text-green-900">키워드</h4>
            <p className="text-sm text-green-700">
              LSI: {lsiKeywords.length}개, 롱테일: {longtailKeywords.length}개
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl mb-2">📝</div>
            <h4 className="font-medium text-purple-900">제목</h4>
            <p className="text-sm text-purple-700">{generatedTitle ? '생성 완료' : '생성 안됨'}</p>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className="text-2xl mb-2">📋</div>
            <h4 className="font-medium text-indigo-900">구조</h4>
            <p className="text-sm text-indigo-700">
              {contentStructure.sectionCount > 0 ? `${contentStructure.sectionCount}개 섹션` : '생성 안됨'}
            </p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl mb-2">📝</div>
            <h4 className="font-medium text-orange-900">콘텐츠</h4>
            <p className="text-sm text-orange-700">
              {sectionContent.successfulSections > 0
                ? `${sectionContent.successfulSections}개 성공, ${sectionContent.totalWordCount.toLocaleString()}단어`
                : '생성 안됨'}
            </p>
          </div>
        </div>
      </MainCard>
    </div>
  );
}
