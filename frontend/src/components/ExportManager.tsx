/**
 * Export Manager Component
 * Export UI and management for cloned websites
 */

import React, { useState } from 'react';
import { Download, FileArchive, FileText, Database, Loader } from 'lucide-react';
import api from '../utils/api';

export type ExportFormat = 'zip' | 'tar' | 'mhtml' | 'static' | 'json' | 'csv';

interface ExportManagerProps {
  jobId: string;
  outputDir?: string;
  onExportComplete?: (exportPath: string) => void;
}

export const ExportManager: React.FC<ExportManagerProps> = ({
  jobId,
  outputDir,
  onExportComplete,
}) => {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('zip');
  const [exportHistory, setExportHistory] = useState<Array<{ format: ExportFormat; path: string; createdAt: string }>>([]);

  const handleExport = async () => {
    if (!outputDir) {
      alert('No output directory available');
      return;
    }

    setExporting(true);

    try {
      const response = await api.post(`/jobs/${jobId}/export`, {
        format: exportFormat,
        outputPath: outputDir,
      });

      const exportPath = response.data.exportPath;
      setExportHistory([
        {
          format: exportFormat,
          path: exportPath,
          createdAt: new Date().toISOString(),
        },
        ...exportHistory,
      ]);

      onExportComplete?.(exportPath);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const downloadExport = (path: string) => {
    window.open(`/api/download?path=${encodeURIComponent(path)}`, '_blank');
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'zip':
      case 'tar':
        return <FileArchive className="w-5 h-5" />;
      case 'mhtml':
      case 'static':
        return <FileText className="w-5 h-5" />;
      case 'json':
      case 'csv':
        return <Database className="w-5 h-5" />;
      default:
        return <Download className="w-5 h-5" />;
    }
  };

  const getFormatDescription = (format: ExportFormat) => {
    switch (format) {
      case 'zip':
        return 'ZIP archive - Best for general use';
      case 'tar':
        return 'TAR.GZ archive - Best for Linux/Unix';
      case 'mhtml':
        return 'MHTML file - Single file with all assets';
      case 'static':
        return 'Static HTML - Ready to serve';
      case 'json':
        return 'JSON export - Structured data only';
      case 'csv':
        return 'CSV export - Tabular data only';
      default:
        return '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Export Clone</h3>

        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(['zip', 'tar', 'mhtml', 'static', 'json', 'csv'] as ExportFormat[]).map((format) => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    exportFormat === format
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center mb-2">
                    {getFormatIcon(format)}
                  </div>
                  <div className="text-sm font-medium text-gray-900 capitalize">{format}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getFormatDescription(format)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Export Options</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm text-gray-700">Include server files</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm text-gray-700">Compress assets</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm text-gray-700">Include metadata</span>
              </label>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting || !outputDir}
            className="w-full bg-primary-600 text-white px-6 py-4 rounded-lg font-semibold text-lg hover:bg-primary-700 transition-colors duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {exporting ? (
              <>
                <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Export as {exportFormat.toUpperCase()}
              </>
            )}
          </button>

          {/* Export History */}
          {exportHistory.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Export History</h4>
              <div className="space-y-2">
                {exportHistory.map((exportItem, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getFormatIcon(exportItem.format)}
                      <div>
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {exportItem.format}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(exportItem.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadExport(exportItem.path)}
                      className="btn-secondary text-sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

