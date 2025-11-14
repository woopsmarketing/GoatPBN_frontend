/**
 * 🌐 사이트 리스트 페이지
 * 등록된 워드프레스 사이트들을 관리하고 모니터링하는 페이지
 *
 * 주요 기능:
 * - 사이트 목록 카드/테이블 레이아웃
 * - 연결 상태 모니터링
 * - 사이트 편집/삭제/테스트
 * - 상태별 필터링
 * - 사이트별 캠페인 현황
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '../../../components/MainCard';
import TailwindButton from '../../../components/ui/TailwindButton';
import { sitesAPI } from '../../../lib/api/sites';
import { campaignsAPI } from '../../../lib/api/campaigns';

export default function SiteListPage() {
  const router = useRouter();

  // 사이트 목록 상태
  const [sites, setSites] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignStats, setCampaignStats] = useState({});

  // 필터 및 표시 상태
  const [statusFilter, setStatusFilter] = useState('all'); // all, connected, disconnected
  const [viewMode, setViewMode] = useState('cards'); // cards, table

  // 편집 상태 (간소화: 로컬 상태로 이동)
  const [editingId, setEditingId] = useState(null);

  // 전체 연결 테스트 상태
  const [bulkTestLoading, setBulkTestLoading] = useState(false);
  const [currentTestingSite, setCurrentTestingSite] = useState(null);
  const [testProgress, setTestProgress] = useState({ current: 0, total: 0 });
  const [testAbortController, setTestAbortController] = useState(null);

  // 개별 사이트 연결 테스트 상태
  const [testingSites, setTestingSites] = useState(new Set());

  // 일괄 선택 상태
  const [selectedSites, setSelectedSites] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // 컴포넌트 마운트 시 실제 데이터 로드
  useEffect(() => {
    loadSites();
    // TODO: 캠페인 API 연동 예정
    setCampaigns([]);
  }, []);

  // 사이트 목록 로드 함수
  const loadSites = async () => {
    try {
      const { data, error } = await sitesAPI.getSites();
      if (error) {
        console.error('사이트 로드 오류:', error);
        alert('사이트 목록을 불러오는 중 오류가 발생했습니다.');
      } else {
        // 데이터베이스 필드명을 프론트엔드 필드명으로 매핑
        const mappedSites = (data || []).map((site) => {
          const mapped = {
            ...site,
            lastCheck: site.last_check, // last_check → lastCheck 매핑
            appPassword: site.app_password // app_password → appPassword 매핑
          };

          // 디버깅: 앱패스워드 매핑 확인
          console.log(`🔍 ${site.name} 앱패스워드 매핑:`, {
            'DB app_password': site.app_password,
            'Mapped appPassword': mapped.appPassword,
            Type: typeof mapped.appPassword
          });

          return mapped;
        });
        setSites(mappedSites);

        // 각 사이트별 캠페인 통계 로드
        const statsPromises = mappedSites.map(async (site) => {
          const stats = await getSiteCampaignStats(site.id);
          return { siteId: site.id, stats };
        });

        const statsResults = await Promise.all(statsPromises);
        const statsMap = {};
        statsResults.forEach(({ siteId, stats }) => {
          statsMap[siteId] = stats;
        });

        setCampaignStats(statsMap);
      }
    } catch (error) {
      console.error('사이트 로드 오류:', error);
      alert('사이트 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 사이트별 캠페인 수 계산 (실제 API 연동)
  const getSiteCampaignStats = async (siteId) => {
    try {
      const { data, error } = await campaignsAPI.getSiteCampaignStats(siteId);
      if (error) {
        console.error('캠페인 통계 조회 오류:', error);
        return { total: 0, active: 0, completed: 0 };
      }
      return data;
    } catch (error) {
      console.error('캠페인 통계 조회 오류:', error);
      return { total: 0, active: 0, completed: 0 };
    }
  };

  // 필터링된 사이트 목록
  const filteredSites = sites.filter((site) => {
    if (statusFilter === 'all') return true;
    return site.status === statusFilter;
  });

  // 상태별 통계
  const stats = {
    total: sites.length,
    connected: sites.filter((s) => s.status === 'connected').length,
    disconnected: sites.filter((s) => s.status === 'disconnected').length,
    error: sites.filter((s) => s.status === 'error').length
  };

  // 연결 상태 테스트
  const handleConnectionTest = async (siteId) => {
    // 테스트 중 상태 추가
    setTestingSites((prev) => new Set(prev).add(siteId));

    try {
      const { error } = await sitesAPI.refreshConnection(siteId);
      if (error) {
        alert(`연결 테스트 오류: ${error}`);
        return;
      }
      // 사이트 목록 새로고침
      await loadSites();

      // 개별 테스트 완료 안내
      const site = sites.find((s) => s.id === siteId);
      if (site) {
        alert(`✅ ${site.name} 연결 테스트 완료!\n\n상태: ${site.status === 'connected' ? '연결 성공' : '연결 실패'}`);
      }
    } catch (error) {
      console.error('연결 테스트 오류:', error);
      alert('연결 테스트 중 오류가 발생했습니다.');
    } finally {
      // 테스트 완료 후 상태 제거
      setTestingSites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(siteId);
        return newSet;
      });
    }
  };

  // 모든 사이트 연결 테스트
  const handleBulkConnectionTest = async () => {
    setBulkTestLoading(true);
    setTestProgress({ current: 0, total: sites.length });
    setCurrentTestingSite(null);

    // AbortController 생성 (테스트 중단용)
    const abortController = new AbortController();
    setTestAbortController(abortController);

    try {
      // 각 사이트를 순차적으로 테스트
      for (let i = 0; i < sites.length; i++) {
        // 중단 요청 확인
        if (abortController.signal.aborted) {
          console.log('🛑 연결 테스트가 중단되었습니다.');
          break;
        }

        const site = sites[i];
        setCurrentTestingSite(site.name);
        setTestProgress({ current: i + 1, total: sites.length });

        try {
          await sitesAPI.refreshConnection(site.id);
          console.log(`✅ ${site.name} 연결 테스트 완료`);
        } catch (error) {
          console.error(`❌ 사이트 ${site.name} 연결 테스트 오류:`, error);
        }

        // 0.5초마다 하나씩 테스트 (시각적 효과)
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // 모든 테스트 완료 후 사이트 목록 새로고침
      if (!abortController.signal.aborted) {
        await loadSites();
        console.log('✅ 모든 사이트 연결 테스트 완료');
        alert(
          `✅ 전체 연결 테스트 완료!\n\n테스트된 사이트: ${sites.length}개\n연결 성공: ${sites.filter((s) => s.status === 'connected').length}개\n연결 실패: ${sites.filter((s) => s.status === 'disconnected').length}개`
        );
      }
    } catch (error) {
      console.error('❌ 연결 테스트 오류:', error);
      alert('전체 연결 테스트 중 오류가 발생했습니다.');
    } finally {
      setBulkTestLoading(false);
      setCurrentTestingSite(null);
      setTestProgress({ current: 0, total: 0 });
      setTestAbortController(null);
    }
  };

  // 테스트 중단
  const handleTestAbort = () => {
    if (testAbortController) {
      testAbortController.abort();
      setBulkTestLoading(false);
      setCurrentTestingSite(null);
      setTestProgress({ current: 0, total: 0 });
      setTestAbortController(null);
      console.log('🛑 연결 테스트가 중단되었습니다.');
    }
  };

  // 선택된 사이트들 연결 테스트
  const handleSelectedSitesConnectionTest = async () => {
    if (selectedSites.size === 0) {
      alert('테스트할 사이트를 선택해주세요.');
      return;
    }

    setBulkTestLoading(true);
    setTestProgress({ current: 0, total: selectedSites.size });
    setCurrentTestingSite(null);

    // AbortController 생성 (테스트 중단용)
    const abortController = new AbortController();
    setTestAbortController(abortController);

    try {
      const selectedSitesArray = Array.from(selectedSites);

      // 선택된 사이트들을 순차적으로 테스트
      for (let i = 0; i < selectedSitesArray.length; i++) {
        // 중단 요청 확인
        if (abortController.signal.aborted) {
          console.log('🛑 선택된 사이트 연결 테스트가 중단되었습니다.');
          break;
        }

        const siteId = selectedSitesArray[i];
        const site = sites.find((s) => s.id === siteId);

        if (site) {
          setCurrentTestingSite(site.name);
          setTestProgress({ current: i + 1, total: selectedSitesArray.length });

          try {
            await sitesAPI.refreshConnection(siteId);
            console.log(`✅ ${site.name} 연결 테스트 완료`);
          } catch (error) {
            console.error(`❌ 사이트 ${site.name} 연결 테스트 오류:`, error);
          }

          // 0.5초마다 하나씩 테스트 (시각적 효과)
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // 모든 테스트 완료 후 사이트 목록 새로고침
      if (!abortController.signal.aborted) {
        await loadSites();
        console.log(`✅ 선택된 ${selectedSites.size}개 사이트 연결 테스트 완료`);

        // 선택된 사이트들 테스트 완료 안내
        const selectedSitesArray = Array.from(selectedSites);
        const connectedCount = selectedSitesArray.filter((siteId) => {
          const site = sites.find((s) => s.id === siteId);
          return site && site.status === 'connected';
        }).length;
        const disconnectedCount = selectedSitesArray.length - connectedCount;

        alert(
          `✅ 선택된 사이트 연결 테스트 완료!\n\n테스트된 사이트: ${selectedSitesArray.length}개\n연결 성공: ${connectedCount}개\n연결 실패: ${disconnectedCount}개`
        );
      }
    } catch (error) {
      console.error('❌ 선택된 사이트 연결 테스트 오류:', error);
      alert('선택된 사이트 연결 테스트 중 오류가 발생했습니다.');
    } finally {
      setBulkTestLoading(false);
      setCurrentTestingSite(null);
      setTestProgress({ current: 0, total: 0 });
      setTestAbortController(null);
    }
  };

  // 일괄 선택 관련 함수들
  const handleSelectModeToggle = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedSites(new Set());
    }
  };

  const handleSelectAll = () => {
    if (selectedSites.size === filteredSites.length) {
      setSelectedSites(new Set());
    } else {
      setSelectedSites(new Set(filteredSites.map((s) => s.id)));
    }
  };

  const handleSelectSite = (siteId) => {
    setSelectedSites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(siteId)) {
        newSet.delete(siteId);
      } else {
        newSet.add(siteId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = () => {
    if (selectedSites.size === 0) return;

    const selectedNames = Array.from(selectedSites)
      .map((id) => sites.find((s) => s.id === id)?.name)
      .filter(Boolean);

    if (window.confirm(`선택한 ${selectedSites.size}개 사이트를 삭제하시겠습니까?\n\n${selectedNames.join(', ')}`)) {
      setSites((prev) => prev.filter((s) => !selectedSites.has(s.id)));
      setSelectedSites(new Set());
      setIsSelectMode(false);
      alert(`${selectedSites.size}개 사이트가 삭제되었습니다.`);
      console.log('API 구현중 - 일괄 사이트 삭제:', Array.from(selectedSites));
    }
  };

  // 사이트 삭제
  const handleDeleteSite = async (siteId) => {
    const site = sites.find((s) => s.id === siteId);
    const siteCampaigns = campaigns.filter((c) => c.siteId === siteId);

    if (siteCampaigns.length > 0) {
      if (!window.confirm(`"${site.name}" 사이트에는 ${siteCampaigns.length}개의 캠페인이 연결되어 있습니다. 정말 삭제하시겠습니까?`)) {
        return;
      }
    } else {
      if (!window.confirm(`"${site.name}" 사이트를 삭제하시겠습니까?`)) {
        return;
      }
    }

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
  };

  // 사이트 편집 시작
  const handleEditStart = (site) => {
    setEditingId(site.id);
  };

  // 사이트 편집 저장 (카드/행에서 전달된 데이터 반영)
  const handleEditSave = async (siteId, updatedData) => {
    try {
      // 데이터베이스 필드명으로 변환 (앱패스워드 공백 제거)
      const dbData = {
        name: updatedData.name,
        url: updatedData.url,
        username: updatedData.username,
        password: updatedData.password,
        app_password: updatedData.appPassword ? updatedData.appPassword.replace(/\s/g, '') : updatedData.appPassword
      };

      // API 호출
      const { error } = await sitesAPI.updateSite(siteId, dbData);

      if (error) {
        alert(`사이트 수정 오류: ${error}`);
        return;
      }

      // 로컬 상태 업데이트
      setSites((prev) =>
        prev.map((site) =>
          site.id === siteId
            ? {
                ...site,
                ...updatedData,
                lastCheck: new Date().toISOString()
              }
            : site
        )
      );
      setEditingId(null);
      console.log('✅ 사이트 수정 완료:', { siteId, updatedData });
    } catch (error) {
      console.error('사이트 수정 오류:', error);
      alert('사이트 수정 중 오류가 발생했습니다.');
    }
  };

  // 사이트 편집 취소
  const handleEditCancel = () => {
    setEditingId(null);
  };

  // 상태별 스타일 설정
  const getStatusStyle = (status) => {
    const styles = {
      connected: { bg: 'bg-green-100', text: 'text-green-800', badge: '🟢 연결됨', dot: 'bg-green-500' },
      disconnected: { bg: 'bg-red-100', text: 'text-red-800', badge: '🔴 연결 안됨', dot: 'bg-red-500' },
      error: { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: '⚠️ 오류', dot: 'bg-yellow-500' }
    };
    return styles[status] || styles.error;
  };

  // 연결 상태 표시 컴포넌트
  const ConnectionStatus = ({ status, lastCheck, showDetail = true, siteId = null }) => {
    const statusStyle = getStatusStyle(status);
    const lastCheckDate = lastCheck ? new Date(lastCheck).toLocaleString('ko-KR') : '확인 안됨';

    // 테스트 중인 사이트인지 확인
    const isTesting = siteId && testingSites.has(siteId);

    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isTesting ? 'bg-yellow-500 animate-pulse' : statusStyle.dot}`}></div>
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isTesting ? 'bg-yellow-100 text-yellow-800' : `${statusStyle.bg} ${statusStyle.text}`}`}
        >
          {isTesting ? '⏳ 연결 확인 중...' : statusStyle.badge}
        </span>
        {showDetail && <span className="text-xs text-gray-500">마지막 연결 테스트: {lastCheckDate}</span>}
      </div>
    );
  };

  // 사이트 카드 컴포넌트 (편집 상태를 카드 내부에서 관리)
  const SiteCard = ({ site, isSelectMode, isSelected, onSelect }) => {
    const siteCampaignStats = campaignStats[site.id] || { total: 0, active: 0, completed: 0 };
    const statusStyle = getStatusStyle(site.status);
    const isEditing = editingId === site.id;

    // 로컬 편집 상태
    const [local, setLocal] = useState({
      name: site.name,
      url: site.url,
      username: site.username,
      password: site.password,
      appPassword: site.appPassword
    });

    // 편집 진입 시 초기화
    useEffect(() => {
      if (isEditing)
        setLocal({
          name: site.name,
          url: site.url,
          username: site.username,
          password: site.password,
          appPassword: site.appPassword
        });
    }, [isEditing, site]);

    const handleSave = () => handleEditSave(site.id, local);

    return (
      <div
        className={`bg-white rounded-lg shadow-md border transition-all duration-200 ${
          isSelected ? 'border-blue-500 shadow-blue-100' : 'border-gray-200 hover:shadow-lg'
        }`}
      >
        {/* 카드 헤더 */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* 선택 체크박스 */}
              {isSelectMode && (
                <div className="mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelect(site.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">선택</span>
                  </label>
                </div>
              )}
              {isEditing ? (
                <input
                  key={`name-${site.id}`}
                  type="text"
                  value={local.name}
                  onChange={(e) => setLocal((prev) => ({ ...prev, name: e.target.value }))}
                  className="text-lg font-semibold text-gray-900 border-b border-blue-500 bg-transparent focus:outline-none w-full"
                  autoComplete="off"
                  spellCheck="false"
                />
              ) : (
                <h3 className="text-lg font-semibold text-gray-900">{site.name}</h3>
              )}

              {isEditing ? (
                <input
                  key={`url-${site.id}`}
                  type="text"
                  value={local.url}
                  onChange={(e) => setLocal((prev) => ({ ...prev, url: e.target.value }))}
                  className="text-sm text-gray-600 border-b border-blue-500 bg-transparent focus:outline-none w-full mt-1"
                  autoComplete="off"
                  spellCheck="false"
                />
              ) : (
                <p className="text-sm text-gray-600">{site.url}</p>
              )}

              <div className="mt-2">
                <ConnectionStatus status={site.status} lastCheck={site.lastCheck} showDetail={false} siteId={site.id} />
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button onClick={handleSave} className="text-green-600 hover:text-green-800 text-sm" title="저장">
                    ✅
                  </button>
                  <button onClick={handleEditCancel} className="text-gray-600 hover:text-gray-800 text-sm" title="취소">
                    ❌
                  </button>
                </>
              ) : !isSelectMode ? (
                <>
                  <button
                    onClick={() => handleConnectionTest(site.id)}
                    disabled={testingSites.has(site.id)}
                    className={`text-sm ${
                      testingSites.has(site.id) ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'
                    }`}
                    title={testingSites.has(site.id) ? '연결 테스트 중...' : '연결 테스트'}
                  >
                    {testingSites.has(site.id) ? '⏳' : '🔍'}
                  </button>
                  <button onClick={() => handleEditStart(site)} className="text-indigo-600 hover:text-indigo-800 text-sm" title="편집">
                    ✏️
                  </button>
                  <button onClick={() => handleDeleteSite(site.id)} className="text-red-600 hover:text-red-800 text-sm" title="삭제">
                    🗑️
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* 카드 내용 */}
        <div className="p-4 space-y-3">
          {/* 마지막 연결 테스트 시간 */}
          <div>
            <span className="text-sm font-medium text-gray-700">마지막 연결 테스트: </span>
            <span className="text-sm text-gray-600">{site.lastCheck ? new Date(site.lastCheck).toLocaleString('ko-KR') : '확인 안됨'}</span>
          </div>

          {/* 사용자 정보 - 세로 정렬 */}
          <div className="space-y-2 mt-3">
            <div>
              <span className="text-sm font-medium text-gray-700">사용자명: </span>
              {isEditing ? (
                <input
                  key={`username-${site.id}`}
                  type="text"
                  value={local.username || ''}
                  onChange={(e) => setLocal((prev) => ({ ...prev, username: e.target.value }))}
                  className="text-sm text-gray-600 border-b border-blue-500 bg-transparent focus:outline-none w-full mt-1"
                  autoComplete="off"
                  spellCheck="false"
                />
              ) : (
                <span className="text-sm text-gray-600">{site.username || '설정 안됨'}</span>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">패스워드: </span>
              {isEditing ? (
                <input
                  key={`password-${site.id}`}
                  type="password"
                  value={local.password || ''}
                  onChange={(e) => setLocal((prev) => ({ ...prev, password: e.target.value }))}
                  className="text-sm text-gray-600 border-b border-blue-500 bg-transparent focus:outline-none w-full mt-1"
                  autoComplete="off"
                  spellCheck="false"
                />
              ) : (
                <span className="text-sm text-gray-600">{site.password || '설정 안됨'}</span>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">앱패스워드: </span>
              {isEditing ? (
                <input
                  key={`app_password-${site.id}`}
                  type="password"
                  value={local.appPassword || ''}
                  onChange={(e) => setLocal((prev) => ({ ...prev, appPassword: e.target.value }))}
                  className="text-sm text-gray-600 border-b border-blue-500 bg-transparent focus:outline-none w-full mt-1"
                  autoComplete="off"
                  spellCheck="false"
                />
              ) : (
                <span className="text-sm text-gray-600">{site.appPassword || '설정 안됨'}</span>
              )}
            </div>
          </div>

          {/* 캠페인 통계 */}
          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{siteCampaignStats.total}</div>
              <div className="text-xs text-gray-500">총 캠페인</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{siteCampaignStats.active}</div>
              <div className="text-xs text-gray-500">활성</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{siteCampaignStats.completed}</div>
              <div className="text-xs text-gray-500">완료</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 테이블 행 컴포넌트
  const SiteTableRow = ({ site, isSelectMode, isSelected, onSelect }) => {
    const siteCampaignStats = campaignStats[site.id] || { total: 0, active: 0, completed: 0 };
    const isEditing = editingId === site.id;

    // 로컬 편집 상태
    const [local, setLocal] = useState({ name: site.name, url: site.url, username: site.username });

    useEffect(() => {
      if (isEditing) setLocal({ name: site.name, url: site.url, username: site.username });
    }, [isEditing, site]);

    const handleSave = () => handleEditSave(site.id, local);

    return (
      <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
        <td className="px-6 py-4 whitespace-nowrap">
          {/* 선택 체크박스 */}
          {isSelectMode && (
            <div className="mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect(site.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">선택</span>
              </label>
            </div>
          )}
          {isEditing ? (
            <div className="space-y-1">
              <input
                key={`row-name-${site.id}`}
                type="text"
                value={local.name}
                onChange={(e) => setLocal((prev) => ({ ...prev, name: e.target.value }))}
                className="text-sm font-medium text-gray-900 border-b border-blue-500 bg-transparent focus:outline-none w-full"
                autoComplete="off"
                spellCheck="false"
              />
              <input
                key={`row-url-${site.id}`}
                type="text"
                value={local.url}
                onChange={(e) => setLocal((prev) => ({ ...prev, url: e.target.value }))}
                className="text-sm text-gray-500 border-b border-blue-500 bg-transparent focus:outline-none w-full"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          ) : (
            <div>
              <div className="text-sm font-medium text-gray-900">{site.name}</div>
              <div className="text-sm text-gray-500">{site.url}</div>
            </div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900 space-y-1">
            <div>사용자명: {site.username || '설정 안됨'}</div>
            <div>패스워드: {site.password || '설정 안됨'}</div>
            <div>앱패스워드: {site.appPassword || '설정 안됨'}</div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <ConnectionStatus status={site.status} lastCheck={site.lastCheck} siteId={site.id} />
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <div className="flex justify-center gap-4">
            <div>
              <div className="text-sm font-medium text-gray-900">{siteCampaignStats.total}</div>
              <div className="text-xs text-gray-500">총</div>
            </div>
            <div>
              <div className="text-sm font-medium text-blue-600">{siteCampaignStats.active}</div>
              <div className="text-xs text-gray-500">활성</div>
            </div>
            <div>
              <div className="text-sm font-medium text-green-600">{siteCampaignStats.completed}</div>
              <div className="text-xs text-gray-500">완료</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="text-green-600 hover:text-green-900" title="저장">
                ✅
              </button>
              <button onClick={handleEditCancel} className="text-gray-600 hover:text-gray-900" title="취소">
                ❌
              </button>
            </>
          ) : !isSelectMode ? (
            <>
              <button
                onClick={() => handleConnectionTest(site.id)}
                disabled={testingSites.has(site.id)}
                className={`${testingSites.has(site.id) ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-900'}`}
                title={testingSites.has(site.id) ? '연결 테스트 중...' : '연결 테스트'}
              >
                {testingSites.has(site.id) ? '⏳' : '🔍'}
              </button>
              <button onClick={() => handleEditStart(site)} className="text-indigo-600 hover:text-indigo-900" title="편집">
                ✏️
              </button>
              <button onClick={() => handleDeleteSite(site.id)} className="text-red-600 hover:text-red-900" title="삭제">
                🗑️
              </button>
            </>
          ) : null}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🌐 사이트 관리</h1>
          <p className="text-gray-600 mt-1">등록된 워드프레스 사이트들을 관리하고 모니터링하세요.</p>
        </div>
        <div className="flex gap-3">
          {isSelectMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedSites.size}개 선택됨</span>
              <TailwindButton variant="secondary" onClick={handleSelectAll} className="text-sm">
                {selectedSites.size === filteredSites.length ? '전체 해제' : '전체 선택'}
              </TailwindButton>
              <TailwindButton
                variant="secondary"
                onClick={handleSelectedSitesConnectionTest}
                disabled={bulkTestLoading || selectedSites.size === 0}
                className="text-sm"
              >
                {bulkTestLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    테스트 중...
                  </>
                ) : (
                  `🔍 선택된 ${selectedSites.size}개 테스트`
                )}
              </TailwindButton>
              <TailwindButton variant="danger" onClick={handleBulkDelete} disabled={selectedSites.size === 0} className="text-sm">
                🗑️ 선택 삭제
              </TailwindButton>
            </div>
          )}
          <TailwindButton variant={isSelectMode ? 'secondary' : 'outline'} onClick={handleSelectModeToggle}>
            {isSelectMode ? '선택 취소' : '📋 일괄 선택'}
          </TailwindButton>
          {sites.length > 0 && (
            <div className="flex gap-2">
              <TailwindButton variant="secondary" onClick={bulkTestLoading ? handleTestAbort : handleBulkConnectionTest} disabled={false}>
                {bulkTestLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {currentTestingSite
                      ? `테스트 중: ${currentTestingSite} (${testProgress.current}/${testProgress.total})`
                      : '테스트 중...'}
                  </>
                ) : (
                  '🔍 전체 연결 테스트'
                )}
              </TailwindButton>
              {bulkTestLoading && (
                <TailwindButton variant="danger" onClick={handleTestAbort}>
                  🛑 중단
                </TailwindButton>
              )}
            </div>
          )}
          <TailwindButton variant="primary" onClick={() => router.push('/sites/add')}>
            ➕ 새 사이트 추가
          </TailwindButton>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">전체 사이트</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-green-600">{stats.connected}</div>
          <div className="text-sm text-gray-600">연결됨</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-red-600">{stats.disconnected}</div>
          <div className="text-sm text-gray-600">연결 안됨</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-yellow-600">{stats.error}</div>
          <div className="text-sm text-gray-600">오류</div>
        </div>
      </div>

      {/* 필터 및 뷰 모드 */}
      <div className="flex items-center justify-between">
        {/* 상태 필터 */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'all', label: '전체', count: stats.total },
            { key: 'connected', label: '연결됨', count: stats.connected },
            { key: 'disconnected', label: '연결 안됨', count: stats.disconnected }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === filter.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {/* 뷰 모드 전환 */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 카드
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 테이블
          </button>
        </div>
      </div>

      {/* 사이트 목록 */}
      {filteredSites.length > 0 ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                isSelectMode={isSelectMode}
                isSelected={selectedSites.has(site.id)}
                onSelect={handleSelectSite}
              />
            ))}
          </div>
        ) : (
          <MainCard>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사이트 정보</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자 정보</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연결 상태</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">캠페인 현황</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSites.map((site) => (
                    <SiteTableRow
                      key={site.id}
                      site={site}
                      isSelectMode={isSelectMode}
                      isSelected={selectedSites.has(site.id)}
                      onSelect={handleSelectSite}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </MainCard>
        )
      ) : (
        <MainCard>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌐</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {statusFilter === 'all' ? '등록된 사이트가 없습니다' : `${statusFilter} 상태의 사이트가 없습니다`}
            </h3>
            <p className="text-gray-500 mb-6">새로운 워드프레스 사이트를 등록해보세요.</p>
            <TailwindButton variant="primary" onClick={() => router.push('/sites/add')}>
              첫 번째 사이트 등록하기
            </TailwindButton>
          </div>
        </MainCard>
      )}
    </div>
  );
}
