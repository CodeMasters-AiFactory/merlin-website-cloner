/**
 * Clone Button Component
 * One-click "Full Backup" button with automatic configuration
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { cloneWebsite } from '../utils/api';

interface CloneButtonProps {
  onCloneStart?: () => void;
  onCloneComplete?: (result: any) => void;
  onCloneError?: (error: Error) => void;
  onClose?: () => void;
}

export const CloneButton: React.FC<CloneButtonProps> = ({
  onCloneStart,
  onCloneComplete,
  onCloneError,
  onClose,
}) => {
  const [isCloning, setIsCloning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [url, setUrl] = useState('');
  const [certifyOwnership, setCertifyOwnership] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState({
    maxPages: 100,
    maxDepth: 5,
    includeAssets: true,
    optimizeAssets: false,
    useCache: true,
  });

  const handleClone = async () => {
    setError('');

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!certifyOwnership) {
      setError('You must certify that you have legal authority to clone this website');
      return;
    }

    // Normalize URL - add https:// if no protocol specified
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    setIsCloning(true);
    onCloneStart?.();

    try {
      const result = await cloneWebsite(normalizedUrl, options);
      onCloneComplete?.(result);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to start backup';
      setError(errorMessage);
      onCloneError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Header with Back/Close button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-3xl font-bold text-gray-900">Merlin Website Backup</h2>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              disabled={isCloning}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="maxPages" className="block text-sm font-medium text-gray-700 mb-2">
                    Max Pages
                  </label>
                  <input
                    id="maxPages"
                    type="number"
                    value={options.maxPages}
                    onChange={(e) => setOptions({ ...options, maxPages: parseInt(e.target.value) || 100 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                    max="1000"
                    title="Maximum number of pages to clone"
                  />
                </div>
                <div>
                  <label htmlFor="maxDepth" className="block text-sm font-medium text-gray-700 mb-2">
                    Max Depth
                  </label>
                  <input
                    id="maxDepth"
                    type="number"
                    value={options.maxDepth}
                    onChange={(e) => setOptions({ ...options, maxDepth: parseInt(e.target.value) || 5 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                    max="10"
                    title="Maximum link depth to follow"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeAssets}
                    onChange={(e) => setOptions({ ...options, includeAssets: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Include Assets</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.optimizeAssets}
                    onChange={(e) => setOptions({ ...options, optimizeAssets: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Optimize Assets</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.useCache}
                    onChange={(e) => setOptions({ ...options, useCache: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Use Cache</span>
                </label>
              </div>
            </div>
          )}

          {/* Ownership Certification - REQUIRED */}
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={certifyOwnership}
                onChange={(e) => setCertifyOwnership(e.target.checked)}
                className="mt-1 mr-3 h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                disabled={isCloning}
              />
              <span className="text-sm text-yellow-800">
                <strong className="text-yellow-900">I certify that I am the legal owner</strong> of this website, or I have
                explicit written authorization from the owner to create this backup. I understand that unauthorized
                cloning may violate copyright, trademark, and computer fraud laws. I agree to the{' '}
                <Link to="/terms" className="text-primary-600 hover:text-primary-700 font-semibold underline" target="_blank">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/acceptable-use" className="text-primary-600 hover:text-primary-700 font-semibold underline" target="_blank">
                  Acceptable Use Policy
                </Link>
                .
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleClone}
            disabled={isCloning || !url.trim() || !certifyOwnership}
            className="w-full bg-primary-600 text-white px-6 py-4 rounded-lg font-semibold text-lg hover:bg-primary-700 transition-colors duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isCloning ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cloning...
              </>
            ) : (
              'Start Backup'
            )}
          </button>

          {/* Legal Notice */}
          <p className="text-xs text-gray-500 text-center">
            By clicking "Start Backup", you confirm you have legal authority to backup this website.
            Unauthorized use may result in account termination and legal action.
          </p>
        </div>
      </div>
    </div>
  );
};

