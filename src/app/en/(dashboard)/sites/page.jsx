'use client';

/**
 * 🌐 Site List Page (EN Version)
 * 등록된 워드프레스 사이트 관리 로직은 동일하게 유지하되 UI 텍스트를 영어로 구성
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import { sitesAPI } from '@/lib/api/sites';
import { campaignsAPI } from '@/lib/api/campaigns';

export default function SiteListPageEn() {
  const router = useRouter();

  // 사이트 목록 상태
  const [sites, setSites] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignStats, setCampaignStats] = useState({});

  // 필터 및 표시 상태
  const [statusFilter, setStatusFilter] = useState('all'); // all, connected, disconnected
  const [viewMode, setViewMode] = useState('cards'); // cards, table

  // 편집 상태
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

  useEffect(() => {
    loadSites();
    setCampaigns([]);
  }, []);

  const loadSites = async () => {
    try {
      const { data, error } = await sitesAPI.getSites();
      if (error) {
        console.error('Failed to load sites:', error);
        alert('Error loading site list.');
      } else {
        const mappedSites = (data || []).map((site) => ({
          ...site,
          lastCheck: site.last_check,
          appPassword: site.app_password
        }));
        setSites(mappedSites);

        // Supabase campaign stats per site
        const statsPromises = mappedSites.map(async (site) => {
          const { data: stats } = await getSiteCampaignStats(site.id);
          return {
            siteId: site.id,
            stats: stats || { total: 0, active: 0, completed: 0, completedContent: 0 }
          };
        });

        const statsResults = await Promise.all(statsPromises);
        const statsMap = {};
        statsResults.forEach(({ siteId, stats }) => {
          statsMap[siteId] = stats || { total: 0, active: 0, completed: 0, completedContent: 0 };
        });
        setCampaignStats(statsMap);
      }
    } catch (error) {
      console.error('Failed to load sites:', error);
      alert('Error loading site list.');
    }
  };

  const getSiteCampaignStats = async (siteId) => {
    try {
      const { data, error } = await campaignsAPI.getSiteCampaignStats(siteId);
      if (error) {
        console.error('Failed to fetch campaign stats:', error);
        return { total: 0, active: 0, completed: 0, completedContent: 0 };
      }
      return data;
    } catch (error) {
      console.error('Failed to fetch campaign stats:', error);
      return { total: 0, active: 0, completed: 0, completedContent: 0 };
    }
  };

  const filteredSites = sites.filter((site) => {
    if (statusFilter === 'all') return true;
    return site.status === statusFilter;
  });

  const stats = {
    total: sites.length,
    connected: sites.filter((s) => s.status === 'connected').length,
    disconnected: sites.filter((s) => s.status === 'disconnected').length,
    error: sites.filter((s) => s.status === 'error').length
  };

  const handleConnectionTest = async (siteId) => {
    setTestingSites((prev) => new Set(prev).add(siteId));

    try {
      const { error } = await sitesAPI.refreshConnection(siteId);
      if (error) {
        alert(`Connection test failed: ${error}`);
        return;
      }
      await loadSites();

      const site = sites.find((s) => s.id === siteId);
      if (site) {
        alert(`✅ Connection test finished for ${site.name}.\n\nStatus: ${site.status === 'connected' ? 'Connected' : 'Disconnected'}`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      alert('An error occurred during connection test.');
    } finally {
      setTestingSites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(siteId);
        return newSet;
      });
    }
  };

  const handleBulkConnectionTest = async () => {
    if (sites.length === 0) {
      alert('No sites registered yet.');
      return;
    }

    setBulkTestLoading(true);
    setTestProgress({ current: 0, total: sites.length });
    setCurrentTestingSite(null);

    const abortController = new AbortController();
    setTestAbortController(abortController);

    try {
      for (let i = 0; i < sites.length; i++) {
        if (abortController.signal.aborted) {
          console.log('Bulk connection test aborted.');
          break;
        }

        const site = sites[i];
        setCurrentTestingSite(site.name);
        setTestProgress({ current: i + 1, total: sites.length });

        try {
          await sitesAPI.refreshConnection(site.id);
        } catch (error) {
          console.error('Connection test error:', error);
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!abortController.signal.aborted) {
        await loadSites();
        alert('✅ Completed connection test for all sites. Please review the page for details.');
      }
    } catch (error) {
      console.error('Bulk connection test error:', error);
      alert('Error occurred during bulk connection test.');
    } finally {
      setBulkTestLoading(false);
      setCurrentTestingSite(null);
      setTestProgress({ current: 0, total: 0 });
      setTestAbortController(null);
    }
  };

  const handleTestAbort = () => {
    if (testAbortController) {
      testAbortController.abort();
      setBulkTestLoading(false);
      setCurrentTestingSite(null);
      setTestProgress({ current: 0, total: 0 });
      setTestAbortController(null);
      alert('Connection test aborted.');
    }
  };

  const handleSelectedSitesConnectionTest = async () => {
    if (selectedSites.size === 0) {
      alert('Select sites to test.');
      return;
    }

    setBulkTestLoading(true);
    setTestProgress({ current: 0, total: selectedSites.size });
    setCurrentTestingSite(null);

    const abortController = new AbortController();
    setTestAbortController(abortController);

    try {
      const selectedSitesArray = Array.from(selectedSites);

      for (let i = 0; i < selectedSitesArray.length; i++) {
        if (abortController.signal.aborted) {
          console.log('Selected site test aborted.');
          break;
        }

        const siteId = selectedSitesArray[i];
        const site = sites.find((s) => s.id === siteId);

        if (site) {
          setCurrentTestingSite(site.name);
          setTestProgress({ current: i + 1, total: selectedSitesArray.length });

          try {
            await sitesAPI.refreshConnection(siteId);
          } catch (error) {
            console.error('Connection test error:', error);
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (!abortController.signal.aborted) {
        await loadSites();
        alert('✅ Finished connection test for selected sites. Please review the page for details.');
      }
    } catch (error) {
      console.error('Selected site connection test error:', error);
      alert('Error occurred while testing selected sites.');
    } finally {
      setBulkTestLoading(false);
      setCurrentTestingSite(null);
      setTestProgress({ current: 0, total: 0 });
      setTestAbortController(null);
    }
  };

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

    if (window.confirm(`Delete ${selectedSites.size} selected site(s)?\n\n${selectedNames.join(', ')}`)) {
      setSites((prev) => prev.filter((s) => !selectedSites.has(s.id)));
      setSelectedSites(new Set());
      setIsSelectMode(false);
      alert(`${selectedSites.size} site(s) deleted.`);
    }
  };

  const handleDeleteSite = async (siteId) => {
    const site = sites.find((s) => s.id === siteId);
    const siteCampaigns = campaigns.filter((c) => c.siteId === siteId);

    if (siteCampaigns.length > 0) {
      if (!window.confirm(`"${site.name}" has ${siteCampaigns.length} campaign(s). Delete anyway?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Delete site "${site.name}"?`)) {
        return;
      }
    }

    try {
      const { error } = await sitesAPI.deleteSite(siteId);
      if (error) {
        alert(`Failed to delete site: ${error}`);
        return;
      }
      alert('Site deleted.');
      await loadSites();
    } catch (error) {
      console.error('Failed to delete site:', error);
      alert('An error occurred while deleting the site.');
    }
  };

  const handleEditStart = (site) => {
    setEditingId(site.id);
  };

  const handleEditSave = async (siteId, updatedData) => {
    try {
      const dbData = {
        name: updatedData.name,
        url: updatedData.url,
        username: updatedData.username,
        password: updatedData.password,
        app_password: updatedData.appPassword ? updatedData.appPassword.replace(/\s/g, '') : updatedData.appPassword
      };

      const { error } = await sitesAPI.updateSite(siteId, dbData);

      if (error) {
        alert(`Failed to update site: ${error}`);
        return;
      }

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
    } catch (error) {
      console.error('Failed to update site:', error);
      alert('Error occurred while updating the site.');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  const getStatusStyle = (status) => {
    const styles = {
      connected: { bg: 'bg-green-100', text: 'text-green-800', badge: '🟢 Connected', dot: 'bg-green-500' },
      disconnected: { bg: 'bg-red-100', text: 'text-red-800', badge: '🔴 Disconnected', dot: 'bg-red-500' },
      error: { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: '⚠️ Error', dot: 'bg-yellow-500' }
    };
    return styles[status] || styles.error;
  };

  const ConnectionStatus = ({ status, lastCheck, showDetail = true, siteId = null }) => {
    const statusStyle = getStatusStyle(status);
    const lastCheckDate = lastCheck ? new Date(lastCheck).toLocaleString('en-US', { hour12: false }) : 'Not checked';
    const isTesting = siteId && testingSites.has(siteId);

    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isTesting ? 'bg-yellow-500 animate-pulse' : statusStyle.dot}`}></div>
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isTesting ? 'bg-yellow-100 text-yellow-800' : `${statusStyle.bg} ${statusStyle.text}`
          }`}
        >
          {isTesting ? '⏳ Checking…' : statusStyle.badge}
        </span>
        {showDetail && <span className="text-xs text-gray-500">Last tested: {lastCheckDate}</span>}
      </div>
    );
  };

  const SiteCard = ({ site, isSelectMode, isSelected, onSelect }) => {
    const siteCampaignStats = campaignStats[site.id] || { total: 0, active: 0, completed: 0 };
    const isEditing = editingId === site.id;

    const [local, setLocal] = useState({
      name: site.name,
      url: site.url,
      username: site.username,
      password: site.password,
      appPassword: site.appPassword
    });

    useEffect(() => {
      if (isEditing) {
        setLocal({
          name: site.name,
          url: site.url,
          username: site.username,
          password: site.password,
          appPassword: site.appPassword
        });
      }
    }, [isEditing, site]);

    const handleSave = () => handleEditSave(site.id, local);

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
                      onChange={() => onSelect(site.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Select</span>
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

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button onClick={handleSave} className="text-green-600 hover:text-green-800 text-sm" title="Save">
                    ✅
                  </button>
                  <button onClick={handleEditCancel} className="text-gray-600 hover:text-gray-800 text-sm" title="Cancel">
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
                    title={testingSites.has(site.id) ? 'Testing...' : 'Test connection'}
                  >
                    {testingSites.has(site.id) ? '⏳' : '🔍'}
                  </button>
                  <button onClick={() => handleEditStart(site)} className="text-indigo-600 hover:text-indigo-800 text-sm" title="Edit">
                    ✏️
                  </button>
                  <button onClick={() => handleDeleteSite(site.id)} className="text-red-600 hover:text-red-800 text-sm" title="Delete">
                    🗑️
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-700">Last test: </span>
            <span className="text-sm text-gray-600">
              {site.lastCheck ? new Date(site.lastCheck).toLocaleString('en-US', { hour12: false }) : 'Not checked'}
            </span>
          </div>

          <div className="space-y-2 mt-3">
            <div>
              <span className="text-sm font-medium text-gray-700">Username: </span>
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
                <span className="text-sm text-gray-600">{site.username || 'Not set'}</span>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Password: </span>
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
                <span className="text-sm text-gray-600">{site.password || 'Not set'}</span>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">App password: </span>
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
                <span className="text-sm text-gray-600">{site.appPassword || 'Not set'}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{siteCampaignStats.total}</div>
              <div className="text-xs text-gray-500">Total campaigns</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{siteCampaignStats.active}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{siteCampaignStats.completed}</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SiteTableRow = ({ site, isSelectMode, isSelected, onSelect }) => {
    const siteCampaignStats = campaignStats[site.id] || { total: 0, active: 0, completed: 0 };
    const isEditing = editingId === site.id;

    const [local, setLocal] = useState({ name: site.name, url: site.url, username: site.username });

    useEffect(() => {
      if (isEditing) setLocal({ name: site.name, url: site.url, username: site.username });
    }, [isEditing, site]);

    const handleSave = () => handleEditSave(site.id, local);

    return (
      <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
        <td className="px-6 py-4 whitespace-nowrap">
          {isSelectMode && (
            <div className="mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect(site.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Select</span>
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
            <div>Username: {site.username || 'Not set'}</div>
            <div>Password: {site.password || 'Not set'}</div>
            <div>App password: {site.appPassword || 'Not set'}</div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <ConnectionStatus status={site.status} lastCheck={site.lastCheck} siteId={site.id} />
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <div className="flex justify-center gap-4">
            <div>
              <div className="text-sm font-medium text-gray-900">{siteCampaignStats.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-sm font-medium text-blue-600">{siteCampaignStats.active}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
            <div>
              <div className="text-sm font-medium text-green-600">{siteCampaignStats.completed}</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="text-green-600 hover:text-green-900" title="Save">
                ✅
              </button>
              <button onClick={handleEditCancel} className="text-gray-600 hover:text-gray-900" title="Cancel">
                ❌
              </button>
            </>
          ) : !isSelectMode ? (
            <>
              <button
                onClick={() => handleConnectionTest(site.id)}
                disabled={testingSites.has(site.id)}
                className={`${testingSites.has(site.id) ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-900'}`}
                title={testingSites.has(site.id) ? 'Testing...' : 'Test connection'}
              >
                {testingSites.has(site.id) ? '⏳' : '🔍'}
              </button>
              <button onClick={() => handleEditStart(site)} className="text-indigo-600 hover:text-indigo-900" title="Edit">
                ✏️
              </button>
              <button onClick={() => handleDeleteSite(site.id)} className="text-red-600 hover:text-red-900" title="Delete">
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
          <h1 className="text-2xl font-bold text-gray-900">🌐 WordPress Sites</h1>
          <p className="text-gray-600 mt-1">Monitor connection status and manage registered sites.</p>
        </div>
        <div className="flex gap-3">
          {isSelectMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedSites.size} selected</span>
              <TailwindButton variant="secondary" onClick={handleSelectAll} className="text-sm">
                {selectedSites.size === filteredSites.length ? 'Deselect all' : 'Select all'}
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
                    Testing…
                  </>
                ) : (
                  `🔍 Test ${selectedSites.size}`
                )}
              </TailwindButton>
              <TailwindButton variant="danger" onClick={handleBulkDelete} disabled={selectedSites.size === 0} className="text-sm">
                🗑️ Delete selected
              </TailwindButton>
            </div>
          )}
          <TailwindButton variant={isSelectMode ? 'secondary' : 'outline'} onClick={handleSelectModeToggle}>
            {isSelectMode ? 'Cancel selection' : '📋 Bulk select'}
          </TailwindButton>
          {sites.length > 0 && (
            <div className="flex gap-2">
              <TailwindButton variant="secondary" onClick={bulkTestLoading ? handleTestAbort : handleBulkConnectionTest}>
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
                    {currentTestingSite ? `Testing ${currentTestingSite} (${testProgress.current}/${testProgress.total})` : 'Testing…'}
                  </>
                ) : (
                  '🔍 Test all'
                )}
              </TailwindButton>
              {bulkTestLoading && (
                <TailwindButton variant="danger" onClick={handleTestAbort}>
                  🛑 Stop
                </TailwindButton>
              )}
            </div>
          )}
          <TailwindButton variant="primary" onClick={() => router.push('/en/sites/add')}>
            ➕ Add site
          </TailwindButton>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total sites</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-green-600">{stats.connected}</div>
          <div className="text-sm text-gray-600">Connected</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-red-600">{stats.disconnected}</div>
          <div className="text-sm text-gray-600">Disconnected</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-yellow-600">{stats.error}</div>
          <div className="text-sm text-gray-600">Error</div>
        </div>
      </div>

      {/* 필터 및 뷰 모드 */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'all', label: 'All', count: stats.total },
            { key: 'connected', label: 'Connected', count: stats.connected },
            { key: 'disconnected', label: 'Disconnected', count: stats.disconnected }
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

        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Card view
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Table view
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site info</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credentials</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Connection</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaigns</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
              {statusFilter === 'all' ? 'No sites registered yet' : `No sites in ${statusFilter} state`}
            </h3>
            <p className="text-gray-500 mb-6">Register a WordPress site to start distributing backlinks.</p>
            <TailwindButton variant="primary" onClick={() => router.push('/en/sites/add')}>
              Add first site
            </TailwindButton>
          </div>
        </MainCard>
      )}
    </div>
  );
}
