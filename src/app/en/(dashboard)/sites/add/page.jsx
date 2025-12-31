'use client';

/**
 * 🌐 Site Add Page (EN Version)
 * 워드프레스 사이트 등록 및 관리 로직은 동일하게 유지하되 UI 텍스트를 영어로 구성
 */

import { useState, useEffect, useRef } from 'react';
import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import { sitesAPI } from '@/lib/api/sites';
import { buildSiteCsvTemplate, parseSitesCsvContent } from '@/lib/utils/siteCsvParser';

export default function SiteAddPageEn() {
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

  const BULK_REQUIRED_HEADERS = ['name', 'url', 'username', 'password', 'app_password'];

  const initialBulkState = {
    fileName: '',
    parsedRows: [],
    invalidRows: [],
    skippedRows: [],
    isParsing: false,
    parseError: '',
    successMessage: ''
  };
  const [bulkUploadState, setBulkUploadState] = useState(initialBulkState);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const { data, error } = await sitesAPI.getSites();
      if (error) {
        console.error('Failed to load sites:', error);
        alert('Error loading site list.');
      } else {
        setSites(data || []);
      }
    } catch (error) {
      console.error('Failed to load sites:', error);
      alert('Error loading site list.');
    }
  };

  const normalizeSiteUrl = (rawUrl) =>
    rawUrl
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '')
      .toLowerCase();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateUrl = (url) => {
    const urlPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return urlPattern.test(url);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Enter a site name.';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'Enter the site domain.';
    } else if (!validateUrl(formData.url)) {
      newErrors.url = 'Invalid domain format. (ex: example.com)';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Enter the WordPress username.';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Enter the WordPress password.';
    }

    if (!formData.app_password.trim()) {
      newErrors.app_password = 'Enter the application password.';
    }

    const formUrl = normalizeSiteUrl(formData.url);
    const existingSite = sites.find((site) => normalizeSiteUrl(site.url) === formUrl && (editingId === null || site.id !== editingId));
    if (existingSite) {
      newErrors.url = 'This domain is already registered.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
        alert(`Connection test failed: ${error}`);
      } else {
        setConnectionTest({
          isLoading: false,
          result: data.success ? 'success' : 'error'
        });

        if (!data.success) {
          console.log('Connection test error:', data.message);
        }
      }
    } catch (error) {
      setConnectionTest({
        isLoading: false,
        result: 'error'
      });
      console.error('Connection test error:', error);
      alert('An error occurred during connection test.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (connectionTest.result !== 'success') {
      if (!window.confirm('It is recommended to run the connection test first. Continue anyway?')) {
        return;
      }
    }

    try {
      const siteData = {
        ...formData,
        url: normalizeSiteUrl(formData.url),
        app_password: formData.app_password.replace(/\s/g, ''),
        status: connectionTest.result === 'success' ? 'connected' : 'disconnected'
      };

      if (editingId) {
        const { error } = await sitesAPI.updateSite(editingId, siteData);
        if (error) {
          alert(`Failed to update site: ${error}`);
          return;
        }
        setEditingId(null);
        alert('Site updated successfully.');
      } else {
        const { error } = await sitesAPI.createSite(siteData);
        if (error) {
          alert(`Failed to register site: ${error}`);
          return;
        }
        alert('Site registered successfully.');
      }

      setFormData({
        name: '',
        url: '',
        username: '',
        password: '',
        app_password: ''
      });
      setConnectionTest({ isLoading: false, result: null });
      setErrors({});

      await loadSites();
    } catch (error) {
      console.error('Failed to save site:', error);
      alert('An error occurred while saving the site.');
    }
  };

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

  const handleDeleteSite = async (siteId) => {
    const site = sites.find((s) => s.id === siteId);
    if (window.confirm(`Delete site "${site.name}"?`)) {
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
    }
  };

  const handleRefreshConnection = async (siteId) => {
    try {
      const { error } = await sitesAPI.refreshConnection(siteId);
      if (error) {
        alert(`Failed to refresh status: ${error}`);
        return;
      }
      await loadSites();
    } catch (error) {
      console.error('Failed to refresh status:', error);
      alert('An error occurred while refreshing status.');
    }
  };

  const ConnectionStatus = ({ status, lastCheck }) => {
    const statusConfig = {
      connected: { color: 'text-green-600', bg: 'bg-green-100', text: 'Connected' },
      disconnected: { color: 'text-red-600', bg: 'bg-red-100', text: 'Disconnected' },
      error: { color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Error' }
    };

    const config = statusConfig[status] || statusConfig.error;
    const lastCheckDate = lastCheck ? new Date(lastCheck).toLocaleString('en-US', { hour12: false }) : 'Not checked';

    return (
      <div className="text-center">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
          {config.text}
        </span>
        <p className="text-xs text-gray-500 mt-1">{lastCheckDate}</p>
      </div>
    );
  };

  const handleDownloadCsvTemplate = () => {
    try {
      const template = buildSiteCsvTemplate();
      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'site-bulk-template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV template download error:', error);
      alert('Failed to download the sample CSV.');
    }
  };

  const handleResetBulkUpload = () => {
    setBulkUploadState({ ...initialBulkState });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCsvFileChange = async (event) => {
    const input = event.target;
    const file = input?.files?.[0];
    if (!file) return;

    setBulkUploadState({
      ...initialBulkState,
      fileName: file.name,
      isParsing: true
    });

    try {
      const content = await file.text();
      const parseResult = parseSitesCsvContent(content);

      const existingUrls = new Set(sites.map((site) => normalizeSiteUrl(site.url)));
      const parsedRows = [];
      const skippedRows = [];

      parseResult.validRows.forEach((row) => {
        if (existingUrls.has(row.site.url)) {
          skippedRows.push({
            lineNumber: row.lineNumber,
            reason: 'Already registered domain',
            preview: row.site
          });
        } else {
          parsedRows.push(row);
        }
      });

      setBulkUploadState({
        fileName: file.name,
        parsedRows,
        invalidRows: parseResult.invalidRows,
        skippedRows,
        isParsing: false,
        parseError: '',
        successMessage: ''
      });
    } catch (error) {
      console.error('CSV parsing error:', error);
      setBulkUploadState({
        ...initialBulkState,
        fileName: file.name,
        parseError: 'Failed to parse the CSV file.'
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBulkRegisterSubmit = async () => {
    if (bulkUploadState.parsedRows.length === 0) {
      alert('Upload a valid CSV file first.');
      return;
    }

    setIsBulkSaving(true);
    try {
      const payload = bulkUploadState.parsedRows.map(({ site }) => ({
        name: site.name,
        url: site.url,
        username: site.username,
        password: site.password,
        app_password: site.appPassword.replace(/\s/g, ''),
        status: site.status
      }));

      const { data, error } = await sitesAPI.bulkCreateSites(payload);
      if (error) {
        console.error('Bulk site creation error:', error);
        alert(`Bulk registration failed: ${error}`);
        setBulkUploadState((prev) => ({
          ...prev,
          parseError: error,
          successMessage: ''
        }));
        return;
      }

      const createdCount = data?.length ?? payload.length;
      alert(`${createdCount} sites registered successfully.`);
      setBulkUploadState({
        ...initialBulkState,
        successMessage: `${createdCount} sites registered successfully.`
      });
      await loadSites();
    } catch (error) {
      console.error('Bulk registration error:', error);
      alert('An unexpected error occurred during bulk registration.');
      setBulkUploadState((prev) => ({
        ...prev,
        parseError: 'An unexpected error occurred during bulk registration.',
        successMessage: ''
      }));
    } finally {
      setIsBulkSaving(false);
    }
  };

  const bulkMetrics = {
    total: bulkUploadState.parsedRows.length + bulkUploadState.invalidRows.length + bulkUploadState.skippedRows.length,
    ready: bulkUploadState.parsedRows.length,
    invalid: bulkUploadState.invalidRows.length,
    skipped: bulkUploadState.skippedRows.length
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🌐 Register WordPress Site</h1>
        <p className="text-gray-600 mt-1">Register your WordPress site to use it in backlink campaigns.</p>
      </div>

      {/* 사이트 등록 폼 */}
      <MainCard title={editingId ? '📝 Edit site' : '➕ Register new site'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="ex: My Blog, Company Website"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              <p className="text-gray-500 text-xs mt-1">Internal name to identify the site.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Domain *</label>
              <input
                type="text"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.url ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="ex: myblog.com"
              />
              {errors.url && <p className="text-red-500 text-sm mt-1">{errors.url}</p>}
              <p className="text-gray-500 text-xs mt-1">Enter domain only (without http://).</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">WordPress username *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="ex: admin, editor"
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">WordPress password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="WordPress login password"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Application password *</label>
            <input
              type="text"
              name="app_password"
              value={formData.app_password}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.app_password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="ex: atu1 3EH5 DVaS AN5X JRG2 70UV"
            />
            {errors.app_password && <p className="text-red-500 text-sm mt-1">{errors.app_password}</p>}
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 text-sm font-medium mb-1">How to get an app password</p>
              <p className="text-blue-700 text-xs mb-2">WordPress admin → Users → Profile → Application Passwords</p>
              <p className="text-blue-700 text-xs">
                <strong>Tip:</strong> Keep spaces exactly as shown in WordPress (ex: "atu1 3EH5 DVaS AN5X JRG2 70UV").
              </p>
            </div>
          </div>

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
                  {connectionTest.result === 'success' ? 'Connection test succeeded!' : 'Connection test failed.'}
                </span>
              </div>
              <p className={`text-sm mt-1 ${connectionTest.result === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {connectionTest.result === 'success'
                  ? 'WordPress REST API responded correctly.'
                  : 'Check credentials and app password, then try again.'}
              </p>
            </div>
          )}

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
                  Testing connection...
                </>
              ) : (
                '🔍 Test connection'
              )}
            </TailwindButton>

            {editingId && (
              <TailwindButton type="button" variant="secondary" onClick={handleCancelEdit} className="flex-1">
                Cancel
              </TailwindButton>
            )}

            <TailwindButton type="submit" variant="primary" className="flex-1">
              {editingId ? '📝 Save changes' : '➕ Register site'}
            </TailwindButton>
          </div>
        </form>
      </MainCard>

      <MainCard title="📁 Bulk registration">
        <div className="space-y-5">
          <div className="text-sm text-gray-600">
            <p>Upload a CSV file to register multiple WordPress sites at once.</p>
            <p className="mt-1">
              Required headers:{' '}
              {BULK_REQUIRED_HEADERS.map((header, index) => (
                <span key={header}>
                  <code className="bg-gray-100 px-1 py-0.5 rounded">{header}</code>
                  {index < BULK_REQUIRED_HEADERS.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileChange}
              className="flex-1 cursor-pointer border border-dashed border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <TailwindButton type="button" variant="secondary" onClick={handleDownloadCsvTemplate}>
              📄 Download sample CSV
            </TailwindButton>
          </div>

          {bulkUploadState.isParsing && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">Parsing CSV file. Please wait...</div>
          )}

          {bulkUploadState.parseError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{bulkUploadState.parseError}</div>
          )}

          {bulkUploadState.successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              {bulkUploadState.successMessage}
            </div>
          )}

          {(bulkMetrics.total > 0 || bulkUploadState.fileName) && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-xs text-gray-500 uppercase">File name</p>
                <p className="text-sm font-medium text-gray-900 break-words">{bulkUploadState.fileName || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-xs text-gray-500 uppercase">Total rows</p>
                <p className="text-lg font-semibold text-gray-900">{bulkMetrics.total}</p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-xs text-green-600 uppercase">Ready to register</p>
                <p className="text-lg font-semibold text-green-700">{bulkMetrics.ready}</p>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-600 uppercase">Skipped rows</p>
                <p className="text-lg font-semibold text-yellow-700">
                  {bulkMetrics.invalid + bulkMetrics.skipped}
                  <span className="text-xs text-gray-600 ml-1">
                    (Invalid {bulkMetrics.invalid} · Duplicated {bulkMetrics.skipped})
                  </span>
                </p>
              </div>
            </div>
          )}

          {bulkUploadState.parsedRows.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">
                Sites ready to register ({bulkUploadState.parsedRows.length} total, displaying up to 10)
              </h3>
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Line</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Domain</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Username</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bulkUploadState.parsedRows.slice(0, 10).map(({ lineNumber, site }) => (
                      <tr key={`${lineNumber}-${site.url}`} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-500">{lineNumber}</td>
                        <td className="px-4 py-2 text-gray-900">{site.name}</td>
                        <td className="px-4 py-2 text-gray-900">{site.url}</td>
                        <td className="px-4 py-2 text-gray-700">{site.username}</td>
                        <td className="px-4 py-2 text-gray-700 capitalize">{site.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {bulkUploadState.invalidRows.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md space-y-2">
              <h3 className="text-sm font-semibold text-red-700">Invalid rows</h3>
              <p className="text-xs text-red-600">Invalid rows are excluded automatically. Fix the CSV and retry if needed.</p>
              <ul className="space-y-2 text-sm text-red-700 list-disc list-inside">
                {bulkUploadState.invalidRows.map((row) => (
                  <li key={`invalid-${row.lineNumber}`}>
                    <span className="font-semibold">Line {row.lineNumber}:</span> {row.issues.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bulkUploadState.skippedRows.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md space-y-2">
              <h3 className="text-sm font-semibold text-yellow-800">Duplicated domains skipped</h3>
              <p className="text-xs text-yellow-700">Domains already registered in your account are skipped automatically.</p>
              <ul className="space-y-1 text-sm text-yellow-800 list-disc list-inside">
                {bulkUploadState.skippedRows.map((row) => (
                  <li key={`skipped-${row.lineNumber}`}>
                    Line {row.lineNumber}: {row.preview.url}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <TailwindButton
              type="button"
              variant="primary"
              onClick={handleBulkRegisterSubmit}
              disabled={isBulkSaving || bulkUploadState.parsedRows.length === 0}
              className="flex-1"
            >
              {isBulkSaving ? '⏳ Registering...' : `✅ Register ${bulkUploadState.parsedRows.length} sites`}
            </TailwindButton>
            <TailwindButton type="button" variant="secondary" onClick={handleResetBulkUpload} disabled={isBulkSaving} className="flex-1">
              ♻️ Reset
            </TailwindButton>
          </div>
        </div>
      </MainCard>

      {sites.length > 0 ? (
        <MainCard title="📋 Registered sites">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                        title="Refresh status"
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => handleEditSite(site)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        title="Edit site"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteSite(site.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Delete site"
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
              Tip: If the status shows “Disconnected”, confirm the application password and user permissions.
            </p>
          </div>
        </MainCard>
      ) : (
        <MainCard title="📋 Registered sites">
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🌐</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sites registered yet</h3>
            <p className="text-gray-500 mb-6">Register a WordPress site to start distributing backlinks.</p>
            <div className="text-sm text-gray-400">Use the form above to add your first site.</div>
          </div>
        </MainCard>
      )}
    </div>
  );
}
