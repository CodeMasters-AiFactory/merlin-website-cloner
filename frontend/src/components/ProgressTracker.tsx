/**
 * Progress Tracker Component
 * Real-time progress tracking with live updates
 */

import React, { useEffect, useState } from 'react';

export interface ProgressData {
  currentPage: number;
  totalPages: number;
  currentUrl: string;
  status: 'processing' | 'crawling' | 'fixing' | 'verifying' | 'exporting' | 'complete';
  message: string;
  assetsCaptured?: number;
  pagesCloned?: number;
  errors?: string[];
  estimatedTimeRemaining?: number; // seconds
  progress?: number; // percentage
  recentFiles?: Array<{ path: string; size: number; timestamp: string; type: string }>;
}

interface ProgressTrackerProps {
  jobId?: string;
  onComplete?: (result: any) => void;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  jobId,
  onComplete,
}) => {
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // Use Server-Sent Events for real-time updates
    const token = localStorage.getItem('token');
    const eventSource = new EventSource(`/api/jobs/${jobId}/progress?token=${encodeURIComponent(token || '')}`, {
      withCredentials: true
    });

    // Fallback to polling if SSE not supported
    const fallbackInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const job = await response.json();
        
        const progressData = {
          currentPage: job.pagesCloned || 0,
          totalPages: job.pagesCloned + (job.status === 'processing' ? 10 : 0),
          currentUrl: job.currentUrl || job.url,
          status: job.status === 'processing' ? 'crawling' : job.status,
          message: job.message || `Cloning ${job.url}...`,
          assetsCaptured: job.assetsCaptured,
          pagesCloned: job.pagesCloned,
          progress: job.progress,
          recentFiles: job.recentFiles || [],
          estimatedTimeRemaining: job.estimatedTimeRemaining,
          errors: job.errors || []
        };
        
        setProgress(progressData);

        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(fallbackInterval);
          onComplete?.(progressData);
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    }, 1000);

    // Handle SSE messages
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data);

        if (data.status === 'complete' || data.status === 'completed' || data.status === 'failed') {
          eventSource.close();
          clearInterval(fallbackInterval);
          onComplete?.(data);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      // SSE failed, polling will handle it
      eventSource.close();
    };

    return () => {
      eventSource.close();
      clearInterval(fallbackInterval);
    };
  }, [jobId, onComplete]);

  if (!progress) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center text-gray-500">Waiting for progress updates...</div>
        </div>
      </div>
    );
  }

  const percentage = progress.progress !== undefined 
    ? progress.progress 
    : (progress.totalPages > 0
      ? Math.round((progress.currentPage / progress.totalPages) * 100)
      : 0);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Backup Progress</h3>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {progress.status === 'complete' ? 'Complete' : progress.message}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {progress.currentPage} / {progress.totalPages} pages
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-primary-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Status Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Current URL</div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {progress.currentUrl || 'N/A'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Status</div>
              <div className="text-sm font-medium text-gray-900 capitalize">
                {progress.status}
              </div>
            </div>
          </div>

          {/* Stats */}
          {(progress.pagesCloned !== undefined || progress.assetsCaptured !== undefined) && (
            <div className="grid grid-cols-2 gap-4">
              {progress.pagesCloned !== undefined && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-600">Pages Cloned</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {progress.pagesCloned}
                  </div>
                </div>
              )}
              {progress.assetsCaptured !== undefined && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600">Assets Captured</div>
                  <div className="text-2xl font-bold text-green-900">
                    {progress.assetsCaptured}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Files Downloading */}
          {progress.recentFiles && progress.recentFiles.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-3">
                Recent Files ({progress.recentFiles.length})
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {progress.recentFiles.slice(0, 10).map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-gray-200">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-gray-500">
                        {file.type === 'html' ? '📄' : file.type === 'image' ? '🖼️' : file.type === 'css' ? '🎨' : file.type === 'js' ? '📜' : '📦'}
                      </span>
                      <span className="text-gray-700 truncate" title={file.path}>
                        {file.path.split('/').pop() || file.path}
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs ml-2">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estimated Time */}
          {progress.estimatedTimeRemaining !== undefined && progress.status !== 'complete' && progress.estimatedTimeRemaining > 0 && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-sm text-yellow-600">Estimated Time Remaining</div>
              <div className="text-lg font-medium text-yellow-900">
                {progress.estimatedTimeRemaining < 60 
                  ? `${progress.estimatedTimeRemaining} seconds`
                  : `${Math.round(progress.estimatedTimeRemaining / 60)} minutes ${progress.estimatedTimeRemaining % 60} seconds`
                }
              </div>
            </div>
          )}

          {/* Errors */}
          {progress.errors && progress.errors.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-sm font-medium text-red-600 mb-2">Errors</div>
              <ul className="list-disc list-inside text-sm text-red-700">
                {progress.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Message */}
          {progress.status === 'complete' && (
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-green-600">
                ✓ Backup completed successfully!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

