'use client';

/**
 * 키워드 생성기 페이지
 * 개별 기능으로 키워드 생성을 테스트할 수 있는 페이지
 */

import React, { useState } from 'react';
import { SearchNormal, TickCircle, Warning2, Clock, DocumentText, Tag, Refresh } from '@wandersonalwes/iconsax-react';

const KeywordGeneratorPage = () => {
  // 상태 관리
  const [mainKeyword, setMainKeyword] = useState('');
  const [lsiCount, setLsiCount] = useState(5);
  const [longtailCount, setLongtailCount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 키워드 생성 함수
  const generateKeywords = async () => {
    if (!mainKeyword.trim()) {
      setError('메인 키워드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:8000/api/keywords/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          main_keyword: mainKeyword.trim(),
          lsi_count: lsiCount,
          longtail_count: longtailCount
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(`키워드 생성 실패: ${err.message}`);
      console.error('키워드 생성 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 키워드 복사 함수
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // 간단한 피드백 (선택사항)
      console.log('클립보드에 복사됨:', text);
    });
  };

  return (
    <div className="p-6">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">키워드 생성기</h1>
        <p className="text-gray-600">메인 키워드를 입력하면 LSI 키워드와 롱테일 키워드를 자동으로 생성합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 키워드 설정 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">키워드 설정</h2>

          <div className="space-y-6">
            {/* 메인 키워드 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">메인 키워드 *</label>
              <input
                type="text"
                value={mainKeyword}
                onChange={(e) => setMainKeyword(e.target.value)}
                placeholder="예: 아르바이트, 스포츠중계, 대구맛집"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* LSI 키워드 개수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">LSI 키워드 개수</label>
              <input
                type="number"
                min="1"
                max="20"
                value={lsiCount}
                onChange={(e) => setLsiCount(parseInt(e.target.value) || 5)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* 롱테일 키워드 개수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">롱테일 키워드 개수</label>
              <input
                type="number"
                min="1"
                max="20"
                value={longtailCount}
                onChange={(e) => setLongtailCount(parseInt(e.target.value) || 5)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* 생성 버튼 */}
            <div>
              <button
                onClick={generateKeywords}
                disabled={isLoading || !mainKeyword.trim()}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Refresh className="w-5 h-5 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <SearchNormal className="w-5 h-5" />
                    키워드 생성
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 결과 표시 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">생성 결과</h2>

          {/* 오류 메시지 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <Warning2 className="w-6 h-6 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* 성공 메시지 */}
          {result && (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <TickCircle className="w-6 h-6 text-green-500" />
                <div>
                  <span className="text-green-700 font-medium">키워드 생성 완료!</span>
                  <span className="text-green-600 ml-2">({result.generation_time?.toFixed(2)}초 소요)</span>
                </div>
              </div>

              {/* LSI 키워드 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">LSI 키워드 ({result.lsi_keywords?.length || 0}개)</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.lsi_keywords?.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => copyToClipboard(keyword)}
                      title="클릭하여 복사"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* 롱테일 키워드 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <DocumentText className="w-5 h-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-gray-900">롱테일 키워드 ({result.longtail_keywords?.length || 0}개)</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.longtail_keywords?.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm cursor-pointer hover:bg-green-200 transition-colors"
                      onClick={() => copyToClipboard(keyword)}
                      title="클릭하여 복사"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 사용법 안내 */}
          {!result && !error && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">사용법</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• 메인 키워드를 입력하고 "키워드 생성" 버튼을 클릭하세요</li>
                <li>• LSI 키워드는 의미적으로 연관된 키워드입니다</li>
                <li>• 롱테일 키워드는 구체적이고 긴 키워드입니다</li>
                <li>• 생성된 키워드를 클릭하면 클립보드에 복사됩니다</li>
                <li>• 백엔드 서버가 실행 중인지 확인해주세요</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeywordGeneratorPage;
