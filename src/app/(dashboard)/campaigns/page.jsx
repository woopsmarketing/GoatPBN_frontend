/**
 * 📋 캠페인 리스트 페이지
 * 생성된 백링크 캠페인들을 관리하고 모니터링하는 페이지
 *
 * 주요 기능:
 * - 캠페인 목록 카드 레이아웃
 * - 진행률 및 상태 표시
 * - 캠페인 편집/삭제/제어
 * - 상태별 필터링
 * - 실시간 진행 현황
 */

'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '../../../components/MainCard';
import TailwindButton from '../../../components/ui/TailwindButton';
import { campaignsAPI } from '../../../lib/api/campaigns';

export default function CampaignListPage() {
  const router = useRouter();

  // 캠페인 목록 상태
  const [campaigns, setCampaigns] = useState([]);

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, completed, paused

  // 편집 상태 (간소화)
  const [editingId, setEditingId] = useState(null);

  // 일괄 선택 상태
  const [selectedCampaigns, setSelectedCampaigns] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true);

  // 컴포넌트 마운트 시 캠페인 데이터 로드
  useEffect(() => {
    loadCampaigns();
  }, []);

  // 캠페인 목록 로드 함수
  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await campaignsAPI.getCampaignsWithSites();

      if (error) {
        console.error('캠페인 로드 오류:', error);
        alert('캠페인 목록을 불러오는데 실패했습니다.');
        return;
      }

      // 데이터베이스 필드명을 프론트엔드 필드명으로 매핑
      const mappedCampaigns = (data || []).map((campaign) => ({
        ...campaign,
        siteId: campaign.site_id,
        targetSite: campaign.target_site,
        completedCount: campaign.completed_count,
        dailyTarget: campaign.daily_target,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at,
        startedAt: campaign.started_at, // started_at 매핑 추가
        siteInfo: campaign.sites
      }));

      setCampaigns(mappedCampaigns);
    } catch (error) {
      console.error('캠페인 로드 오류:', error);
      alert('캠페인 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 사이트 정보 가져오기 함수 (캠페인 객체에서 직접 가져오기)
  const getSiteInfo = (campaign) => {
    return campaign.siteInfo || { name: '알 수 없는 사이트', url: '' };
  };

  // 필터링된 캠페인 목록
  const filteredCampaigns = campaigns.filter((campaign) => {
    if (statusFilter === 'all') return true;
    return campaign.status === statusFilter;
  });

  // 상태별 통계
  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'active').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
    paused: campaigns.filter((c) => c.status === 'paused').length
  };

  // 일괄 선택 관련 함수들
  const handleSelectModeToggle = useCallback(() => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedCampaigns(new Set());
    }
  }, [isSelectMode]);

  const handleSelectAll = useCallback(() => {
    if (selectedCampaigns.size === filteredCampaigns.length) {
      setSelectedCampaigns(new Set());
    } else {
      setSelectedCampaigns(new Set(filteredCampaigns.map((c) => c.id)));
    }
  }, [selectedCampaigns.size, filteredCampaigns]);

  const handleSelectCampaign = useCallback((campaignId) => {
    setSelectedCampaigns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedCampaigns.size === 0) return;

    const selectedNames = Array.from(selectedCampaigns)
      .map((id) => campaigns.find((c) => c.id === id)?.name)
      .filter(Boolean);

    // 삭제 확인 다이얼로그
    const confirmMessage = `⚠️ 선택한 ${selectedCampaigns.size}개 캠페인을 삭제하면 데이터가 영구적으로 사라집니다.\n\n그래도 삭제하시겠습니까?\n\n삭제할 캠페인:\n${selectedNames.join('\n')}`;

    if (window.confirm(confirmMessage)) {
      try {
        // 선택된 캠페인들을 배열로 변환
        const campaignIds = Array.from(selectedCampaigns);

        // 각 캠페인을 순차적으로 삭제
        const deletePromises = campaignIds.map((id) => campaignsAPI.deleteCampaign(id));
        const results = await Promise.all(deletePromises);

        // 성공한 삭제 개수 확인
        const successCount = results.filter((r) => !r.error).length;
        const failCount = results.filter((r) => r.error).length;

        if (successCount > 0) {
          alert(`✅ ${successCount}개 캠페인이 삭제되었습니다.${failCount > 0 ? `\n❌ ${failCount}개 캠페인 삭제 실패` : ''}`);

          // 캠페인 목록 새로고침
          await loadCampaigns();

          // 선택 모드 해제
          setSelectedCampaigns(new Set());
          setIsSelectMode(false);
        } else {
          alert('❌ 캠페인 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('일괄 삭제 오류:', error);
        alert('❌ 캠페인 삭제 중 오류가 발생했습니다.');
      }
    }
  }, [selectedCampaigns, campaigns, loadCampaigns]);

  // 캠페인 복제 함수 (실제 데이터베이스 저장)
  const handleDuplicateCampaign = useCallback(async (campaign) => {
    try {
      // 복제할 캠페인 데이터 준비
      const duplicatedCampaignData = {
        siteId: campaign.siteId,
        name: `${campaign.name} (복사본)`,
        targetSite: campaign.targetSite,
        keywords: campaign.keywords,
        quantity: campaign.quantity,
        duration: campaign.duration,
        status: 'paused' // 복사본은 일시정지 상태로 시작
      };

      // API를 통해 실제 캠페인 생성
      const { data, error } = await campaignsAPI.createCampaign(duplicatedCampaignData);

      if (error) {
        throw new Error(error);
      }

      // 성공 시 전체 캠페인 목록 다시 로드 (데이터 동기화)
      await loadCampaigns();
      alert('캠페인이 성공적으로 복제되었습니다!');
      console.log('✅ 캠페인 복제 완료:', data);
    } catch (error) {
      console.error('❌ 캠페인 복제 실패:', error);
      alert(`캠페인 복제 중 오류가 발생했습니다: ${error.message}`);
    }
  }, []);

  // 캠페인 상태 변경 (useCallback으로 최적화)
  const handleStatusChange = useCallback(async (campaignId, newStatus) => {
    try {
      const { error } = await campaignsAPI.updateCampaignStatus(campaignId, newStatus);

      if (error) {
        throw new Error(error);
      }

      // 로컬 상태 업데이트
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId ? { ...campaign, status: newStatus, updatedAt: new Date().toISOString() } : campaign
        )
      );

      console.log('✅ 캠페인 상태 변경 완료:', { campaignId, newStatus });
    } catch (error) {
      console.error('❌ 캠페인 상태 변경 실패:', error);
      alert(`캠페인 상태 변경 중 오류가 발생했습니다: ${error.message}`);
    }
  }, []);

  // 캠페인 삭제 (useCallback으로 최적화)
  const handleDeleteCampaign = useCallback(
    async (campaignId) => {
      const campaign = campaigns.find((c) => c.id === campaignId);

      // 삭제 확인 다이얼로그 (경고 메시지 포함)
      const confirmMessage = `⚠️ "${campaign.name}" 캠페인을 삭제하면 데이터가 영구적으로 사라집니다.\n\n그래도 삭제하시겠습니까?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }

      try {
        const { error } = await campaignsAPI.deleteCampaign(campaignId);

        if (error) {
          throw new Error(error);
        }

        // 로컬 상태 업데이트 (삭제 성공 후)
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
        alert('✅ 캠페인이 삭제되었습니다.');
        console.log('✅ 캠페인 삭제 완료:', campaignId);
      } catch (error) {
        console.error('❌ 캠페인 삭제 실패:', error);
        alert(`❌ 캠페인 삭제 중 오류가 발생했습니다: ${error.message}`);
      }
    },
    [campaigns]
  );

  // 캠페인 편집 시작 (간소화)
  const handleEditStart = useCallback((campaignId) => {
    setEditingId(campaignId);
  }, []);

  // 캠페인 편집 저장 (카드에서 데이터를 받아서 저장)
  const handleEditSave = useCallback(async (campaignId, updatedData) => {
    try {
      const { error } = await campaignsAPI.updateCampaign(campaignId, updatedData);

      if (error) {
        throw new Error(error);
      }

      // 로컬 상태 업데이트
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId ? { ...campaign, ...updatedData, updatedAt: new Date().toISOString() } : campaign
        )
      );

      setEditingId(null);
      alert('캠페인이 수정되었습니다.');
      console.log('✅ 캠페인 수정 완료:', { campaignId, updatedData });
    } catch (error) {
      console.error('❌ 캠페인 수정 실패:', error);
      alert(`캠페인 수정 중 오류가 발생했습니다: ${error.message}`);
    }
  }, []);

  // 캠페인 편집 취소 (간소화)
  const handleEditCancel = useCallback(() => {
    setEditingId(null);
  }, []);

  // 진행률 계산
  const calculateProgress = (campaign) => {
    if (!campaign.quantity || campaign.quantity === 0) return 0;
    return Math.round((campaign.completedCount / campaign.quantity) * 100);
  };

  // 남은 일수 계산
  const calculateRemainingDays = (campaign) => {
    if (campaign.status === 'completed') return 0;

    // startedAt이 없거나 유효하지 않은 경우 처리
    if (!campaign.startedAt) {
      return campaign.duration || 0; // 시작 시간이 없으면 전체 기간 반환
    }

    const now = new Date();
    const startDate = new Date(campaign.startedAt);

    // 날짜가 유효하지 않은 경우 처리
    if (isNaN(startDate.getTime())) {
      return campaign.duration || 0;
    }

    const totalDays = campaign.duration || 0;
    const elapsedDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

    return Math.max(0, totalDays - elapsedDays);
  };

  // 상태별 스타일 설정
  const getStatusStyle = (status) => {
    const styles = {
      active: { bg: 'bg-blue-100', text: 'text-blue-800', badge: '🟢 활성' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', badge: '✅ 완료' },
      paused: { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: '⏸️ 중지' },
      stopped: { bg: 'bg-red-100', text: 'text-red-800', badge: '🔴 중단' }
    };
    return styles[status] || styles.paused;
  };

  // 프로그레스 바 컴포넌트
  const ProgressBar = ({ progress, status }) => {
    const getProgressColor = () => {
      if (status === 'completed') return 'bg-green-500';
      if (progress > 80) return 'bg-blue-500';
      if (progress > 50) return 'bg-yellow-500';
      return 'bg-gray-400';
    };

    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`} style={{ width: `${progress}%` }}></div>
      </div>
    );
  };

  // 캠페인 카드 컴포넌트
  // CampaignCard 컴포넌트 (편집 상태를 내부에서 관리)
  const CampaignCard = memo(
    ({
      campaign,
      isEditing,
      isSelectMode,
      isSelected,
      onSelect,
      onEditStart,
      onEditSave,
      onEditCancel,
      onStatusChange,
      onDelete,
      onDuplicate
    }) => {
      // 로컬 편집 상태 (각 카드별 독립적 관리)
      const [editFormData, setEditFormData] = useState({
        name: campaign.name,
        targetSite: campaign.targetSite,
        keywords: [...campaign.keywords],
        quantity: campaign.quantity,
        duration: campaign.duration,
        // 캠페인 옵션 추가
        enableInternalLinks: campaign.enableInternalLinks ?? true,
        enableImageGeneration: campaign.enableImageGeneration ?? true,
        imageCount: campaign.imageCount ?? 1
      });
      const [newKeyword, setNewKeyword] = useState('');

      // 편집 모드 시작 시 초기값 설정
      useEffect(() => {
        if (isEditing) {
          setEditFormData({
            name: campaign.name,
            targetSite: campaign.targetSite,
            keywords: [...campaign.keywords],
            quantity: campaign.quantity,
            duration: campaign.duration,
            // 캠페인 옵션 추가
            enableInternalLinks: campaign.enableInternalLinks ?? true,
            enableImageGeneration: campaign.enableImageGeneration ?? true,
            imageCount: campaign.imageCount ?? 1
          });
          setNewKeyword('');
        }
      }, [isEditing, campaign]);

      const siteInfo = getSiteInfo(campaign);
      const progress = calculateProgress(campaign);
      const remainingDays = calculateRemainingDays(campaign);
      const statusStyle = getStatusStyle(campaign.status);

      // 로컬 편집 함수들
      const handleLocalSave = () => {
        // 유효성 검사
        const remainingCount = editFormData.quantity - campaign.completedCount;
        const newProgress = Math.round((campaign.completedCount / editFormData.quantity) * 100);

        // 경고 조건 체크
        if (newProgress > 100) {
          if (
            !window.confirm(
              `⚠️ 경고: 완료된 콘텐츠 수(${campaign.completedCount}개)가 새로운 총 수량(${editFormData.quantity}개)보다 많습니다.\n\n` +
                `새로운 진행률: ${newProgress}%\n\n` +
                `정말로 저장하시겠습니까?`
            )
          ) {
            return;
          }
        }

        if (remainingCount < 0) {
          alert('❌ 오류: 남은 콘텐츠 수가 음수입니다. 수량을 늘려주세요.');
          return;
        }

        onEditSave(campaign.id, editFormData);
      };

      const handleAddKeyword = () => {
        const input = newKeyword.trim();
        if (!input) return;

        const newKeywords = input
          .split(',')
          .map((keyword) => keyword.trim())
          .filter((keyword) => keyword && !editFormData.keywords.includes(keyword));

        if (newKeywords.length > 0) {
          setEditFormData((prev) => ({
            ...prev,
            keywords: [...prev.keywords, ...newKeywords]
          }));
          setNewKeyword('');
        }
      };

      const handleRemoveKeyword = (index) => {
        setEditFormData((prev) => ({
          ...prev,
          keywords: prev.keywords.filter((_, i) => i !== index)
        }));
      };

      const handleEditKeyword = (index, newValue) => {
        setEditFormData((prev) => ({
          ...prev,
          keywords: prev.keywords.map((keyword, i) => (i === index ? newValue : keyword))
        }));
      };

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
                        onChange={() => onSelect(campaign.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">선택</span>
                    </label>
                  </div>
                )}
                {isEditing ? (
                  <input
                    key={`name-${campaign.id}`}
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="text-lg font-semibold text-gray-900 border-b border-blue-500 bg-transparent focus:outline-none w-full"
                    autoComplete="off"
                    spellCheck="false"
                    id={`campaign-name-${campaign.id}`}
                  />
                ) : (
                  <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                )}

                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    {statusStyle.badge}
                  </span>
                  <span className="text-sm text-gray-500">{siteInfo.name}</span>
                </div>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button onClick={handleLocalSave} className="text-green-600 hover:text-green-800 text-sm" title="저장">
                      ✅
                    </button>
                    <button onClick={onEditCancel} className="text-gray-600 hover:text-gray-800 text-sm" title="취소">
                      ❌
                    </button>
                  </>
                ) : !isSelectMode ? (
                  <>
                    <button onClick={() => onEditStart(campaign)} className="text-blue-600 hover:text-blue-800 text-sm" title="편집">
                      ✏️
                    </button>
                    {campaign.status === 'active' ? (
                      <button
                        onClick={() => onStatusChange(campaign.id, 'paused')}
                        className="text-yellow-600 hover:text-yellow-800 text-sm"
                        title="일시정지"
                      >
                        ⏸️
                      </button>
                    ) : campaign.status === 'paused' ? (
                      <button
                        onClick={() => onStatusChange(campaign.id, 'active')}
                        className="text-green-600 hover:text-green-800 text-sm"
                        title="재시작"
                      >
                        ▶️
                      </button>
                    ) : null}
                    <button onClick={() => onDuplicate(campaign)} className="text-blue-600 hover:text-blue-800 text-sm" title="복제">
                      📋
                    </button>
                    <button onClick={() => onDelete(campaign.id)} className="text-red-600 hover:text-red-800 text-sm" title="삭제">
                      🗑️
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* 카드 내용 */}
          <div className="p-4 space-y-4">
            {/* 진행률 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">진행률</span>
                <span className="text-sm font-bold text-gray-900">{progress}%</span>
              </div>
              <ProgressBar progress={progress} status={campaign.status} />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{campaign.completedCount}개 완료</span>
                <span>총 {campaign.quantity}개</span>
              </div>
            </div>

            {/* 타겟 사이트 */}
            <div>
              <span className="text-sm font-medium text-gray-700">타겟 사이트: </span>
              {isEditing ? (
                <input
                  key={`target-${campaign.id}`}
                  type="text"
                  value={editFormData.targetSite}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, targetSite: e.target.value }))}
                  className="text-sm text-gray-600 border-b border-blue-500 bg-transparent focus:outline-none"
                  autoComplete="off"
                  spellCheck="false"
                  id={`target-site-${campaign.id}`}
                />
              ) : (
                <span className="text-sm text-gray-600">{campaign.targetSite}</span>
              )}
            </div>

            {/* 수량 및 기간 (편집 모드에서만 표시) */}
            {isEditing && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {/* 콘텐츠 수량 */}
                  <div>
                    <span className="text-sm font-medium text-gray-700">콘텐츠 수량: </span>
                    <input
                      key={`quantity-${campaign.id}`}
                      type="number"
                      min="1"
                      value={editFormData.quantity}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="text-sm text-gray-600 border-b border-blue-500 bg-transparent focus:outline-none w-20"
                      autoComplete="off"
                      id={`quantity-${campaign.id}`}
                    />
                    <span className="text-sm text-gray-500 ml-1">개</span>
                  </div>

                  {/* 캠페인 기간 */}
                  <div>
                    <span className="text-sm font-medium text-gray-700">캠페인 기간: </span>
                    <input
                      key={`duration-${campaign.id}`}
                      type="number"
                      min="1"
                      value={editFormData.duration}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                      className="text-sm text-gray-600 border-b border-blue-500 bg-transparent focus:outline-none w-20"
                      autoComplete="off"
                      id={`duration-${campaign.id}`}
                    />
                    <span className="text-sm text-gray-500 ml-1">일</span>
                  </div>
                </div>

                {/* 수정 예상 결과 미리보기 */}
                {(() => {
                  const remainingCount = editFormData.quantity - campaign.completedCount;
                  const newDailyTarget = Math.ceil(remainingCount / editFormData.duration);
                  const newProgress = Math.round((campaign.completedCount / editFormData.quantity) * 100);

                  // 변경사항 체크
                  const quantityChanged = editFormData.quantity !== campaign.quantity;
                  const durationChanged = editFormData.duration !== campaign.duration;

                  if (quantityChanged || durationChanged) {
                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="text-sm font-medium text-blue-800 mb-2">📊 수정 예상 결과</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">새로운 진행률:</span>
                            <span className={`font-medium ${newProgress > 100 ? 'text-red-600' : 'text-blue-600'}`}>{newProgress}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">남은 콘텐츠:</span>
                            <span className={`font-medium ${remainingCount < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {remainingCount}개
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">새로운 일일 목표:</span>
                            <span className="font-medium text-blue-600">{newDailyTarget}개</span>
                          </div>

                          {/* 경고 메시지 */}
                          {newProgress > 100 && (
                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                              ⚠️ 완료된 콘텐츠 수가 새로운 총 수량보다 많습니다.
                            </div>
                          )}
                          {remainingCount < 0 && (
                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                              ⚠️ 남은 콘텐츠 수가 음수입니다. 수량을 늘려주세요.
                            </div>
                          )}
                          {newDailyTarget > 10 && (
                            <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded mt-2">
                              ⚠️ 일일 목표가 높습니다. 기간을 늘리거나 수량을 줄이세요.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {/* 키워드 */}
            <div>
              <span className="text-sm font-medium text-gray-700">키워드: </span>
              {isEditing ? (
                <div className="mt-2 space-y-3">
                  {/* 키워드 추가 입력 */}
                  <div className="flex gap-2">
                    <input
                      key={`new-keyword-${campaign.id}`}
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="새 키워드 추가 (쉼표로 구분하여 여러개 추가 가능)"
                      autoComplete="off"
                      spellCheck="false"
                      id={`new-keyword-${campaign.id}`}
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      disabled={!newKeyword.trim()}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      추가
                    </button>
                  </div>

                  {/* 키워드 리스트 */}
                  {editFormData.keywords && editFormData.keywords.length > 0 && (
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
                      <div className="space-y-1">
                        {editFormData.keywords.map((keyword, index) => (
                          <div
                            key={`keyword-${campaign.id}-${index}`}
                            className="flex items-center gap-2 p-1 bg-white rounded border border-gray-100"
                          >
                            <span className="text-xs text-gray-500 font-mono w-6 text-right">{index + 1}.</span>
                            <input
                              key={`input-${campaign.id}-${index}`}
                              type="text"
                              value={keyword}
                              onChange={(e) => handleEditKeyword(index, e.target.value)}
                              className="flex-1 px-1 py-0.5 text-sm border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-blue-50 rounded"
                              autoComplete="off"
                              spellCheck="false"
                              id={`keyword-input-${campaign.id}-${index}`}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword(index)}
                              className="text-red-500 hover:text-red-700 text-xs px-1"
                              title="삭제"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>총 {editFormData.keywords ? editFormData.keywords.length : 0}개 키워드</p>
                    <p>💡 팁: 쉼표(,)로 구분하여 여러 키워드를 한 번에 추가할 수 있습니다.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {campaign.keywords.slice(0, 10).map((keyword, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-800">
                      {keyword}
                    </span>
                  ))}
                  {campaign.keywords.length > 10 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800 font-medium">
                      외 +{campaign.keywords.length - 10}개
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 캠페인 옵션 (편집 모드에서만 표시) */}
            {isEditing && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700">⚙️ 캠페인 옵션</h4>

                {/* 내부 링크 옵션 */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">🔗 내부 링크 생성</label>
                    <p className="text-xs text-gray-500">PBN 데이터베이스에서 유사한 포스트를 검색하여 내부 링크를 자동으로 삽입합니다.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.enableInternalLinks}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          enableInternalLinks: e.target.checked
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* 이미지 생성 옵션 */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">🖼️ 이미지 생성</label>
                    <p className="text-xs text-gray-500">
                      키워드 기반으로 전문적인 다이어그램/인포그래픽을 자동 생성하여 콘텐츠에 삽입합니다.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.enableImageGeneration}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          enableImageGeneration: e.target.checked
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* 이미지 수량 설정 */}
                {editFormData.enableImageGeneration && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">이미지 수량 설정</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={editFormData.imageCount}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            imageCount: parseInt(e.target.value)
                          }))
                        }
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">수량:</span>
                        <span className="font-semibold text-blue-600">{editFormData.imageCount}개</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">* 메인 이미지 1개 + 섹션별 이미지 {editFormData.imageCount - 1}개가 생성됩니다.</p>
                  </div>
                )}
              </div>
            )}

            {/* 통계 정보 */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{campaign.dailyTarget}</div>
                <div className="text-xs text-gray-500">일일 목표</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{campaign.status === 'completed' ? '완료' : `${remainingDays}일`}</div>
                <div className="text-xs text-gray-500">{campaign.status === 'completed' ? '상태' : '남은 기간'}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  );

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 캠페인 관리</h1>
          <p className="text-gray-600 mt-1">백링크 캠페인들을 관리하고 모니터링하세요.</p>
        </div>
        <div className="flex items-center gap-3">
          {isSelectMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedCampaigns.size}개 선택됨</span>
              <TailwindButton variant="secondary" onClick={handleSelectAll} className="text-sm">
                {selectedCampaigns.size === filteredCampaigns.length ? '전체 해제' : '전체 선택'}
              </TailwindButton>
              <TailwindButton variant="danger" onClick={handleBulkDelete} disabled={selectedCampaigns.size === 0} className="text-sm">
                🗑️ 선택 삭제
              </TailwindButton>
            </div>
          )}
          <TailwindButton variant={isSelectMode ? 'secondary' : 'outline'} onClick={handleSelectModeToggle}>
            {isSelectMode ? '선택 취소' : '📋 일괄 선택'}
          </TailwindButton>
          <TailwindButton variant="primary" onClick={() => router.push('/campaigns/create')}>
            ➕ 새 캠페인 생성
          </TailwindButton>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">전체 캠페인</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          <div className="text-sm text-gray-600">활성 캠페인</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">완료 캠페인</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
          <div className="text-sm text-gray-600">일시정지</div>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'all', label: '전체', count: stats.total },
          { key: 'active', label: '활성', count: stats.active },
          { key: 'completed', label: '완료', count: stats.completed },
          { key: 'paused', label: '일시정지', count: stats.paused }
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

      {/* 캠페인 목록 */}
      {isLoading ? (
        <MainCard>
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">캠페인 목록을 불러오는 중...</h3>
            <p className="text-gray-500">잠시만 기다려주세요.</p>
          </div>
        </MainCard>
      ) : filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              isEditing={editingId === campaign.id}
              isSelectMode={isSelectMode}
              isSelected={selectedCampaigns.has(campaign.id)}
              onSelect={handleSelectCampaign}
              onEditStart={() => handleEditStart(campaign.id)}
              onEditSave={handleEditSave}
              onEditCancel={handleEditCancel}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteCampaign}
              onDuplicate={handleDuplicateCampaign}
            />
          ))}
        </div>
      ) : (
        <MainCard>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {statusFilter === 'all' ? '캠페인이 없습니다' : `${statusFilter} 상태의 캠페인이 없습니다`}
            </h3>
            <p className="text-gray-500 mb-6">새로운 백링크 캠페인을 생성해보세요.</p>
            <TailwindButton variant="primary" onClick={() => router.push('/campaigns/create')}>
              첫 번째 캠페인 만들기
            </TailwindButton>
          </div>
        </MainCard>
      )}
    </div>
  );
}
