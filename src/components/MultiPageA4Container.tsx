'use client';

import { ReactNode, useState, useEffect } from 'react';
import { A4_CONFIG } from '@/config/a4-settings';

interface MultiPageA4ContainerProps {
  children: ReactNode;
  zoom?: number;
  className?: string;
  showShadow?: boolean;
}

export const MultiPageA4Container = ({ children, zoom = 1, className = '', showShadow = true }: MultiPageA4ContainerProps) => {
    const [pageCount, setPageCount] = useState(1);
    const [measurerRef, setMeasurerRef] = useState<HTMLDivElement | null>(null);

    // Calculate pages needed based on content height
    useEffect(() => {
      if (measurerRef) {
        // Use ResizeObserver to detect content changes
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const height = entry.target.scrollHeight;
            const pages = Math.ceil(height / A4_CONFIG.content.height);
            setPageCount(Math.max(1, pages));
          }
        });

        resizeObserver.observe(measurerRef);

        // Initial measurement
        const height = measurerRef.scrollHeight;
        const pages = Math.ceil(height / A4_CONFIG.content.height);
        setPageCount(Math.max(1, pages));

        return () => {
          resizeObserver.disconnect();
        };
      }
    }, [measurerRef, children]);

    // Generate pages with content clipping
    const pages = Array.from({ length: pageCount }, (_, index) => (
      <div key={index} className="a4-page">
        <div
          className="a4-container"
          style={{
            width: `${A4_CONFIG.page.width}px`,
            height: `${A4_CONFIG.page.height}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            boxShadow: showShadow 
              ? '0 4px 12px rgba(0, 0, 0, 0.15)' 
              : 'none',
            marginBottom: index < pageCount - 1 ? '2rem' : '0',
          }}
        >
          <div 
            className="a4-content"
            style={{
              width: `${A4_CONFIG.content.width}px`,
              height: `${A4_CONFIG.content.height}px`,
              margin: '48px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                transform: `translateY(-${index * A4_CONFIG.content.height}px)`,
                width: '100%',
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    ));

    return (
      <div className="multi-page-a4-wrapper">
        <div className={`multi-page-container ${className}`}>
          {/* Hidden content measurer */}
          <div 
            ref={setMeasurerRef}
            className="content-measurer"
            style={{
              position: 'absolute',
              visibility: 'hidden',
              width: `${A4_CONFIG.content.width}px`,
              pointerEvents: 'none',
              zIndex: -1,
              left: '-9999px',
            }}
          >
            {children}
          </div>
          
          {/* Rendered pages */}
          <div className="pages-container">
            {pages}
          </div>
        </div>
      </div>
    );
};
