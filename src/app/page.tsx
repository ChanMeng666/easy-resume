'use client';

import { useState } from 'react';
import { resumeData } from "@/data/resume";

// 布局组件
import { ResponsiveResumeLayout } from '@/layouts/ResponsiveResumeLayout';
import { A4ResumeLayout } from '@/layouts/A4ResumeLayout';

// UI控制组件
import { MultiPageA4Container } from '@/components/MultiPageA4Container';
import { PageNavigation } from '@/components/PageNavigation';
import { A4PreviewToggle } from '@/components/A4PreviewToggle';
import { ZoomControl } from '@/components/ZoomControl';
import { PageIndicator } from '@/components/PageIndicator';
import { ContentEditor } from '@/components/ContentEditor';
import { ExportPDFButton } from "@/components/ExportPDFButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const [isA4Mode, setIsA4Mode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [a4ContentRef, setA4ContentRef] = useState<HTMLDivElement | null>(null);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isA4Mode ? 'bg-gray-100' : 'bg-background'
    }`}>
      
      {/* Top control bar */}
      <div className={`sticky top-0 z-50 backdrop-blur-sm transition-all duration-200 ${
        isA4Mode ? 'bg-white/90 border-b border-gray-200' : 'bg-background/90'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            
            {/* Left: Mode toggle */}
            <A4PreviewToggle 
              isA4Mode={isA4Mode} 
              onToggle={setIsA4Mode}
            />
            
            {/* Center: Zoom control (A4 mode only) */}
            {isA4Mode && (
              <ZoomControl 
                zoom={zoom} 
                onZoomChange={setZoom}
                className="flex-1 justify-center hidden sm:flex"
              />
            )}
            
            {/* Right: Action buttons */}
            <div className="flex items-center gap-3">
              <ContentEditor 
                resumeData={resumeData}
                className="hidden lg:block"
              />
              <ExportPDFButton 
                resumeName={resumeData.basics.name}
                className="hidden sm:inline-flex"
              />
              <ThemeToggle />
            </div>
          </div>
          
          {/* Mobile zoom control */}
          {isA4Mode && (
            <div className="sm:hidden mt-3 pt-3 border-t border-gray-200">
              <ZoomControl 
                zoom={zoom} 
                onZoomChange={setZoom}
                className="justify-center"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <main className={`transition-all duration-300 ${
        isA4Mode ? 'py-6' : 'py-8 sm:py-12 px-4 sm:px-6'
      }`}>
        
        {/* Responsive layout mode */}
        {!isA4Mode && (
          <ResponsiveResumeLayout resumeData={resumeData} />
        )}
        
        {/* A4 Preview Mode */}
        {isA4Mode && (
          <div className="space-y-6">
            <MultiPageA4Container 
              zoom={zoom} 
              showShadow={true}
              ref={setA4ContentRef}
              onPageCountChange={setTotalPages}
            >
              <A4ResumeLayout resumeData={resumeData} />
            </MultiPageA4Container>
            
            {/* Page Navigation */}
            {totalPages > 1 && (
              <PageNavigation
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                className="flex justify-center"
              />
            )}
          </div>
        )}
      </main>

      {/* Floating export button (mobile) */}
      <div className="fixed bottom-6 right-6 sm:hidden">
        <ExportPDFButton 
          resumeName={resumeData.basics.name}
          className="shadow-lg"
        />
      </div>

      {/* A4 Mode Info Panel */}
      {isA4Mode && (
        <div className="fixed bottom-6 left-6 space-y-4 hidden lg:block">
          {/* Page Indicator */}
          <PageIndicator 
            contentRef={a4ContentRef ? { current: a4ContentRef } : undefined}
            className="max-w-xs"
          />
          
          {/* A4 Mode Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 max-w-xs">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">A4 Preview Mode</h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Displaying in A4 standard size (210×297mm).
                  Exported PDF will match this preview exactly.
                </p>
                {totalPages > 1 && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    Multi-page layout ({totalPages} pages)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}