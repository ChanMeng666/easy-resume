'use client';

import { A4_CONFIG } from '@/config/a4-settings';

interface ZoomControlProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  className?: string;
}

export function ZoomControl({ zoom, onZoomChange, className = '' }: ZoomControlProps) {
  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm font-medium text-gray-700">Zoom:</span>
      
      {/* Zoom button group */}
      <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
        {A4_CONFIG.zoomLevels.map((level) => {
          const percentage = Math.round(level * 100);
          const isActive = level === zoom;
          
          return (
            <button
              key={level}
              onClick={() => onZoomChange(level)}
              className={`
                px-3 py-1 text-sm font-medium rounded-md transition-all duration-150
                ${isActive 
                  ? 'bg-primary-main text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              {percentage}%
            </button>
          );
        })}
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={A4_CONFIG.zoomLevels[0]}
          max={A4_CONFIG.zoomLevels[A4_CONFIG.zoomLevels.length - 1]}
          step={0.25}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        
        <span className="text-sm text-gray-500 min-w-[3rem] text-center">
          {zoomPercentage}%
        </span>
      </div>

      {/* Fit to screen button */}
      <button
        onClick={() => {
          // Calculate zoom ratio that fits current screen
          const screenWidth = window.innerWidth;
          const containerPadding = 64; // Left and right padding
          const maxWidth = screenWidth - containerPadding;
          const optimalZoom = Math.min(1, maxWidth / A4_CONFIG.page.width);
          const roundedZoom = Math.round(optimalZoom * 4) / 4; // Round to 0.25 multiples
          
          onZoomChange(Math.max(0.25, Math.min(1.5, roundedZoom)));
        }}
        className="px-3 py-1 text-sm font-medium text-primary-main hover:text-primary-dark 
                   bg-white border border-primary-main/20 rounded-md hover:bg-primary-main/5 
                   transition-colors duration-150"
        title="Fit to screen"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
        </svg>
      </button>
    </div>
  );
}

// 滑块样式
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #2563eb;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .slider::-moz-range-thumb {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #2563eb;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
`;

// 动态注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = sliderStyles;
  document.head.appendChild(styleElement);
}
