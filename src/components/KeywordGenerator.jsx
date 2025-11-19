/**
 * 키워드 생성 컴포넌트
 * 백엔드 API를 통해 LSI 키워드와 롱테일 키워드를 생성하는 컴포넌트
 */

import React, { useState } from 'react';
import { buildApiUrl, jsonHeaders } from '@/lib/api/httpClient';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  TagIcon
} from '@heroicons/react/24/outline';

const KeywordGenerator = () => {
  // 상태 관리
  const [mainKeyword, setMainKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  /**
   * 키워드 생성 함수
   * 백엔드 API를 호출하여 키워드를 생성합니다
   */
  const generateKeywords = async () => {
    if (!mainKeyword.trim()) {
      setError('키워드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(buildApiUrl('/api/keywords/generate'), {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({
          main_keyword: mainKeyword.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error_message || '키워드 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      console.error('키워드 생성 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 키워드 복사 함수
   * 클립보드에 키워드를 복사합니다
   */
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // 복사 성공 알림 (간단한 토스트 메시지)
      alert('클립보드에 복사되었습니다!');
    });
  };

  /**
   * 새 키워드 생성 함수
   * 폼을 초기화하고 새로운 키워드를 생성할 수 있도록 합니다
   */
  const resetForm = () => {
    setMainKeyword('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">키워드 생성기</h2>
        <p className="text-gray-600">메인 키워드를 입력하면 LSI 키워드와 롱테일 키워드를 자동으로 생성합니다.</p>
      </div>

      {/* 입력 폼 */}
      <div className="mb-8">
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="mainKeyword" className="block text-sm font-medium text-gray-700 mb-2">
              메인 키워드
            </label>
            <input
              type="text"
              id="mainKeyword"
              value={mainKeyword}
              onChange={(e) => setMainKeyword(e.target.value)}
              placeholder="예: 아르바이트, 스포츠중계, 대구맛집"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={generateKeywords}
              disabled={isLoading || !mainKeyword.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <ClockIcon className="w-5 h-5 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="w-5 h-5" />
                  키워드 생성
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* 결과 표시 */}
      {result && (
        <div className="space-y-6">
          {/* 성공 메시지 */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-500" />
            <div>
              <span className="text-green-700 font-medium">키워드 생성 완료!</span>
              <span className="text-green-600 ml-2">({result.generation_time?.toFixed(2)}초 소요)</span>
            </div>
          </div>

          {/* LSI 키워드 */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <TagIcon className="w-5 h-5 text-blue-500" />
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
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <DocumentTextIcon className="w-5 h-5 text-green-500" />
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

          {/* 통계 정보 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">생성 통계</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-600">총 키워드:</span>
                <span className="ml-1 font-medium">{result.total_keywords || 0}개</span>
              </div>
              <div>
                <span className="text-blue-600">LSI 키워드:</span>
                <span className="ml-1 font-medium">{result.lsi_keywords?.length || 0}개</span>
              </div>
              <div>
                <span className="text-blue-600">롱테일 키워드:</span>
                <span className="ml-1 font-medium">{result.longtail_keywords?.length || 0}개</span>
              </div>
              <div>
                <span className="text-blue-600">생성 시간:</span>
                <span className="ml-1 font-medium">{result.generation_time?.toFixed(2)}초</span>
              </div>
            </div>
          </div>

          {/* 새 키워드 생성 버튼 */}
          <div className="flex justify-center">
            <button onClick={resetForm} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              새 키워드 생성
            </button>
          </div>
        </div>
      )}

      {/* 사용법 안내 */}
      {!result && !error && (
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">사용법</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 메인 키워드를 입력하고 "키워드 생성" 버튼을 클릭하세요</li>
            <li>• LSI 키워드는 의미적으로 연관된 키워드입니다</li>
            <li>• 롱테일 키워드는 구체적이고 긴 키워드입니다</li>
            <li>• 생성된 키워드를 클릭하면 클립보드에 복사됩니다</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default KeywordGenerator;
