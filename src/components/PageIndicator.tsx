'use client';

import { useEffect, useState } from 'react';
import { A4_CONFIG, a4Utils } from '@/config/a4-settings';

interface PageIndicatorProps {
  contentRef?: React.RefObject<HTMLElement>;
  className?: string;
}

export function PageIndicator({ contentRef, className = '' }: PageIndicatorProps) {
  const [contentHeight, setContentHeight] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (!contentRef?.current) return;

    const updateMeasurements = () => {
      const height = contentRef.current?.scrollHeight || 0;
      const pages = a4Utils.calculatePages(height);
      const overflow = !a4Utils.fitsInA4(height);

      setContentHeight(height);
      setPageCount(pages);
      setIsOverflowing(overflow);
    };

    // 初始测量
    updateMeasurements();

    // 监听内容变化
    const observer = new ResizeObserver(updateMeasurements);
    observer.observe(contentRef.current);

    // 监听字体加载完成
    document.fonts?.ready.then(updateMeasurements);

    return () => {
      observer.disconnect();
    };
  }, [contentRef]);

  const heightMm = a4Utils.pxToMm(contentHeight);
  const maxHeightMm = a4Utils.pxToMm(A4_CONFIG.content.height);
  const fillPercentage = Math.min(100, (contentHeight / A4_CONFIG.content.height) * 100);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      <div className="space-y-3">
        {/* Title */}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h4 className="font-medium text-gray-900">Page Info</h4>
        </div>

        {/* Page count indicator */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Pages:</span>
          <div className={`px-2 py-1 rounded-md text-sm font-medium ${
            pageCount === 1 
              ? 'bg-green-100 text-green-800' 
              : 'bg-orange-100 text-orange-800'
          }`}>
            {pageCount} page{pageCount > 1 ? 's' : ''}
          </div>
        </div>

        {/* Content height */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Content Height:</span>
          <span className="text-sm font-mono">
            {heightMm.toFixed(1)}mm / {maxHeightMm}mm
          </span>
        </div>

        {/* Fill progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Page Fill:</span>
            <span className="text-sm font-medium">{fillPercentage.toFixed(1)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                fillPercentage <= 85 
                  ? 'bg-green-500' 
                  : fillPercentage <= 100 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, fillPercentage)}%` }}
            />
          </div>
        </div>

        {/* Status tips */}
        <div className="text-xs">
          {fillPercentage <= 85 && (
            <div className="flex items-center gap-1 text-green-700">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Content fits single page
            </div>
          )}
          
          {fillPercentage > 85 && fillPercentage <= 100 && (
            <div className="flex items-center gap-1 text-yellow-700">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Near page boundary, consider shortening content
            </div>
          )}
          
          {fillPercentage > 100 && (
            <div className="flex items-center gap-1 text-red-700">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Content overflow, needs pagination or trimming
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
