'use client';

import { PageContent } from '@/utils/page-splitter';
import { ResumeData } from '@/data/resume';

// 导入布局组件
import { A4Header } from '@/layouts/A4Header';
import { A4Summary } from '@/layouts/A4Summary';

interface FineGrainedPageRendererProps {
  pageContent: PageContent;
  resumeData: ResumeData;
  debugMode?: boolean;
}

export const FineGrainedPageRenderer = ({ pageContent, resumeData, debugMode = false }: FineGrainedPageRendererProps) => {
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
            
            {/* 渲染工作经历 */}
            {leftColumn.work && leftColumn.work.length > 0 && (
              <section className="a4-section">
                {!leftColumn.workContinuation && (
                  <h2 className="a4-section-title">Experience</h2>
                )}
                {debugMode && leftColumn.workContinuation && (
                  <div style={{
                    background: '#ff9800',
                    color: 'white',
                    padding: '2px 6px',
                    fontSize: '10px',
                    borderRadius: '3px',
                    marginBottom: '8px'
                  }}>
                    Experience (续)
                  </div>
                )}
                <div className="a4-section-content">
                  {leftColumn.work.map((job, index) => (
                    <div key={index} className="a4-item">
                      <div className="a4-item-header">
                        <div className="flex-1">
                          <h3 className="a4-item-title">{job.company}</h3>
                          <div className="a4-item-subtitle">{job.position}</div>
                        </div>
                        <div className="a4-item-meta">
                          <div>{job.startDate} - {job.endDate}</div>
                          <div>{job.location}</div>
                          <div className="text-xs">{job.type}</div>
                        </div>
                      </div>
                      
                      {job.highlights && job.highlights.length > 0 && (
                        <ul className="a4-list">
                          {job.highlights.map((highlight, hIndex) => (
                            <li key={hIndex} className="a4-list-item">
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
            
            {/* 渲染项目经历 */}
            {leftColumn.projects && leftColumn.projects.length > 0 && (
              <section className="a4-section">
                {!leftColumn.projectsContinuation && (
                  <h2 className="a4-section-title">Projects</h2>
                )}
                {debugMode && leftColumn.projectsContinuation && (
                  <div style={{
                    background: '#ff9800',
                    color: 'white',
                    padding: '2px 6px',
                    fontSize: '10px',
                    borderRadius: '3px',
                    marginBottom: '8px'
                  }}>
                    Projects (续)
                  </div>
                )}
                <div className="a4-section-content">
                  {leftColumn.projects.map((project, index) => (
                    <div key={index} className="a4-item">
                      <div className="a4-item-header">
                        <h3 className="a4-item-title">{project.name}</h3>
                        {project.url && project.url !== '#' && (
                          <div className="a4-item-meta">
                            <span className="text-xs text-blue-600">
                              {new URL(project.url).hostname}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="a4-item-description">
                        {project.description}
                      </div>
                      
                      {project.highlights && project.highlights.length > 0 && (
                        <ul className="a4-list">
                          {project.highlights.map((highlight, hIndex) => (
                            <li key={hIndex} className="a4-list-item">
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
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
            
            {/* 教育经历 */}
            {rightColumn.education && rightColumn.education.length > 0 && (
              <section className="a4-section">
                {!rightColumn.educationContinuation && (
                  <h2 className="a4-section-title">Education</h2>
                )}
                {debugMode && rightColumn.educationContinuation && (
                  <div style={{
                    background: '#4caf50',
                    color: 'white',
                    padding: '2px 6px',
                    fontSize: '10px',
                    borderRadius: '3px',
                    marginBottom: '8px'
                  }}>
                    Education (续)
                  </div>
                )}
                <div className="a4-section-content">
                  {rightColumn.education.map((edu, index) => (
                    <div key={index} className="a4-item">
                      <h3 className="a4-item-title">{edu.institution}</h3>
                      <div className="a4-item-subtitle">
                        {edu.studyType} in {edu.area}
                      </div>
                      <div className="a4-item-meta">
                        <div>{edu.startDate} - {edu.endDate}</div>
                        <div>{edu.location}</div>
                        {edu.gpa && <div>GPA: {edu.gpa}</div>}
                      </div>
                      {edu.note && (
                        <div className="a4-item-description">{edu.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
            
            {/* 技能 */}
            {rightColumn.skills && rightColumn.skills.length > 0 && (
              <section className="a4-section">
                {!rightColumn.skillsContinuation && (
                  <h2 className="a4-section-title">Skills</h2>
                )}
                {debugMode && rightColumn.skillsContinuation && (
                  <div style={{
                    background: '#4caf50',
                    color: 'white',
                    padding: '2px 6px',
                    fontSize: '10px',
                    borderRadius: '3px',
                    marginBottom: '8px'
                  }}>
                    Skills (续)
                  </div>
                )}
                <div className="a4-section-content">
                  {rightColumn.skills.map((skillGroup, index) => (
                    <div key={index} className="a4-skills-grid">
                      <div className="a4-skill-category">
                        {skillGroup.name}
                      </div>
                      <div className="a4-skill-tags">
                        {skillGroup.keywords.map((keyword, keyIndex) => (
                          <span key={keyIndex} className="a4-skill-tag">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            
            {/* 成就 */}
            {rightColumn.achievements && rightColumn.achievements.length > 0 && (
              <section className="a4-section">
                {!rightColumn.achievementsContinuation && (
                  <h2 className="a4-section-title">Achievements</h2>
                )}
                {debugMode && rightColumn.achievementsContinuation && (
                  <div style={{
                    background: '#4caf50',
                    color: 'white',
                    padding: '2px 6px',
                    fontSize: '10px',
                    borderRadius: '3px',
                    marginBottom: '8px'
                  }}>
                    Achievements (续)
                  </div>
                )}
                <div className="a4-section-content">
                  <ul className="a4-list">
                    {rightColumn.achievements.map((achievement, index) => (
                      <li key={index} className="a4-list-item">
                        {achievement}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
            
            {/* 证书 */}
            {rightColumn.certifications && rightColumn.certifications.length > 0 && (
              <section className="a4-section">
                {!rightColumn.certificationsContinuation && (
                  <h2 className="a4-section-title">Certifications</h2>
                )}
                {debugMode && rightColumn.certificationsContinuation && (
                  <div style={{
                    background: '#4caf50',
                    color: 'white',
                    padding: '2px 6px',
                    fontSize: '10px',
                    borderRadius: '3px',
                    marginBottom: '8px'
                  }}>
                    Certifications (续)
                  </div>
                )}
                <div className="a4-section-content">
                  <ul className="a4-list">
                    {rightColumn.certifications.map((cert, index) => (
                      <li key={index} className="a4-list-item">
                        {cert}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
