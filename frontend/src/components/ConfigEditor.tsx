import React, { useState, useEffect } from 'react';
import api from '../utils/api';

interface CloneConfig {
  url: string;
  outputDir?: string;
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  unlimited?: boolean;
  proxy?: {
    enabled?: boolean;
    providers?: Array<{
      name: string;
      apiKey?: string;
      config?: Record<string, any>;
    }>;
    rotationStrategy?: string;
  };
  userAgent?: {
    rotation?: boolean;
    customAgents?: string[];
  };
  cloudflare?: {
    enabled?: boolean;
    captchaApiKey?: string;
    capsolverApiKey?: string;
  };
  verifyAfterClone?: boolean;
  exportFormat?: string;
  cache?: {
    enabled?: boolean;
    ttl?: number;
    type?: string;
    redisUrl?: string;
    filePath?: string;
  };
  incremental?: boolean;
  captureScreenshots?: boolean;
  generatePdfs?: boolean;
  distributed?: boolean;
  mobileEmulation?: {
    enabled?: boolean;
    deviceName?: string;
    viewport?: {
      width: number;
      height: number;
      deviceScaleFactor: number;
      isMobile: boolean;
      hasTouch: boolean;
      isLandscape: boolean;
    };
  };
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  resourceBlocking?: {
    blockAds?: boolean;
    blockTrackers?: boolean;
    blockAnalytics?: boolean;
    blockFonts?: boolean;
    blockImages?: boolean;
    blockStylesheets?: boolean;
    blockScripts?: boolean;
    blockMedia?: boolean;
  };
  retry?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    multiplier?: number;
    jitter?: boolean;
  };
  advanced?: {
    tlsImpersonation?: boolean;
    webSocketCapture?: boolean;
    apiScraping?: boolean;
    smartCrawling?: boolean;
    cdnOptimization?: boolean;
    assetDeduplication?: boolean;
    linkRewriting?: boolean;
    pwaSupport?: boolean;
  };
}

interface ConfigEditorProps {
  configName?: string;
  onSave?: (name: string) => void;
  onCancel?: () => void;
}

export const ConfigEditor: React.FC<ConfigEditorProps> = ({ configName, onSave, onCancel }) => {
  const [config, setConfig] = useState<CloneConfig | null>(null);
  const [name, setName] = useState(configName || '');
  const [format, setFormat] = useState<'yaml' | 'json'>('yaml');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    loadConfig();
  }, [configName]);

  const loadConfig = async () => {
    if (configName) {
      setLoading(true);
      try {
        const response = await api.get(`/api/configs/${configName}`);
        setConfig(response.data);
        setName(configName);
      } catch (error: any) {
        console.error('Failed to load config:', error);
        setErrors([error.message || 'Failed to load config']);
      } finally {
        setLoading(false);
      }
    } else {
      // Load default config
      setLoading(true);
      try {
        const response = await api.get('/api/configs/default');
        setConfig(response.data);
      } catch (error: any) {
        console.error('Failed to load default config:', error);
        setErrors([error.message || 'Failed to load default config']);
      } finally {
        setLoading(false);
      }
    }
  };

  const validateConfig = async () => {
    if (!config) return;
    
    try {
      const response = await api.post('/api/configs/validate', { config });
      const validation = response.data;
      setErrors(validation.errors || []);
      setWarnings(validation.warnings || []);
      return validation.valid;
    } catch (error: any) {
      setErrors([error.message || 'Validation failed']);
      return false;
    }
  };

  const handleSave = async () => {
    if (!config || !name.trim()) {
      setErrors(['Config name is required']);
      return;
    }

    const isValid = await validateConfig();
    if (!isValid) {
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/configs', { name, config, format });
      if (onSave) {
        onSave(name);
      }
    } catch (error: any) {
      setErrors([error.message || 'Failed to save config']);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (path: string, value: any) => {
    if (!config) return;
    
    const keys = path.split('.');
    const newConfig = { ...config };
    let current: any = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
  };

  if (loading) {
    return <div className="p-4">Loading config...</div>;
  }

  if (!config) {
    return <div className="p-4 text-red-500">Failed to load config</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Configuration Editor</h2>
        
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Config Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="my-config"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'yaml' | 'json')}
              className="px-3 py-2 border rounded"
            >
              <option value="yaml">YAML</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <h3 className="font-semibold text-red-800 mb-2">Errors:</h3>
            <ul className="list-disc list-inside text-red-700">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-semibold text-yellow-800 mb-2">Warnings:</h3>
            <ul className="list-disc list-inside text-yellow-700">
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b mb-4">
        <div className="flex gap-4">
          {['basic', 'proxy', 'cloudflare', 'cache', 'advanced'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Basic Settings */}
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">URL *</label>
            <input
              type="url"
              value={config.url || ''}
              onChange={(e) => updateConfig('url', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="https://example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Output Directory</label>
              <input
                type="text"
                value={config.outputDir || ''}
                onChange={(e) => updateConfig('outputDir', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Export Format</label>
              <select
                value={config.exportFormat || 'static'}
                onChange={(e) => updateConfig('exportFormat', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="static">Static</option>
                <option value="zip">ZIP</option>
                <option value="tar">TAR</option>
                <option value="mhtml">MHTML</option>
                <option value="warc">WARC</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Max Pages</label>
              <input
                type="number"
                value={config.maxPages || ''}
                onChange={(e) => updateConfig('maxPages', parseInt(e.target.value) || undefined)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Max Depth</label>
              <input
                type="number"
                value={config.maxDepth || ''}
                onChange={(e) => updateConfig('maxDepth', parseInt(e.target.value) || undefined)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Concurrency</label>
              <input
                type="number"
                value={config.concurrency || ''}
                onChange={(e) => updateConfig('concurrency', parseInt(e.target.value) || undefined)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.unlimited || false}
                onChange={(e) => updateConfig('unlimited', e.target.checked)}
                className="rounded"
              />
              <span>Unlimited pages</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.captureScreenshots || false}
                onChange={(e) => updateConfig('captureScreenshots', e.target.checked)}
                className="rounded"
              />
              <span>Capture screenshots</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.generatePdfs || false}
                onChange={(e) => updateConfig('generatePdfs', e.target.checked)}
                className="rounded"
              />
              <span>Generate PDFs</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.verifyAfterClone || false}
                onChange={(e) => updateConfig('verifyAfterClone', e.target.checked)}
                className="rounded"
              />
              <span>Verify after clone</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.incremental || false}
                onChange={(e) => updateConfig('incremental', e.target.checked)}
                className="rounded"
              />
              <span>Incremental updates</span>
            </label>
          </div>
        </div>
      )}

      {/* Proxy Settings */}
      {activeTab === 'proxy' && (
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.proxy?.enabled || false}
              onChange={(e) => updateConfig('proxy.enabled', e.target.checked)}
              className="rounded"
            />
            <span>Enable proxy</span>
          </label>

          {config.proxy?.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Rotation Strategy</label>
                <select
                  value={config.proxy?.rotationStrategy || 'round-robin'}
                  onChange={(e) => updateConfig('proxy.rotationStrategy', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="round-robin">Round Robin</option>
                  <option value="per-request">Per Request</option>
                  <option value="per-domain">Per Domain</option>
                  <option value="sticky">Sticky</option>
                  <option value="speed-based">Speed Based</option>
                  <option value="success-based">Success Based</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Cloudflare Settings */}
      {activeTab === 'cloudflare' && (
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.cloudflare?.enabled || false}
              onChange={(e) => updateConfig('cloudflare.enabled', e.target.checked)}
              className="rounded"
            />
            <span>Enable Cloudflare bypass</span>
          </label>

          {config.cloudflare?.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">2Captcha API Key</label>
                <input
                  type="password"
                  value={config.cloudflare?.captchaApiKey || ''}
                  onChange={(e) => updateConfig('cloudflare.captchaApiKey', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">CapSolver API Key</label>
                <input
                  type="password"
                  value={config.cloudflare?.capsolverApiKey || ''}
                  onChange={(e) => updateConfig('cloudflare.capsolverApiKey', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Optional"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Cache Settings */}
      {activeTab === 'cache' && (
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.cache?.enabled || false}
              onChange={(e) => updateConfig('cache.enabled', e.target.checked)}
              className="rounded"
            />
            <span>Enable caching</span>
          </label>

          {config.cache?.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cache Type</label>
                  <select
                    value={config.cache?.type || 'file'}
                    onChange={(e) => updateConfig('cache.type', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="file">File</option>
                    <option value="redis">Redis</option>
                    <option value="memory">Memory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">TTL (ms)</label>
                  <input
                    type="number"
                    value={config.cache?.ttl || ''}
                    onChange={(e) => updateConfig('cache.ttl', parseInt(e.target.value) || undefined)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>

              {config.cache?.type === 'file' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Cache Directory</label>
                  <input
                    type="text"
                    value={config.cache?.filePath || ''}
                    onChange={(e) => updateConfig('cache.filePath', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              )}

              {config.cache?.type === 'redis' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Redis URL</label>
                  <input
                    type="text"
                    value={config.cache?.redisUrl || ''}
                    onChange={(e) => updateConfig('cache.redisUrl', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="redis://localhost:6379"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Advanced Settings */}
      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <h3 className="font-semibold">Advanced Features</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(config.advanced || {}).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={value || false}
                  onChange={(e) => updateConfig(`advanced.${key}`, e.target.checked)}
                  className="rounded"
                />
                <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              </label>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Retry Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Max Retries</label>
                <input
                  type="number"
                  value={config.retry?.maxRetries || ''}
                  onChange={(e) => updateConfig('retry.maxRetries', parseInt(e.target.value) || undefined)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Initial Delay (ms)</label>
                <input
                  type="number"
                  value={config.retry?.initialDelay || ''}
                  onChange={(e) => updateConfig('retry.initialDelay', parseInt(e.target.value) || undefined)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max Delay (ms)</label>
                <input
                  type="number"
                  value={config.retry?.maxDelay || ''}
                  onChange={(e) => updateConfig('retry.maxDelay', parseInt(e.target.value) || undefined)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Config'}
        </button>
        <button
          onClick={validateConfig}
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Validate
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

