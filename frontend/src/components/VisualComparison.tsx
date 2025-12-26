/**
 * Visual Comparison Component
 * Side-by-side and overlay comparison of original vs cloned website
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface VisualComparisonProps {
  originalUrl: string;
  cloneUrl: string;
  originalScreenshot?: string;
  cloneScreenshot?: string;
  diffScreenshot?: string;
}

type ViewMode = 'side-by-side' | 'slider' | 'diff' | 'toggle';
type Viewport = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_SIZES: Record<Viewport, { width: number; height: number }> = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

export const VisualComparison: React.FC<VisualComparisonProps> = ({
  originalUrl,
  cloneUrl,
  originalScreenshot,
  cloneScreenshot,
  diffScreenshot,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [showOriginal, setShowOriginal] = useState(true);
  const [syncScroll, setSyncScroll] = useState(true);
  const [isLoading, setIsLoading] = useState({ original: true, clone: true });

  const originalRef = useRef<HTMLIFrameElement>(null);
  const cloneRef = useRef<HTMLIFrameElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Sync scroll between iframes
  const handleScroll = useCallback((source: 'original' | 'clone') => {
    if (!syncScroll) return;

    const sourceFrame = source === 'original' ? originalRef.current : cloneRef.current;
    const targetFrame = source === 'original' ? cloneRef.current : originalRef.current;

    if (sourceFrame?.contentWindow && targetFrame?.contentWindow) {
      try {
        const scrollTop = sourceFrame.contentWindow.scrollY;
        const scrollLeft = sourceFrame.contentWindow.scrollX;
        targetFrame.contentWindow.scrollTo(scrollLeft, scrollTop);
      } catch {
        // Cross-origin restriction, ignore
      }
    }
  }, [syncScroll]);

  // Slider drag handling
  const handleSliderDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderContainerRef.current) return;

    const container = sliderContainerRef.current;
    const rect = container.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const position = ((clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, position)));
  }, []);

  const handleSliderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (e: MouseEvent) => {
      if (!sliderContainerRef.current) return;
      const rect = sliderContainerRef.current.getBoundingClientRect();
      const position = ((e.clientX - rect.left) / rect.width) * 100;
      setSliderPosition(Math.max(0, Math.min(100, position)));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const viewportSize = VIEWPORT_SIZES[viewport];

  return (
    <div className="visual-comparison bg-slate-900 rounded-xl overflow-hidden">
      {/* Controls */}
      <div className="controls flex items-center justify-between p-4 border-b border-slate-700">
        {/* View Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400 mr-2">View:</span>
          {(['side-by-side', 'slider', 'diff', 'toggle'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === mode
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {mode === 'side-by-side' && 'Side by Side'}
              {mode === 'slider' && 'Slider'}
              {mode === 'diff' && 'Difference'}
              {mode === 'toggle' && 'Toggle'}
            </button>
          ))}
        </div>

        {/* Viewport Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400 mr-2">Viewport:</span>
          {(['desktop', 'tablet', 'mobile'] as Viewport[]).map((vp) => (
            <button
              key={vp}
              onClick={() => setViewport(vp)}
              className={`p-2 rounded-md transition-all ${
                viewport === vp
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title={`${vp} (${VIEWPORT_SIZES[vp].width}x${VIEWPORT_SIZES[vp].height})`}
            >
              {vp === 'desktop' && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
              {vp === 'tablet' && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
              {vp === 'mobile' && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Sync Scroll Toggle */}
        {viewMode === 'side-by-side' && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-300">Sync Scroll</span>
            </label>
          </div>
        )}
      </div>

      {/* Comparison Area */}
      <div className="comparison-area relative" style={{ height: '70vh' }}>
        {/* Side by Side View */}
        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-2 h-full gap-1">
            <div className="relative">
              <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                Original
              </div>
              {isLoading.original && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
                </div>
              )}
              <iframe
                ref={originalRef}
                src={originalUrl}
                className="w-full h-full border-0"
                style={{ transform: `scale(${Math.min(1, 600 / viewportSize.width)})`, transformOrigin: 'top left' }}
                onLoad={() => setIsLoading(prev => ({ ...prev, original: false }))}
                onScroll={() => handleScroll('original')}
              />
            </div>
            <div className="relative">
              <div className="absolute top-2 left-2 z-10 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                Clone
              </div>
              {isLoading.clone && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
                </div>
              )}
              <iframe
                ref={cloneRef}
                src={cloneUrl}
                className="w-full h-full border-0"
                style={{ transform: `scale(${Math.min(1, 600 / viewportSize.width)})`, transformOrigin: 'top left' }}
                onLoad={() => setIsLoading(prev => ({ ...prev, clone: false }))}
                onScroll={() => handleScroll('clone')}
              />
            </div>
          </div>
        )}

        {/* Slider View */}
        {viewMode === 'slider' && (
          <div
            ref={sliderContainerRef}
            className="relative h-full cursor-ew-resize overflow-hidden"
            onMouseDown={handleSliderMouseDown}
            onTouchMove={handleSliderDrag}
          >
            {/* Clone (Background) */}
            <div className="absolute inset-0">
              {cloneScreenshot ? (
                <img src={cloneScreenshot} alt="Clone" className="w-full h-full object-cover object-top" />
              ) : (
                <iframe src={cloneUrl} className="w-full h-full border-0 pointer-events-none" />
              )}
            </div>

            {/* Original (Foreground with clip) */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
              {originalScreenshot ? (
                <img src={originalScreenshot} alt="Original" className="w-full h-full object-cover object-top" />
              ) : (
                <iframe src={originalUrl} className="w-full h-full border-0 pointer-events-none" />
              )}
            </div>

            {/* Slider Handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize z-10"
              style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
              Original
            </div>
            <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
              Clone
            </div>
          </div>
        )}

        {/* Diff View */}
        {viewMode === 'diff' && (
          <div className="relative h-full flex items-center justify-center bg-slate-800">
            {diffScreenshot ? (
              <div className="relative">
                <img src={diffScreenshot} alt="Difference" className="max-h-full object-contain" />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-red-500" />
                      <span className="text-slate-300">Differences highlighted in red</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>No diff image available</p>
                <p className="text-sm mt-2">Enable screenshot capture to see visual differences</p>
              </div>
            )}
          </div>
        )}

        {/* Toggle View */}
        {viewMode === 'toggle' && (
          <div className="relative h-full">
            <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: showOriginal ? 1 : 0 }}>
              {originalScreenshot ? (
                <img src={originalScreenshot} alt="Original" className="w-full h-full object-cover object-top" />
              ) : (
                <iframe src={originalUrl} className="w-full h-full border-0" />
              )}
            </div>
            <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: showOriginal ? 0 : 1 }}>
              {cloneScreenshot ? (
                <img src={cloneScreenshot} alt="Clone" className="w-full h-full object-cover object-top" />
              ) : (
                <iframe src={cloneUrl} className="w-full h-full border-0" />
              )}
            </div>

            {/* Toggle Button */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="flex items-center gap-2 bg-slate-900/90 backdrop-blur px-4 py-2 rounded-full text-white hover:bg-slate-800 transition-colors"
              >
                <span className={`w-2 h-2 rounded-full ${showOriginal ? 'bg-blue-500' : 'bg-green-500'}`} />
                <span>{showOriginal ? 'Original' : 'Clone'}</span>
                <span className="text-slate-400 text-sm">(Click to toggle)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* URL Info */}
      <div className="url-info grid grid-cols-2 gap-4 p-4 border-t border-slate-700 text-sm">
        <div>
          <span className="text-slate-400">Original:</span>
          <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-400 hover:underline truncate">
            {originalUrl}
          </a>
        </div>
        <div>
          <span className="text-slate-400">Clone:</span>
          <a href={cloneUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-green-400 hover:underline truncate">
            {cloneUrl}
          </a>
        </div>
      </div>
    </div>
  );
};

export default VisualComparison;
