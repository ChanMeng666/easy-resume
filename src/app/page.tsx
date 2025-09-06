'use client';

import { useState } from 'react';
import { resumeData } from "@/data/resume";

// 布局组件
import { ResponsiveResumeLayout } from '@/layouts/ResponsiveResumeLayout';
import { A4ResumeLayout } from '@/layouts/A4ResumeLayout';

// UI控制组件
import { MultiPageA4Container } from '@/components/MultiPageA4Container';
import { A4PreviewToggle } from '@/components/A4PreviewToggle';
import { ZoomControl } from '@/components/ZoomControl';
import { ExportPDFButton } from "@/components/ExportPDFButton";

export default function Home() {
  const [isA4Mode, setIsA4Mode] = useState(false);
  const [zoom, setZoom] = useState(1);
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
              <ExportPDFButton 
                resumeName={resumeData.basics.name}
                className="hidden sm:inline-flex"
              />
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
            >
              <A4ResumeLayout resumeData={resumeData} />
            </MultiPageA4Container>
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


    </div>
  );
}