'use client';

import { PageContent } from '@/utils/page-splitter';

// 导入布局组件
import { A4Header } from '@/layouts/A4Header';
import { A4Summary } from '@/layouts/A4Summary';
import { A4Work } from '@/layouts/A4Work';
import { A4Projects } from '@/layouts/A4Projects';
import { A4Education } from '@/layouts/A4Education';
import { A4Skills } from '@/layouts/A4Skills';
import { A4Achievements } from '@/layouts/A4Achievements';
import { A4Certifications } from '@/layouts/A4Certifications';

interface SmartPageRendererProps {
  pageContent: PageContent;
  debugMode?: boolean;
}

export const SmartPageRenderer = ({ pageContent, debugMode = false }: SmartPageRendererProps) => {
  const { header, summary, leftColumn, rightColumn } = pageContent;
  
  // 检查是否有左栏或右栏内容
  const hasLeftColumn = (leftColumn.work && leftColumn.work.length > 0) || 
                       (leftColumn.projects && leftColumn.projects.length > 0);
  const hasRightColumn = (rightColumn.education && rightColumn.education.length > 0) ||
                        (rightColumn.skills && rightColumn.skills.length > 0) ||
                        (rightColumn.achievements && rightColumn.achievements.length > 0) ||
                        (rightColumn.certifications && rightColumn.certifications.length > 0);

  return (
    <div 
      className="smart-page-content" 
      data-debug={debugMode ? 'true' : 'false'}
    >
      {/* 头部信息 - 横跨全宽（仅第一页） */}
      {header && (
        <div className="a4-header">
          <A4Header basics={header} />
        </div>
      )}

      {/* 简介 - 横跨全宽（仅第一页） */}
      {summary && (
        <div className="a4-summary">
          <A4Summary summary={summary} />
        </div>
      )}

      {/* 主体内容 - 双栏布局 */}
      {(hasLeftColumn || hasRightColumn) && (
        <div className="a4-grid">
          {/* 左栏 - 主要内容 */}
          <div className="a4-left-column" style={{
            border: debugMode ? '1px dashed #2196f3' : 'none',
            position: 'relative'
          }}>
            {debugMode && (
              <div style={{
                position: 'absolute',
                top: -20,
                left: 0,
                background: '#2196f3',
                color: 'white',
                padding: '2px 6px',
                fontSize: '10px',
                borderRadius: '3px',
                zIndex: 999
              }}>
                左栏 (60%)
              </div>
            )}
            {leftColumn.work && leftColumn.work.length > 0 && (
              <div 
                className="a4-section-container" 
                data-section-type={`work${leftColumn.workContinuation ? ' (续)' : ''}`}
              >
                <A4Work 
                  work={leftColumn.work} 
                  hideTitle={leftColumn.workContinuation || false}
                />
              </div>
            )}
            
            {leftColumn.projects && leftColumn.projects.length > 0 && (
              <div 
                className="a4-section-container" 
                data-section-type={`projects${leftColumn.projectsContinuation ? ' (续)' : ''}`}
              >
                <A4Projects 
                  projects={leftColumn.projects} 
                  hideTitle={leftColumn.projectsContinuation || false}
                />
              </div>
            )}
          </div>

          {/* 右栏 - 辅助信息 */}
          <div className="a4-right-column" style={{
            border: debugMode ? '1px dashed #4caf50' : 'none',
            position: 'relative'
          }}>
            {debugMode && (
              <div style={{
                position: 'absolute',
                top: -20,
                left: 0,
                background: '#4caf50',
                color: 'white',
                padding: '2px 6px',
                fontSize: '10px',
                borderRadius: '3px',
                zIndex: 999
              }}>
                右栏 (38%)
              </div>
            )}
            {rightColumn.education && rightColumn.education.length > 0 && (
              <div 
                className="a4-section-container" 
                data-section-type={`education${rightColumn.educationContinuation ? ' (续)' : ''}`}
              >
                <A4Education 
                  education={rightColumn.education}
                  hideTitle={rightColumn.educationContinuation || false}
                />
              </div>
            )}
            
            {rightColumn.skills && rightColumn.skills.length > 0 && (
              <div 
                className="a4-section-container" 
                data-section-type={`skills${rightColumn.skillsContinuation ? ' (续)' : ''}`}
              >
                <A4Skills 
                  skills={rightColumn.skills}
                  hideTitle={rightColumn.skillsContinuation || false}
                />
              </div>
            )}
            
            {rightColumn.achievements && rightColumn.achievements.length > 0 && (
              <div 
                className="a4-section-container" 
                data-section-type={`achievements${rightColumn.achievementsContinuation ? ' (续)' : ''}`}
              >
                <A4Achievements 
                  achievements={rightColumn.achievements}
                  hideTitle={rightColumn.achievementsContinuation || false}
                />
              </div>
            )}
            
            {rightColumn.certifications && rightColumn.certifications.length > 0 && (
              <div 
                className="a4-section-container" 
                data-section-type={`certifications${rightColumn.certificationsContinuation ? ' (续)' : ''}`}
              >
                <A4Certifications 
                  certifications={rightColumn.certifications}
                  hideTitle={rightColumn.certificationsContinuation || false}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
