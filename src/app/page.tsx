'use client';

import { useState } from 'react';
import { resumeData } from "@/data/resume";

// UI控制组件
import { MultiPageA4Container } from '@/components/MultiPageA4Container';
import { ZoomControl } from '@/components/ZoomControl';
import { ExportPDFButton } from "@/components/ExportPDFButton";
import { Footer } from '@/components/Footer';

export default function Home() {
  const [zoom, setZoom] = useState(1);

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-100">
      
      {/* Top control bar */}
      <div className="sticky top-0 z-50 backdrop-blur-sm transition-all duration-200 bg-white/90 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            
            {/* Left: Logo and Title */}
            <div className="flex items-center gap-3">
              <img 
                src="/easy-resume.svg" 
                alt="Easy Resume" 
                className="w-8 h-8"
              />
              <span className="text-sm font-medium text-gray-700">Easy Resume</span>
            </div>
            
            {/* Center: Zoom control */}
            <ZoomControl 
              zoom={zoom} 
              onZoomChange={setZoom}
              className="flex-1 justify-center hidden sm:flex"
            />
            
            {/* Right: Action buttons */}
            <div className="flex items-center gap-3">
              <ExportPDFButton 
                resumeName={resumeData.basics.name}
                className="hidden sm:inline-flex"
              />
            </div>
          </div>
          
          {/* Mobile zoom control */}
          <div className="sm:hidden mt-3 pt-3 border-t border-gray-200">
            <ZoomControl 
              zoom={zoom} 
              onZoomChange={setZoom}
              className="justify-center"
            />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <main className="transition-all duration-300 py-6">
        <div className="space-y-6">
          <MultiPageA4Container 
            zoom={zoom} 
            showShadow={true}
            resumeData={resumeData}
            useFineGrainedPagination={true}
            debugMode={process.env.NODE_ENV === 'development'}
          />
        </div>
      </main>

      {/* Floating export button (mobile) */}
      <div className="fixed bottom-6 right-6 sm:hidden">
        <ExportPDFButton 
          resumeName={resumeData.basics.name}
          className="shadow-lg"
        />
      </div>

      {/* Footer */}
      <Footer />

    </div>
  );
}