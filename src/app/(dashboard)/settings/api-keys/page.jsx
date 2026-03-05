'use client';

// v1.0 - API 키 관리 페이지 (2026.03.05)
// 한글 주석: 외부 API 연동을 위한 API 키 생성 및 관리 UI
// 목적: 사용자가 API 키를 생성하고 활성화/비활성화/삭제할 수 있도록 함

import { useEffect, useState } from 'react';
import MainCard from '@/components/MainCard';
import { getApiKeys, createApiKey, toggleApiKey, deleteApiKey } from '@/lib/api/apiKeys';

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [copiedKey, setCopiedKey] = useState('');

  // API 키 목록 로드
  const loadApiKeys = async () => {
    setLoading(true);
    const result = await getApiKeys();
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setApiKeys(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  // 새 API 키 생성
  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      setMessage({ type: 'error', text: 'API 키 이름을 입력해주세요.' });
      return;
    }

    setCreating(true);
    setMessage({ type: '', text: '' });

    const result = await createApiKey(newKeyName);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'API 키가 생성되었습니다. 안전한 곳에 보관하세요!' });
      setNewKeyName('');
      setShowCreateForm(false);
      await loadApiKeys();
    }

    setCreating(false);
  };

  // API 키 활성화/비활성화
  const handleToggleApiKey = async (apiKeyId, currentStatus) => {
    const result = await toggleApiKey(apiKeyId, !currentStatus);
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: `API 키가 ${!currentStatus ? '활성화' : '비활성화'}되었습니다.` });
      await loadApiKeys();
    }
  };

  // API 키 삭제
  const handleDeleteApiKey = async (apiKeyId, keyName) => {
    if (!confirm(`"${keyName}" API 키를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    const result = await deleteApiKey(apiKeyId);
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'API 키가 삭제되었습니다.' });
      await loadApiKeys();
    }
  };

  // API 키 복사
  const handleCopyApiKey = (apiKey) => {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopiedKey(apiKey);
      setTimeout(() => setCopiedKey(''), 2000);
    });
  };

  // 마스킹된 API 키 표시
  const maskApiKey = (apiKey) => {
    if (!apiKey) return '';
    return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}`;
  };

  return (
    <div className="space-y-6">
      <MainCard title="🔑 API 키 관리">
        <div className="space-y-6">
          {/* 안내 메시지 */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <h4 className="mb-2 font-semibold text-blue-900">API 키란?</h4>
            <p className="text-sm text-blue-800">
              외부 프로젝트에서 이 시스템에 접근할 때 사용하는 인증 키입니다. API 키를 사용하면 다른 웹앱이나 서버에서 자동으로 캠페인을
              생성할 수 있습니다.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-blue-800">
              <li>API 키는 생성 시 한 번만 표시됩니다. 안전한 곳에 보관하세요.</li>
              <li>API 키가 유출되면 즉시 비활성화하거나 삭제하세요.</li>
              <li>서버 사이드에서만 사용하고, 클라이언트 코드에 노출하지 마세요.</li>
            </ul>
          </div>

          {/* 메시지 표시 */}
          {message.text && (
            <div
              className={`rounded-lg border p-4 ${
                message.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* API 키 생성 버튼 */}
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              + 새 API 키 생성
            </button>
          )}

          {/* API 키 생성 폼 */}
          {showCreateForm && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-3 font-semibold text-gray-900">새 API 키 생성</h4>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">API 키 이름</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="예: 외부 프로젝트 연동"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="mt-1 text-xs text-gray-500">식별하기 쉬운 이름을 입력하세요.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateApiKey}
                    disabled={creating}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    {creating ? '생성 중...' : '생성하기'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewKeyName('');
                      setMessage({ type: '', text: '' });
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* API 키 목록 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">API 키 목록 ({apiKeys.length}개)</h4>

            {loading ? (
              <div className="py-8 text-center text-sm text-gray-500">로딩 중...</div>
            ) : apiKeys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-8 text-center">
                <p className="text-sm text-gray-500">생성된 API 키가 없습니다.</p>
                <p className="mt-1 text-xs text-gray-400">위 버튼을 클릭하여 새 API 키를 생성하세요.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-gray-900">{key.key_name}</h5>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              key.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {key.is_active ? '활성' : '비활성'}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">{maskApiKey(key.api_key)}</code>
                          <button onClick={() => handleCopyApiKey(key.api_key)} className="text-xs text-blue-600 hover:text-blue-800">
                            {copiedKey === key.api_key ? '✓ 복사됨' : '복사'}
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          <p>생성일: {new Date(key.created_at).toLocaleString('ko-KR')}</p>
                          {key.last_used_at && <p>마지막 사용: {new Date(key.last_used_at).toLocaleString('ko-KR')}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleApiKey(key.id, key.is_active)}
                          className={`rounded-lg px-3 py-1 text-xs font-medium ${
                            key.is_active
                              ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {key.is_active ? '비활성화' : '활성화'}
                        </button>
                        <button
                          onClick={() => handleDeleteApiKey(key.id, key.key_name)}
                          className="rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* API 사용 가이드 */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="mb-3 font-semibold text-gray-900">📚 API 사용 가이드</h4>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="font-medium">엔드포인트:</p>
                <code className="mt-1 block rounded bg-white px-3 py-2 text-xs">
                  POST https://your-domain.com/api/external/create-campaign
                </code>
              </div>
              <div>
                <p className="font-medium">인증 헤더:</p>
                <code className="mt-1 block rounded bg-white px-3 py-2 text-xs">Authorization: Bearer YOUR_API_KEY</code>
              </div>
              <div>
                <p className="font-medium">요청 예시 (cURL):</p>
                <pre className="mt-1 overflow-x-auto rounded bg-white p-3 text-xs">
                  {`curl -X POST https://your-domain.com/api/external/create-campaign \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "campaignName": "테스트 캠페인",
    "siteId": "your-site-uuid",
    "targetSite": "https://example.com",
    "keywords": ["키워드1", "키워드2"],
    "quantity": 10,
    "duration": 5
  }'`}
                </pre>
              </div>
              <div>
                <p className="font-medium">필수 파라미터:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                  <li>
                    <code>campaignName</code>: 캠페인 이름
                  </li>
                  <li>
                    <code>siteId</code>: 워드프레스 사이트 UUID
                  </li>
                  <li>
                    <code>targetSite</code>: 타겟 사이트 URL
                  </li>
                  <li>
                    <code>keywords</code>: 키워드 배열
                  </li>
                  <li>
                    <code>quantity</code>: 생성할 콘텐츠 수량
                  </li>
                  <li>
                    <code>duration</code>: 캠페인 기간 (일)
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-medium">선택 파라미터:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                  <li>
                    <code>siteIds</code>: 다중 사이트 UUID 배열
                  </li>
                  <li>
                    <code>persona</code>: 페르소나 (기본: expert)
                  </li>
                  <li>
                    <code>sectionCount</code>: 섹션 개수 (기본: 5)
                  </li>
                  <li>
                    <code>includeImages</code>: 이미지 포함 (기본: false)
                  </li>
                  <li>
                    <code>includeBacklinks</code>: 백링크 포함 (기본: true)
                  </li>
                  <li>
                    <code>startType</code>: immediate/delayed/scheduled (기본: immediate)
                  </li>
                </ul>
              </div>
              <div className="rounded border border-yellow-200 bg-yellow-50 p-3">
                <p className="font-medium text-yellow-900">⚠️ 보안 주의사항</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-yellow-800">
                  <li>API 키는 절대 클라이언트 사이드 코드나 Git에 노출하지 마세요.</li>
                  <li>서버 환경 변수나 비밀 관리 시스템에 저장하세요.</li>
                  <li>정기적으로 API 키를 갱신하는 것을 권장합니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </MainCard>
    </div>
  );
}
