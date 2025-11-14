'use client';

/**
 * 📋 Campaign List Page (EN Version)
 * 캠페인 관리 로직은 동일하게 유지하되 UI 텍스트만 영어로 구성
 */

import { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import { campaignsAPI } from '@/lib/api/campaigns';

export default function CampaignListPageEn() {
  const router = useRouter();

  // 캠페인 목록 상태
  const [campaigns, setCampaigns] = useState([]);

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, completed, paused

  // 편집 상태
  const [editingId, setEditingId] = useState(null);

  // 일괄 선택 상태
  const [selectedCampaigns, setSelectedCampaigns] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await campaignsAPI.getCampaignsWithSites();

      if (error) {
        console.error('Failed to load campaigns:', error);
        alert('Unable to load campaign list.');
        return;
      }

      const mappedCampaigns = (data || []).map((campaign) => ({
        ...campaign,
        siteId: campaign.site_id,
        targetSite: campaign.target_site,
        completedCount: campaign.completed_count,
        dailyTarget: campaign.daily_target,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at,
        startedAt: campaign.started_at,
        siteInfo: campaign.sites
      }));

      setCampaigns(mappedCampaigns);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      alert('Unable to load campaign list.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSiteInfo = (campaign) => {
    return campaign.siteInfo || { name: 'Unknown site', url: '' };
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (statusFilter === 'all') return true;
    return campaign.status === statusFilter;
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'active').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
    paused: campaigns.filter((c) => c.status === 'paused').length
  };

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

    const confirmMessage =
      `⚠️ Deleting ${selectedCampaigns.size} campaign(s) will permanently remove all data.\n\n` +
      `Are you sure you want to delete?\n\n` +
      `Campaigns to delete:\n${selectedNames.join('\n')}`;

    if (window.confirm(confirmMessage)) {
      try {
        const campaignIds = Array.from(selectedCampaigns);
        const deletePromises = campaignIds.map((id) => campaignsAPI.deleteCampaign(id));
        const results = await Promise.all(deletePromises);

        const successCount = results.filter((r) => !r.error).length;
        const failCount = results.filter((r) => r.error).length;

        if (successCount > 0) {
          alert(`✅ Deleted ${successCount} campaign(s).${failCount > 0 ? `\n❌ Failed to delete ${failCount} campaign(s).` : ''}`);

          await loadCampaigns();

          setSelectedCampaigns(new Set());
          setIsSelectMode(false);
        } else {
          alert('❌ Failed to delete campaigns.');
        }
      } catch (error) {
        console.error('Bulk delete error:', error);
        alert('❌ An error occurred while deleting campaigns.');
      }
    }
  }, [selectedCampaigns, campaigns]);

  const handleDuplicateCampaign = useCallback(
    async (campaign) => {
      try {
        const duplicatedCampaignData = {
          siteId: campaign.siteId,
          name: `${campaign.name} (Copy)`,
          targetSite: campaign.targetSite,
          keywords: campaign.keywords,
          quantity: campaign.quantity,
          duration: campaign.duration,
          status: 'paused'
        };

        const { error } = await campaignsAPI.createCampaign(duplicatedCampaignData);

        if (error) {
          throw new Error(error);
        }

        await loadCampaigns();
        alert('Campaign duplicated successfully.');
      } catch (error) {
        console.error('Duplicate campaign failed:', error);
        alert(`Failed to duplicate campaign: ${error.message}`);
      }
    },
    [loadCampaigns]
  );

  const handleStatusChange = useCallback(async (campaignId, newStatus) => {
    try {
      const { error } = await campaignsAPI.updateCampaignStatus(campaignId, newStatus);

      if (error) {
        throw new Error(error);
      }

      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId ? { ...campaign, status: newStatus, updatedAt: new Date().toISOString() } : campaign
        )
      );
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(`Failed to change campaign status: ${error.message}`);
    }
  }, []);

  const handleDeleteCampaign = useCallback(
    async (campaignId) => {
      const campaign = campaigns.find((c) => c.id === campaignId);
      const confirmMessage = `⚠️ Deleting "${campaign.name}" will permanently remove all data.\n\nDo you want to continue?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }

      try {
        const { error } = await campaignsAPI.deleteCampaign(campaignId);

        if (error) {
          throw new Error(error);
        }

        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
        alert('✅ Campaign deleted.');
      } catch (error) {
        console.error('Failed to delete campaign:', error);
        alert(`❌ Failed to delete campaign: ${error.message}`);
      }
    },
    [campaigns]
  );

  const handleEditStart = useCallback((campaignId) => {
    setEditingId(campaignId);
  }, []);

  const handleEditSave = useCallback(async (campaignId, updatedData) => {
    try {
      const { error } = await campaignsAPI.updateCampaign(campaignId, updatedData);

      if (error) {
        throw new Error(error);
      }

      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId ? { ...campaign, ...updatedData, updatedAt: new Date().toISOString() } : campaign
        )
      );

      setEditingId(null);
      alert('Campaign updated.');
    } catch (error) {
      console.error('Failed to update campaign:', error);
      alert(`Failed to update campaign: ${error.message}`);
    }
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
  }, []);

  const calculateProgress = (campaign) => {
    if (!campaign.quantity || campaign.quantity === 0) return 0;
    return Math.round((campaign.completedCount / campaign.quantity) * 100);
  };

  const calculateRemainingDays = (campaign) => {
    if (campaign.status === 'completed') return 0;
    if (!campaign.startedAt) {
      return campaign.duration || 0;
    }

    const now = new Date();
    const startDate = new Date(campaign.startedAt);

    if (isNaN(startDate.getTime())) {
      return campaign.duration || 0;
    }

    const totalDays = campaign.duration || 0;
    const elapsedDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

    return Math.max(0, totalDays - elapsedDays);
  };

  const getStatusStyle = (status) => {
    const styles = {
      active: { bg: 'bg-blue-100', text: 'text-blue-800', badge: '🟢 Active' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', badge: '✅ Completed' },
      paused: { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: '⏸️ Paused' },
      stopped: { bg: 'bg-red-100', text: 'text-red-800', badge: '🔴 Stopped' }
    };
    return styles[status] || styles.paused;
  };

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
      const [editFormData, setEditFormData] = useState({
        name: campaign.name,
        targetSite: campaign.targetSite,
        keywords: [...campaign.keywords],
        quantity: campaign.quantity,
        duration: campaign.duration,
        enableInternalLinks: campaign.enableInternalLinks ?? true,
        enableImageGeneration: campaign.enableImageGeneration ?? true,
        imageCount: campaign.imageCount ?? 1
      });
      const [newKeyword, setNewKeyword] = useState('');

      useEffect(() => {
        if (isEditing) {
          setEditFormData({
            name: campaign.name,
            targetSite: campaign.targetSite,
            keywords: [...campaign.keywords],
            quantity: campaign.quantity,
            duration: campaign.duration,
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

      const handleLocalSave = () => {
        const remainingCount = editFormData.quantity - campaign.completedCount;
        const newProgress = Math.round((campaign.completedCount / editFormData.quantity) * 100);

        if (newProgress > 100) {
          if (
            !window.confirm(
              `⚠️ Warning: completed posts (${campaign.completedCount}) exceed the new total quantity (${editFormData.quantity}).\n\n` +
                `New progress: ${newProgress}%\n\n` +
                `Do you still want to save?`
            )
          ) {
            return;
          }
        }

        if (remainingCount < 0) {
          alert('❌ Remaining content cannot be negative. Increase the total quantity.');
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
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {isSelectMode && (
                  <div className="mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelect(campaign.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Select</span>
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

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button onClick={handleLocalSave} className="text-green-600 hover:text-green-800 text-sm" title="Save">
                      ✅
                    </button>
                    <button onClick={onEditCancel} className="text-gray-600 hover:text-gray-800 text-sm" title="Cancel">
                      ❌
                    </button>
                  </>
                ) : !isSelectMode ? (
                  <>
                    <button onClick={() => onEditStart(campaign)} className="text-blue-600 hover:text-blue-800 text-sm" title="Edit">
                      ✏️
                    </button>
                    {campaign.status === 'active' ? (
                      <button
                        onClick={() => onStatusChange(campaign.id, 'paused')}
                        className="text-yellow-600 hover:text-yellow-800 text-sm"
                        title="Pause"
                      >
                        ⏸️
                      </button>
                    ) : campaign.status === 'paused' ? (
                      <button
                        onClick={() => onStatusChange(campaign.id, 'active')}
                        className="text-green-600 hover:text-green-800 text-sm"
                        title="Resume"
                      >
                        ▶️
                      </button>
                    ) : null}
                    <button onClick={() => onDuplicate(campaign)} className="text-blue-600 hover:text-blue-800 text-sm" title="Duplicate">
                      📋
                    </button>
                    <button onClick={() => onDelete(campaign.id)} className="text-red-600 hover:text-red-800 text-sm" title="Delete">
                      🗑️
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm font-bold text-gray-900">{progress}%</span>
              </div>
              <ProgressBar progress={progress} status={campaign.status} />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{campaign.completedCount} completed</span>
                <span>Total {campaign.quantity}</span>
              </div>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-700">Target site: </span>
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

            {isEditing && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Quantity: </span>
                    <input
                      key={`quantity-${campaign.id}`}
                      type="number"
                      min="1"
                      value={editFormData.quantity}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value, 10) || 1 }))}
                      className="text-sm text-gray-600 border-b border-blue-500 bg-transparent focus:outline-none w-20"
                      autoComplete="off"
                      id={`quantity-${campaign.id}`}
                    />
                    <span className="text-sm text-gray-500 ml-1">posts</span>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-700">Duration: </span>
                    <input
                      key={`duration-${campaign.id}`}
                      type="number"
                      min="1"
                      value={editFormData.duration}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, duration: parseInt(e.target.value, 10) || 1 }))}
                      className="text-sm text-gray-600 border-b border-blue-500 bg-transparent focus:outline-none w-20"
                      autoComplete="off"
                      id={`duration-${campaign.id}`}
                    />
                    <span className="text-sm text-gray-500 ml-1">days</span>
                  </div>
                </div>

                {(() => {
                  const remainingCount = editFormData.quantity - campaign.completedCount;
                  const newDailyTarget = Math.ceil(remainingCount / editFormData.duration);
                  const newProgress = Math.round((campaign.completedCount / editFormData.quantity) * 100);

                  const quantityChanged = editFormData.quantity !== campaign.quantity;
                  const durationChanged = editFormData.duration !== campaign.duration;

                  if (quantityChanged || durationChanged) {
                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="text-sm font-medium text-blue-800 mb-2">📊 Estimated changes</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">New progress:</span>
                            <span className={`font-medium ${newProgress > 100 ? 'text-red-600' : 'text-blue-600'}`}>{newProgress}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Remaining content:</span>
                            <span className={`font-medium ${remainingCount < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {remainingCount} posts
                            </span>
                          </div>
                          <div className="flex justify_between">
                            <span className="text-gray-600">New daily target:</span>
                            <span className="font-medium text-blue-600">{newDailyTarget} posts</span>
                          </div>

                          {newProgress > 100 && (
                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                              ⚠️ Completed posts exceed the new total quantity.
                            </div>
                          )}
                          {remainingCount < 0 && (
                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                              ⚠️ Remaining content is negative. Increase the quantity.
                            </div>
                          )}
                          {newDailyTarget > 10 && (
                            <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded mt-2">
                              ⚠️ Daily target is quite high. Consider increasing duration or reducing quantity.
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

            <div>
              <span className="text-sm font-medium text-gray-700">Keywords: </span>
              {isEditing ? (
                <div className="mt-2 space-y-3">
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
                      placeholder="Add keywords (comma separated)"
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
                      Add
                    </button>
                  </div>

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
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Total {editFormData.keywords ? editFormData.keywords.length : 0} keywords</p>
                    <p>Tip: separate with commas to add multiple keywords at once.</p>
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
                      +{campaign.keywords.length - 10} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {isEditing && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700">⚙️ Campaign options</h4>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">🔗 Generate internal links</label>
                    <p className="text-xs text-gray-500">Automatically inserts internal links between related posts.</p>
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
                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">🖼️ Generate images</label>
                    <p className="text-xs text-gray-500">Creates professional diagrams and graphics automatically.</p>
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
                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </label>
                </div>

                {editFormData.enableImageGeneration && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Image count</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={editFormData.imageCount}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            imageCount: parseInt(e.target.value, 10)
                          }))
                        }
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Count:</span>
                        <span className="font-semibold text-blue-600">{editFormData.imageCount}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Includes 1 main image + {editFormData.imageCount - 1} section images.</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{campaign.dailyTarget}</div>
                <div className="text-xs text-gray-500">Daily target</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {campaign.status === 'completed' ? 'Completed' : `${remainingDays} days`}
                </div>
                <div className="text-xs text-gray-500">{campaign.status === 'completed' ? 'Status' : 'Remaining period'}</div>
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
          <h1 className="text-2xl font-bold text-gray-900">📋 Campaign Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage your backlink campaigns.</p>
        </div>
        <div className="flex items-center gap-3">
          {isSelectMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedCampaigns.size} selected</span>
              <TailwindButton variant="secondary" onClick={handleSelectAll} className="text-sm">
                {selectedCampaigns.size === filteredCampaigns.length ? 'Deselect all' : 'Select all'}
              </TailwindButton>
              <TailwindButton variant="danger" onClick={handleBulkDelete} disabled={selectedCampaigns.size === 0} className="text-sm">
                🗑️ Delete selected
              </TailwindButton>
            </div>
          )}
          <TailwindButton variant={isSelectMode ? 'secondary' : 'outline'} onClick={handleSelectModeToggle}>
            {isSelectMode ? 'Cancel selection' : '📋 Bulk select'}
          </TailwindButton>
          <TailwindButton variant="primary" onClick={() => router.push('/en/campaigns/create')}>
            ➕ Create campaign
          </TailwindButton>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow_sm border">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total campaigns</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow_sm border">
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow_sm border">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow_sm border">
          <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
          <div className="text-sm text-gray-600">Paused</div>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'all', label: 'All', count: stats.total },
          { key: 'active', label: 'Active', count: stats.active },
          { key: 'completed', label: 'Completed', count: stats.completed },
          { key: 'paused', label: 'Paused', count: stats.paused }
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
            <h3 className="text-lg font_medium text-gray-900 mb-2">Loading campaigns…</h3>
            <p className="text-gray-500">Please wait a moment.</p>
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
              {statusFilter === 'all' ? 'No campaigns yet' : `No campaigns in ${statusFilter} state`}
            </h3>
            <p className="text-gray-500 mb-6">Create your first backlink campaign.</p>
            <TailwindButton variant="primary" onClick={() => router.push('/en/campaigns/create')}>
              Create campaign
            </TailwindButton>
          </div>
        </MainCard>
      )}
    </div>
  );
}
