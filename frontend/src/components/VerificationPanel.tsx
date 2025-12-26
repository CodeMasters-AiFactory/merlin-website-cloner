/**
 * Verification Panel Component
 * Displays detailed verification results with animated score and category breakdown
 */

import React, { useState, useEffect } from 'react';

export interface VerificationCheck {
  name: string;
  passed: boolean;
  message: string;
  category: 'content' | 'resources' | 'styling' | 'scripts' | 'animations' | 'videos';
}

export interface VerificationResult {
  score: number;
  passed: boolean;
  checks: VerificationCheck[];
  summary: string;
  screenshots?: {
    original?: string;
    clone?: string;
    diff?: string;
  };
}

interface VerificationPanelProps {
  result: VerificationResult | null;
  isLoading?: boolean;
  animateScore?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  content: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  resources: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  styling: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  scripts: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  animations: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  videos: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
};

const CATEGORY_COLORS: Record<string, string> = {
  content: 'text-blue-400',
  resources: 'text-purple-400',
  styling: 'text-pink-400',
  scripts: 'text-amber-400',
  animations: 'text-green-400',
  videos: 'text-red-400',
};

export const VerificationPanel: React.FC<VerificationPanelProps> = ({
  result,
  isLoading = false,
  animateScore = true,
}) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Animate score from 0 to final value
  useEffect(() => {
    if (!result || !animateScore) {
      setDisplayScore(result?.score || 0);
      return;
    }

    setDisplayScore(0);
    const targetScore = result.score;
    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const increment = targetScore / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(targetScore, increment * step);
      setDisplayScore(Math.round(current));

      if (step >= steps) {
        clearInterval(timer);
        setDisplayScore(targetScore);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [result, animateScore]);

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 95) return { text: 'text-green-400', bg: 'bg-green-500', ring: 'ring-green-500/30' };
    if (score >= 80) return { text: 'text-lime-400', bg: 'bg-lime-500', ring: 'ring-lime-500/30' };
    if (score >= 60) return { text: 'text-yellow-400', bg: 'bg-yellow-500', ring: 'ring-yellow-500/30' };
    if (score >= 40) return { text: 'text-orange-400', bg: 'bg-orange-500', ring: 'ring-orange-500/30' };
    return { text: 'text-red-400', bg: 'bg-red-500', ring: 'ring-red-500/30' };
  };

  // Group checks by category
  const groupedChecks = result?.checks.reduce((acc, check) => {
    if (!acc[check.category]) {
      acc[check.category] = [];
    }
    acc[check.category].push(check);
    return acc;
  }, {} as Record<string, VerificationCheck[]>) || {};

  // Calculate category scores
  const categoryScores = Object.entries(groupedChecks).map(([category, checks]) => {
    const passed = checks.filter(c => c.passed).length;
    const total = checks.length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { category, passed, total, score };
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const scoreColor = getScoreColor(displayScore);

  if (isLoading) {
    return (
      <div className="verification-panel bg-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-slate-600" />
              <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-slate-400 animate-pulse">Verifying clone quality...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="verification-panel bg-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No verification results yet</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-panel bg-slate-800 rounded-xl overflow-hidden">
      {/* Score Section */}
      <div className="score-section p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-6">
          {/* Score Circle */}
          <div className="relative">
            <div
              className={`w-32 h-32 rounded-full ${scoreColor.ring} ring-8 flex items-center justify-center bg-slate-900`}
              style={{
                background: `conic-gradient(${
                  displayScore >= 95 ? '#22c55e' :
                  displayScore >= 80 ? '#84cc16' :
                  displayScore >= 60 ? '#eab308' :
                  displayScore >= 40 ? '#f97316' : '#ef4444'
                } ${displayScore * 3.6}deg, #1e293b ${displayScore * 3.6}deg)`,
              }}
            >
              <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center">
                <span className={`text-4xl font-bold ${scoreColor.text}`}>{displayScore}%</span>
              </div>
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-white">Verification Score</h3>
              {displayScore >= 95 && (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Disaster Recovery Certified
                </span>
              )}
            </div>
            <p className="text-slate-400 mb-4">{result.summary}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {result.checks.filter(c => c.passed).length} passed
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {result.checks.filter(c => !c.passed).length} failed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="category-breakdown p-4 space-y-2">
        <h4 className="text-sm font-medium text-slate-400 px-2 mb-3">Category Breakdown</h4>

        {categoryScores.map(({ category, passed, total, score }) => (
          <div key={category} className="rounded-lg bg-slate-700/50 overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-700 transition-colors"
            >
              <span className={CATEGORY_COLORS[category] || 'text-slate-400'}>
                {CATEGORY_ICONS[category] || CATEGORY_ICONS.content}
              </span>
              <span className="flex-1 text-left">
                <span className="text-white font-medium capitalize">{category}</span>
                <span className="text-slate-400 text-sm ml-2">({passed}/{total})</span>
              </span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      score >= 80 ? 'bg-green-500' :
                      score >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className={`text-sm font-medium w-12 text-right ${
                  score >= 80 ? 'text-green-400' :
                  score >= 60 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {score}%
                </span>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    expandedCategories.has(category) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded Checks */}
            {expandedCategories.has(category) && (
              <div className="border-t border-slate-600 p-3 space-y-2">
                {groupedChecks[category]?.map((check, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-2 rounded ${
                      check.passed ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    {check.passed ? (
                      <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                    <div>
                      <p className={`font-medium ${check.passed ? 'text-green-300' : 'text-red-300'}`}>
                        {check.name}
                      </p>
                      <p className="text-sm text-slate-400">{check.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Visual Diff Thumbnails */}
      {result.screenshots && (
        <div className="screenshots-section p-4 border-t border-slate-700">
          <h4 className="text-sm font-medium text-slate-400 mb-3">Visual Comparison</h4>
          <div className="grid grid-cols-3 gap-3">
            {result.screenshots.original && (
              <div className="relative group cursor-pointer">
                <img
                  src={result.screenshots.original}
                  alt="Original"
                  className="w-full h-32 object-cover object-top rounded-lg"
                />
                <div className="absolute inset-0 bg-blue-500/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <span className="text-white font-medium">Original</span>
                </div>
              </div>
            )}
            {result.screenshots.clone && (
              <div className="relative group cursor-pointer">
                <img
                  src={result.screenshots.clone}
                  alt="Clone"
                  className="w-full h-32 object-cover object-top rounded-lg"
                />
                <div className="absolute inset-0 bg-green-500/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <span className="text-white font-medium">Clone</span>
                </div>
              </div>
            )}
            {result.screenshots.diff && (
              <div className="relative group cursor-pointer">
                <img
                  src={result.screenshots.diff}
                  alt="Difference"
                  className="w-full h-32 object-cover object-top rounded-lg"
                />
                <div className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <span className="text-white font-medium">Difference</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationPanel;
