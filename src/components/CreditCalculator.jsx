/**
 * 💳 크레딧 계산기 컴포넌트
 * 캠페인 생성 시 필요한 크레딧을 실시간으로 계산하여 표시합니다.
 */

'use client';

import { useMemo } from 'react';

export default function CreditCalculator({ formData, userCredits = 100 }) {
  // 콘텐츠 1개당 크레딧 계산
  const creditsPerContent = useMemo(() => {
    let credits = 10; // 기본 크레딧 (섹션 5개 + 메인 이미지)

    // 1. 추가 섹션 (+1 크레딧/개)
    if (formData.sectionCount > 5) {
      credits += formData.sectionCount - 5;
    }

    // 2. 섹션 이미지 (+2 크레딧/개)
    if (formData.includeImages && formData.sectionImageCount > 0) {
      credits += formData.sectionImageCount * 2;
    }

    // 3. 옵션들 (+1 크레딧 각각)
    if (formData.includeToc) credits += 1;
    if (formData.includeBacklinks) credits += 1;
    if (formData.includeInternalLinks) credits += 1;

    return credits;
  }, [formData]);

  // 전체 캠페인 필요 크레딧
  const totalRequired = creditsPerContent * (parseInt(formData.quantity) || 0);

  // 크레딧 부족 여부
  const isInsufficient = totalRequired > userCredits;

  // 사용 후 잔액
  const remainingAfter = userCredits - totalRequired;

  return (
    <div className="bg-white border-2 border-blue-200 rounded-lg p-6 mt-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">💳 크레딧 사용량 예상</h3>

      {/* 콘텐츠 1개당 상세 내역 */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">📄 콘텐츠 1개당 크레딧</h4>
        <div className="space-y-2 text-sm">
          {/* 기본 크레딧 */}
          <div className="flex justify-between text-gray-600">
            <span>기본 콘텐츠 (섹션 5개 + 메인 이미지)</span>
            <span className="font-mono font-semibold">10 크레딧</span>
          </div>

          {/* 추가 섹션 */}
          {formData.sectionCount > 5 && (
            <div className="flex justify-between text-blue-600">
              <span>➕ 추가 섹션 ({formData.sectionCount - 5}개)</span>
              <span className="font-mono font-semibold">+{formData.sectionCount - 5} 크레딧</span>
            </div>
          )}

          {/* 섹션 이미지 */}
          {formData.includeImages && formData.sectionImageCount > 0 && (
            <div className="flex justify-between text-purple-600">
              <span>➕ 섹션 이미지 ({formData.sectionImageCount}개)</span>
              <span className="font-mono font-semibold">+{formData.sectionImageCount * 2} 크레딧</span>
            </div>
          )}

          {/* 목차 */}
          {formData.includeToc && (
            <div className="flex justify-between text-green-600">
              <span>➕ 목차(TOC) 추가</span>
              <span className="font-mono font-semibold">+1 크레딧</span>
            </div>
          )}

          {/* 외부링크 */}
          {formData.includeBacklinks && (
            <div className="flex justify-between text-orange-600">
              <span>➕ 외부링크 추가</span>
              <span className="font-mono font-semibold">+1 크레딧</span>
            </div>
          )}

          {/* 내부링크 */}
          {formData.includeInternalLinks && (
            <div className="flex justify-between text-indigo-600">
              <span>➕ 내부링크 추가</span>
              <span className="font-mono font-semibold">+1 크레딧</span>
            </div>
          )}

          {/* 소계 */}
          <div className="flex justify-between pt-3 mt-3 border-t-2 border-gray-200 font-bold text-gray-800">
            <span>소계</span>
            <span className="font-mono text-lg text-blue-600">{creditsPerContent} 크레딧</span>
          </div>
        </div>
      </div>

      {/* 전체 캠페인 크레딧 */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">🎯 전체 캠페인</h4>
        <div className="text-center py-2">
          <div className="text-sm text-gray-600 mb-1">
            {creditsPerContent} 크레딧 × {formData.quantity || 0}개
          </div>
          <div className={`text-3xl font-bold ${isInsufficient ? 'text-red-600' : 'text-blue-600'}`}>
            = {totalRequired.toLocaleString()} 크레딧
          </div>
        </div>
      </div>

      {/* 사용자 크레딧 현황 */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center text-gray-700">
          <span className="font-medium">💰 보유 크레딧</span>
          <span className="font-mono font-bold text-lg">{userCredits.toLocaleString()} 크레딧</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">📊 사용 후 잔액</span>
          <span className={`font-mono font-bold text-lg ${isInsufficient ? 'text-red-600' : 'text-green-600'}`}>
            {remainingAfter.toLocaleString()} 크레딧
          </span>
        </div>
      </div>

      {/* 경고/안내 메시지 */}
      {isInsufficient ? (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-red-800 mb-2">크레딧이 부족합니다</p>
              <p className="text-sm text-red-700 mb-3">
                이 캠페인을 완료하려면 <strong className="text-red-900">{Math.abs(remainingAfter).toLocaleString()}</strong> 크레딧이 더
                필요합니다. 캠페인은 생성되지만, 크레딧이 소진되면 자동으로 중지됩니다.
              </p>
              <button
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                onClick={() => (window.location.href = '/credits/charge')}
              >
                💳 크레딧 충전하기
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <p className="text-sm text-blue-800">
                <strong>안내:</strong> 콘텐츠가 생성될 때마다 크레딧이 차감됩니다. 캠페인 도중 중지하면 생성된 콘텐츠만큼만 차감됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 절약 팁 (충분한 경우에만 표시) */}
      {!isInsufficient && formData.sectionImageCount > 0 && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <strong>💰 절약 팁:</strong> 이미지를 1개 줄이면 총 <strong>{(formData.quantity || 0) * 2}</strong> 크레딧 절약!
          </p>
        </div>
      )}
    </div>
  );
}
