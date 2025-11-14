/**
 * 🌐 사이트 추가 페이지
 * 워드프레스 사이트 등록 및 연결 관리 기능
 *
 * 주요 기능:
 * - 워드프레스 사이트 등록 폼
 * - 연결 테스트 및 검증
 * - 등록된 사이트 목록 관리
 * - 사이트 수정/삭제 기능
 */

'use client';

import { useState, useEffect } from 'react';
import MainCard from '../../../../components/MainCard';
import TailwindButton from '../../../../components/ui/TailwindButton';
import { sitesAPI } from '../../../../lib/api/sites';

export default function SiteAddPage() {
  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    app_password: ''
  });

  // 등록된 사이트 목록 상태
  const [sites, setSites] = useState([]);

  // 폼 검증 에러 상태
  const [errors, setErrors] = useState({});

  // 연결 테스트 상태
  const [connectionTest, setConnectionTest] = useState({
    isLoading: false,
    result: null // null, 'success', 'error'
  });

  // 편집 모드 상태
  const [editingId, setEditingId] = useState(null);

  // 컴포넌트 마운트 시 실제 데이터 로드
  useEffect(() => {
    loadSites();
  }, []);

  // 사이트 목록 로드 함수
  const loadSites = async () => {
    try {
      const { data, error } = await sitesAPI.getSites();
      if (error) {
        console.error('사이트 로드 오류:', error);
        alert('사이트 목록을 불러오는 중 오류가 발생했습니다.');
      } else {
        setSites(data || []);
      }
    } catch (error) {
      console.error('사이트 로드 오류:', error);
      alert('사이트 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 입력값 변경 핸들러
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    // 에러 메시지 초기화
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // URL 유효성 검사 함수
  const validateUrl = (url) => {
    const urlPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return urlPattern.test(url);
  };

  // 폼 검증 함수
  const validateForm = () => {
    const newErrors = {};

    // 사이트 이름 검증
    if (!formData.name.trim()) {
      newErrors.name = '사이트 이름을 입력해주세요.';
    }

    // URL 검증
    if (!formData.url.trim()) {
      newErrors.url = '사이트 주소를 입력해주세요.';
    } else if (!validateUrl(formData.url)) {
      newErrors.url = '올바른 도메인 형식이 아닙니다. (예: example.com)';
    }

    // 사용자명 검증
    if (!formData.username.trim()) {
      newErrors.username = '워드프레스 사용자명을 입력해주세요.';
    }

    // 비밀번호 검증
    if (!formData.password.trim()) {
      newErrors.password = '워드프레스 비밀번호를 입력해주세요.';
    }

    // 앱 패스워드 검증
    if (!formData.app_password.trim()) {
      newErrors.app_password = '앱 패스워드를 입력해주세요.';
    }
    // 앱 패스워드 길이 검증 제거: WordPress 버전에 따라 16자리 또는 24자리 등 다양한 길이가 가능

    // 중복 URL 검증
    const existingSite = sites.find(
      (site) => site.url.toLowerCase() === formData.url.toLowerCase() && (editingId === null || site.id !== editingId)
    );
    if (existingSite) {
      newErrors.url = '이미 등록된 사이트입니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 연결 테스트 함수
  const handleConnectionTest = async () => {
    if (!validateForm()) {
      return;
    }

    setConnectionTest({ isLoading: true, result: null });

    try {
      const { data, error } = await sitesAPI.testConnection(formData);

      if (error) {
        setConnectionTest({
          isLoading: false,
          result: 'error'
        });
        alert(`연결 테스트 오류: ${error}`);
      } else {
        setConnectionTest({
          isLoading: false,
          result: data.success ? 'success' : 'error'
        });

        if (data.success) {
          console.log('✅ 연결 테스트 성공');
        } else {
          console.log('❌ 연결 테스트 실패:', data.message);
        }
      }
    } catch (error) {
      setConnectionTest({
        isLoading: false,
        result: 'error'
      });
      console.error('연결 테스트 오류:', error);
      alert('연결 테스트 중 오류가 발생했습니다.');
    }
  };

  // 사이트 추가/수정 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // 연결 테스트를 먼저 수행하지 않았다면 경고
    if (connectionTest.result !== 'success') {
      if (!window.confirm('연결 테스트를 먼저 수행하는 것을 권장합니다. 그래도 계속하시겠습니까?')) {
        return;
      }
    }

    try {
      const siteData = {
        ...formData,
        url: formData.url,
        app_password: formData.app_password.replace(/\s/g, ''), // 공백 제거
        status: connectionTest.result === 'success' ? 'connected' : 'disconnected'
      };

      if (editingId) {
        // 사이트 수정
        const { error } = await sitesAPI.updateSite(editingId, siteData);
        if (error) {
          alert(`사이트 수정 오류: ${error}`);
          return;
        }
        setEditingId(null);
        alert('사이트가 성공적으로 수정되었습니다!');
      } else {
        // 새 사이트 추가
        const { error } = await sitesAPI.createSite(siteData);
        if (error) {
          alert(`사이트 등록 오류: ${error}`);
          return;
        }
        alert('사이트가 성공적으로 등록되었습니다!');
      }

      // 폼 초기화
      setFormData({
        name: '',
        url: '',
        username: '',
        password: '',
        app_password: ''
      });
      setConnectionTest({ isLoading: false, result: null });
      setErrors({});

      // 사이트 목록 새로고침
      await loadSites();
    } catch (error) {
      console.error('사이트 저장 오류:', error);
      alert('사이트 저장 중 오류가 발생했습니다.');
    }
  };

  // 사이트 편집 시작
  const handleEditSite = (site) => {
    setEditingId(site.id);
    setFormData({
      name: site.name,
      url: site.url,
      username: site.username,
      password: site.password,
      app_password: site.app_password
    });
    setConnectionTest({ isLoading: false, result: null });
    setErrors({});
  };

  // 사이트 편집 취소
  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: '',
      url: '',
      username: '',
      password: '',
      app_password: ''
    });
    setConnectionTest({ isLoading: false, result: null });
    setErrors({});
  };

  // 사이트 삭제
  const handleDeleteSite = async (siteId) => {
    const site = sites.find((s) => s.id === siteId);
    if (window.confirm(`"${site.name}" 사이트를 삭제하시겠습니까?`)) {
      try {
        const { error } = await sitesAPI.deleteSite(siteId);
        if (error) {
          alert(`사이트 삭제 오류: ${error}`);
          return;
        }
        alert('사이트가 삭제되었습니다.');
        // 사이트 목록 새로고침
        await loadSites();
      } catch (error) {
        console.error('사이트 삭제 오류:', error);
        alert('사이트 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 사이트 연결 상태 새로고침
  const handleRefreshConnection = async (siteId) => {
    try {
      const { error } = await sitesAPI.refreshConnection(siteId);
      if (error) {
        alert(`연결 상태 새로고침 오류: ${error}`);
        return;
      }
      // 사이트 목록 새로고침
      await loadSites();
    } catch (error) {
      console.error('연결 상태 새로고침 오류:', error);
      alert('연결 상태 새로고침 중 오류가 발생했습니다.');
    }
  };

  // 연결 상태 표시 컴포넌트
  const ConnectionStatus = ({ status, lastCheck }) => {
    const statusConfig = {
      connected: { color: 'text-green-600', bg: 'bg-green-100', text: '연결됨' },
      disconnected: { color: 'text-red-600', bg: 'bg-red-100', text: '연결 안됨' },
      error: { color: 'text-yellow-600', bg: 'bg-yellow-100', text: '오류' }
    };

    const config = statusConfig[status] || statusConfig.error;
    const lastCheckDate = lastCheck ? new Date(lastCheck).toLocaleString('ko-KR') : '확인 안됨';

    return (
      <div className="text-center">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
          {config.text}
        </span>
        <p className="text-xs text-gray-500 mt-1">{lastCheckDate}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🌐 사이트 추가</h1>
        <p className="text-gray-600 mt-1">워드프레스 사이트를 등록하고 백링크 캠페인에 활용하세요.</p>
      </div>

      {/* 사이트 등록 폼 */}
      <MainCard title={editingId ? '📝 사이트 수정' : '➕ 새 사이트 등록'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 사이트 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">사이트 이름 *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="예: 내 블로그, 회사 웹사이트"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              <p className="text-gray-500 text-xs mt-1">사이트를 구분할 수 있는 이름을 입력하세요</p>
            </div>

            {/* 사이트 주소 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">사이트 주소 (도메인) *</label>
              <input
                type="text"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.url ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="예: myblog.com"
              />
              {errors.url && <p className="text-red-500 text-sm mt-1">{errors.url}</p>}
              <p className="text-gray-500 text-xs mt-1">http:// 없이 도메인만 입력하세요</p>
            </div>

            {/* 워드프레스 사용자명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">워드프레스 사용자명 *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="예: admin, editor"
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
            </div>

            {/* 워드프레스 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">워드프레스 비밀번호 *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="워드프레스 로그인 비밀번호"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
          </div>

          {/* 앱 패스워드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">앱 패스워드 *</label>
            <input
              type="text"
              name="app_password"
              value={formData.app_password}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.app_password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="예: atu1 3EH5 DVaS AN5X JRG2 70UV (16자리, 공백 포함 가능)"
            />
            {errors.app_password && <p className="text-red-500 text-sm mt-1">{errors.app_password}</p>}
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 text-sm font-medium mb-1">💡 앱 패스워드 생성 방법</p>
              <p className="text-blue-700 text-xs mb-2">워드프레스 관리자 → 사용자 → 프로필 → 앱 패스워드에서 생성할 수 있습니다.</p>
              <p className="text-blue-700 text-xs">
                <strong>예시:</strong> "atu1 3EH5 DVaS AN5X JRG2 70UV" (공백 포함하여 그대로 입력하세요)
              </p>
            </div>
          </div>

          {/* 연결 테스트 결과 */}
          {connectionTest.result && (
            <div
              className={`p-4 rounded-md ${
                connectionTest.result === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center">
                <span className={`text-lg mr-2 ${connectionTest.result === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {connectionTest.result === 'success' ? '✅' : '❌'}
                </span>
                <span className={`font-medium ${connectionTest.result === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {connectionTest.result === 'success' ? '연결 테스트 성공!' : '연결 테스트 실패'}
                </span>
              </div>
              <p className={`text-sm mt-1 ${connectionTest.result === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {connectionTest.result === 'success'
                  ? 'WordPress REST API 연결이 정상적으로 작동합니다.'
                  : '사이트 정보를 확인하고 다시 시도해주세요.'}
              </p>
            </div>
          )}

          {/* 버튼 그룹 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <TailwindButton
              type="button"
              variant="secondary"
              onClick={handleConnectionTest}
              disabled={connectionTest.isLoading}
              className="flex-1"
            >
              {connectionTest.isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700"
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
                  연결 테스트 중...
                </>
              ) : (
                '🔍 연결 테스트'
              )}
            </TailwindButton>

            {editingId && (
              <TailwindButton type="button" variant="secondary" onClick={handleCancelEdit} className="flex-1">
                취소
              </TailwindButton>
            )}

            <TailwindButton type="submit" variant="primary" className="flex-1">
              {editingId ? '📝 사이트 수정' : '➕ 사이트 등록'}
            </TailwindButton>
          </div>
        </form>
      </MainCard>

      {/* 등록된 사이트 목록 */}
      {sites.length > 0 ? (
        <MainCard title="📋 등록된 사이트 목록">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사이트 정보</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연결 상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sites.map((site) => (
                  <tr key={site.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{site.name}</div>
                        <div className="text-sm text-gray-500">{site.url}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{site.username}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ConnectionStatus status={site.status} lastCheck={site.last_check} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleRefreshConnection(site.id)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="연결 상태 새로고침"
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => handleEditSite(site)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        title="사이트 수정"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteSite(site.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="사이트 삭제"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              💡 <strong>팁:</strong> 연결 상태가 '연결 안됨'인 경우, 앱 패스워드나 사용자 권한을 확인해보세요.
            </p>
          </div>
        </MainCard>
      ) : (
        <MainCard title="📋 등록된 사이트 목록">
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🌐</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 사이트가 없습니다</h3>
            <p className="text-gray-500 mb-6">워드프레스 사이트를 등록하여 백링크 캠페인을 시작하세요.</p>
            <div className="text-sm text-gray-400">
              💡 <strong>팁:</strong> 위의 폼을 사용하여 첫 번째 사이트를 등록해보세요.
            </div>
          </div>
        </MainCard>
      )}
    </div>
  );
}
