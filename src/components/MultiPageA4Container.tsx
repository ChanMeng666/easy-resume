'use client';

import { ReactNode, useMemo } from 'react';
import { A4_CONFIG } from '@/config/a4-settings';
import { splitContentIntoPages, optimizePageBreaks, PageContent } from '@/utils/page-splitter';
import { ResumeData } from '@/data/resume';

// 智能分页组件
import { SmartPageRenderer } from './SmartPageRenderer';
import { FineGrainedPageRenderer } from './FineGrainedPageRenderer';

interface MultiPageA4ContainerProps {
  children?: ReactNode; // 保持兼容性，但在智能分页模式下不使用
  resumeData?: ResumeData; // 新增：用于智能分页
  useSmartPagination?: boolean; // 是否使用智能分页
  useFineGrainedPagination?: boolean; // 是否使用细粒度分页（Word样式）
  debugMode?: boolean; // 调试模式，显示高度信息和边界
  zoom?: number;
  className?: string;
  showShadow?: boolean;
}

export const MultiPageA4Container = ({ 
  children, 
  resumeData, 
  useSmartPagination = false,
  useFineGrainedPagination = false,
  debugMode = false,
  zoom = 1, 
  className = '', 
  showShadow = true 
}: MultiPageA4ContainerProps) => {
  // 智能分页逻辑
  const smartPages: PageContent[] = useMemo(() => {
    if ((!useSmartPagination && !useFineGrainedPagination) || !resumeData) return [];
    const rawPages = splitContentIntoPages(resumeData);
    return optimizePageBreaks(rawPages);
  }, [useSmartPagination, useFineGrainedPagination, resumeData]);

  // 如果使用智能分页且有简历数据，使用新的渲染方式
  if ((useSmartPagination || useFineGrainedPagination) && resumeData && smartPages.length > 0) {
    return (
      <div className="multi-page-a4-wrapper">
        <div className={`multi-page-container ${className}`}>
          <div className="pages-container">
            {smartPages.map((pageContent, index) => (
              <div key={pageContent.pageNumber} className="a4-page">
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
                    marginBottom: index < smartPages.length - 1 ? '2rem' : '0',
                  }}
                >
                  <div 
                    className="a4-content smart-pagination"
                    style={{
                      width: `${A4_CONFIG.content.width}px`,
                      height: `${A4_CONFIG.content.height}px`,
                      margin: '48px',
                      position: 'relative',
                      overflow: debugMode ? 'visible' : 'hidden',
                      border: debugMode ? '2px dashed #ff9800' : 'none',
                    }}
                  >
                    {useFineGrainedPagination ? (
                      <FineGrainedPageRenderer 
                        pageContent={pageContent} 
                        debugMode={debugMode}
                      />
                    ) : (
                      <SmartPageRenderer 
                        pageContent={pageContent} 
                        debugMode={debugMode}
                      />
                    )}
                    {debugMode && (
                      <div style={{
                        position: 'absolute',
                        top: -50,
                        right: 0,
                        background: '#ff9800',
                        color: 'white',
                        padding: '6px 10px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        zIndex: 1000,
                        lineHeight: '1.3',
                        minWidth: '180px'
                      }}>
                        <div>页面 {pageContent.pageNumber} | 高度: {A4_CONFIG.content.height}px</div>
                        <div style={{ fontSize: '10px', opacity: 0.9 }}>
                          左: {(pageContent.leftColumn.work?.length || 0) + (pageContent.leftColumn.projects?.length || 0)}项 
                          | 右: {[
                            pageContent.rightColumn.education?.length && 'E',
                            pageContent.rightColumn.skills?.length && 'S',
                            pageContent.rightColumn.achievements?.length && 'A',
                            pageContent.rightColumn.certifications?.length && 'C'
                          ].filter(Boolean).join('+')}
                        </div>
                        {(pageContent.leftColumn.workContinuation || pageContent.leftColumn.projectsContinuation) && (
                          <div style={{ fontSize: '9px', color: '#ffeb3b' }}>
                            续: {pageContent.leftColumn.workContinuation ? 'W' : ''}{pageContent.leftColumn.projectsContinuation ? 'P' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 回退到传统的基于高度的分页（为了向后兼容）
  return <LegacyMultiPageContainer 
    zoom={zoom} 
    className={className} 
    showShadow={showShadow} 
    debugMode={debugMode}
  >
    {children}
  </LegacyMultiPageContainer>;
};

// 传统的分页组件（保持向后兼容）
const LegacyMultiPageContainer = ({ children, zoom = 1, className = '', showShadow = true, debugMode = false }: {
  children?: ReactNode;
  zoom?: number;
  className?: string;
  showShadow?: boolean;
  debugMode?: boolean;
}) => {
  // 这里保留原有的逻辑作为回退方案，但添加了改进的CSS来减少内容切断
  return (
    <div className="multi-page-a4-wrapper">
      <div className={`multi-page-container ${className}`}>
        <div className="pages-container">
          <div className="a4-page">
            <div
              className="a4-container legacy-pagination"
              style={{
                width: `${A4_CONFIG.page.width}px`,
                height: `${A4_CONFIG.page.height}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                boxShadow: showShadow 
                  ? '0 4px 12px rgba(0, 0, 0, 0.15)' 
                  : 'none',
          }}
        >
          <div 
            className="a4-content"
            style={{
              width: `${A4_CONFIG.content.width}px`,
              height: `${A4_CONFIG.content.height}px`,
              margin: '48px',
              position: 'relative',
                  overflow: debugMode ? 'visible' : 'hidden',
              }}
            >
              {children}
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>
    );
};
