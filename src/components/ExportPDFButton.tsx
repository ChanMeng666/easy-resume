'use client';

import { useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ExportPDFButtonProps {
  resumeName?: string;
  className?: string;
}

export function ExportPDFButton({ 
  resumeName = 'Resume', 
  className = '' 
}: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      setError(null);

      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate PDF');
      }

      // 获取PDF blob
      const blob = await response.blob();
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 生成文件名
      const currentDate = new Date().toISOString().split('T')[0];
      link.download = `${resumeName}-${currentDate}.pdf`;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理URL对象
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Export PDF error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleExportPDF}
        disabled={isExporting}
        className={`
          inline-flex items-center justify-center gap-3 px-6 py-3
          bg-primary-main hover:bg-primary-dark 
          text-white font-medium rounded-lg
          transition-all duration-200 ease-in-out
          disabled:opacity-50 disabled:cursor-not-allowed
          disabled:hover:bg-primary-main
          shadow-sm hover:shadow-md
          focus:outline-none focus:ring-2 focus:ring-primary-main/50 focus:ring-offset-2
          ${className}
        `}
        type="button"
      >
        {isExporting ? (
          <>
            <LoadingSpinner size="sm" className="text-white" />
            <span>Generating PDF...</span>
          </>
        ) : (
          <>
            <svg 
              className="h-5 w-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
            <span>Export as PDF</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 text-center max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
}
