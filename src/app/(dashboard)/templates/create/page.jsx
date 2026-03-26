'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '../../../../components/MainCard';
import TailwindButton from '../../../../components/ui/TailwindButton';
import { spintaxAPI } from '../../../../lib/api/spintax';

export default function TemplateCreatePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    keywords: [],
    contentLanguage: 'ko'
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !formData.keywords.includes(kw)) {
      setFormData((prev) => ({ ...prev, keywords: [...prev.keywords, kw] }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw) => {
    setFormData((prev) => ({ ...prev, keywords: prev.keywords.filter((k) => k !== kw) }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = '템플릿 이름을 입력하세요';
    if (formData.keywords.length === 0) newErrors.keywords = '최소 1개의 키워드를 추가하세요';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const result = await spintaxAPI.createTemplate({
        keywords: formData.keywords,
        name: formData.name,
        contentLanguage: formData.contentLanguage
      });

      if (result.success) {
        alert(`템플릿 생성이 시작되었습니다.\n이름: ${result.name}\n약 40분 후 사용 가능합니다.`);
        router.push('/templates');
      }
    } catch (err) {
      alert('템플릿 생성 요청 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainCard title="새 스핀택스 템플릿 생성">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          키워드를 입력하면 AI가 마스터 콘텐츠 14~20편을 생성하고, 스핀택스 템플릿으로 조립합니다.
          <br />
          <strong>약 40분 소요</strong>되며, 생성 후에는 이 템플릿으로 무제한 콘텐츠를 즉시 생성할 수 있습니다.
        </div>

        {/* 템플릿 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">템플릿 이름</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="예: 밤알바-v1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* 키워드 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">키워드 (3~5개 권장)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="키워드 입력 후 Enter"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <TailwindButton type="button" variant="outlined" onClick={addKeyword}>
              추가
            </TailwindButton>
          </div>
          {formData.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.keywords.map((kw) => (
                <span key={kw} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {kw}
                  <button type="button" onClick={() => removeKeyword(kw)} className="hover:text-red-600">
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.keywords && <p className="mt-1 text-sm text-red-600">{errors.keywords}</p>}
        </div>

        {/* 언어 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">콘텐츠 언어</label>
          <select
            value={formData.contentLanguage}
            onChange={(e) => setFormData((prev) => ({ ...prev, contentLanguage: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4">
          <TailwindButton type="button" variant="outlined" onClick={() => router.push('/templates')}>
            취소
          </TailwindButton>
          <TailwindButton type="submit" variant="contained" disabled={loading}>
            {loading ? '생성 요청 중...' : '템플릿 생성 시작'}
          </TailwindButton>
        </div>
      </form>
    </MainCard>
  );
}
