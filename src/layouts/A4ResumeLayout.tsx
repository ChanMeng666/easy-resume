'use client';

import { ResumeData } from '@/data/resume';

// A4专用组件
import { A4Header } from './A4Header';
import { A4Summary } from './A4Summary';
import { A4Work } from './A4Work';
import { A4Projects } from './A4Projects';
import { A4Education } from './A4Education';
import { A4Skills } from './A4Skills';
import { A4Achievements } from './A4Achievements';
import { A4Certifications } from './A4Certifications';

interface A4ResumeLayoutProps {
  resumeData: ResumeData;
}

export function A4ResumeLayout({ resumeData }: A4ResumeLayoutProps) {
  return (
    <div className="a4-layout">
      {/* 头部 - 横跨全宽 */}
      <div className="a4-header">
        <A4Header basics={resumeData.basics} />
      </div>

      {/* 简介 - 横跨全宽 */}
      {resumeData.basics.summary && (
        <div className="a4-summary">
          <A4Summary summary={resumeData.basics.summary} />
        </div>
      )}

      {/* 主体内容 - 双栏布局 */}
      <div className="a4-grid">
        {/* 左栏 - 主要内容 */}
        <div className="a4-left-column">
          <A4Work work={resumeData.work} />
          <A4Projects projects={resumeData.projects} />
        </div>

        {/* 右栏 - 辅助信息 */}
        <div className="a4-right-column">
          <A4Education education={resumeData.education} />
          <A4Skills skills={resumeData.skills} />
          <A4Achievements achievements={resumeData.achievements} />
          <A4Certifications certifications={resumeData.certifications} />
        </div>
      </div>
    </div>
  );
}
