'use client';

import { ReactNode, forwardRef } from 'react';
import { A4_CONFIG } from '@/config/a4-settings';

interface A4ContainerProps {
  children: ReactNode;
  zoom?: number;
  className?: string;
  showShadow?: boolean;
}

export const A4Container = forwardRef<HTMLDivElement, A4ContainerProps>(
  ({ children, zoom = 1, className = '', showShadow = true }, ref) => {
    // 获取缩放类名
    const getZoomClass = (zoomLevel: number): string => {
      const zoomPercentage = Math.round(zoomLevel * 100);
      return `zoom-${zoomPercentage}`;
    };

    // 计算缩放后的容器样式
    const containerStyle = {
      width: `${A4_CONFIG.page.width}px`,
      height: `${A4_CONFIG.page.height}px`,
      transform: `scale(${zoom})`,
      transformOrigin: 'top center',
      boxShadow: showShadow 
        ? '0 4px 12px rgba(0, 0, 0, 0.15)' 
        : 'none',
    };

    return (
      <div className="a4-wrapper">
        <div
          ref={ref}
          className={`a4-container ${getZoomClass(zoom)} ${className}`}
          style={containerStyle}
        >
          <div className="a4-content">
            {children}
          </div>
        </div>
      </div>
    );
  }
);

A4Container.displayName = 'A4Container';
