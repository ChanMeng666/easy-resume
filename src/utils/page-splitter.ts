import { A4_CONFIG } from '@/config/a4-settings';
import { ResumeData } from '@/data/resume';

// Interface for page content distribution - 支持continuation模式
export interface PageContent {
  pageNumber: number;
  header?: ResumeData['basics']; // 头部信息（仅第一页）
  summary?: string; // 简介（仅第一页）
  leftColumn: {
    work: ResumeData['work'];
    projects: ResumeData['projects'];
    workContinuation?: boolean; // 标记工作经历是否为继续显示
    projectsContinuation?: boolean; // 标记项目是否为继续显示
  };
  rightColumn: {
    education: ResumeData['education'];
    skills: ResumeData['skills'];
    achievements: ResumeData['achievements'];
    certifications: ResumeData['certifications'];
    educationContinuation?: boolean; // 标记教育是否为继续显示
    skillsContinuation?: boolean; // 标记技能是否为继续显示
    achievementsContinuation?: boolean; // 标记成就是否为继续显示
    certificationsContinuation?: boolean; // 标记证书是否为继续显示
  };
}

// 智能内容单元接口，用于精确分页
export interface ContentUnit {
  type: 'header' | 'summary' | 'work-item' | 'project-item' | 'section-title' | 'education-section' | 'skills-section' | 'achievements-section' | 'certifications-section';
  height: number;
  data: unknown;
  breakable: boolean; // 是否可以被分割
  priority: number; // 优先级，用于决定分页策略
}

// 更精确的高度估算函数
export const HEIGHT_ESTIMATES = {
  header: 120,
  summary: (content: string) => {
    // 更精确的简介高度估算，考虑实际字符宽度和换行
    const fullWidth = 698; // A4内容宽度
    const charWidth = 11; // 11pt字体的平均字符宽度
    const lineHeight = 22; // 1.4倍行高 * 16px基础字体大小
    const charsPerLine = Math.floor(fullWidth / charWidth);
    const lines = Math.ceil(content.length / charsPerLine);
    return Math.max(lineHeight * lines + 24, 46); // 至少两行的高度，加上上下边距
  },
  sectionTitle: 36,
  workItem: (workItem: ResumeData['work'][0]) => {
    let baseHeight = 90; // 基础信息高度（公司、职位、日期等）包含更多间距
    // 更精确计算每个highlight的高度，考虑文字长度和换行
    if (workItem.highlights && workItem.highlights.length > 0) {
      const leftColumnWidth = 418; // 60% of 698px
      const charWidth = 10.5; // 11pt字体
      const lineHeight = 22; // 1.4倍行高
      
      workItem.highlights.forEach(highlight => {
        const charsPerLine = Math.floor((leftColumnWidth - 12) / charWidth); // 减去padding
        const lines = Math.ceil(highlight.length / charsPerLine);
        baseHeight += Math.max(lines * lineHeight + 4, 22); // 每个highlight至少一行高度
      });
    }
    return baseHeight + 16; // 额外的下边距
  },
  projectItem: (projectItem: ResumeData['projects'][0]) => {
    let baseHeight = 95; // 项目名称、描述和URL
    // 考虑描述文字的换行
    if (projectItem.description) {
      const leftColumnWidth = 418; // 60% of 698px  
      const charWidth = 10.5;
      const lineHeight = 22;
      const charsPerLine = Math.floor(leftColumnWidth / charWidth);
      const descriptionLines = Math.ceil(projectItem.description.length / charsPerLine);
      baseHeight += (descriptionLines - 1) * lineHeight; // 第一行已包含在baseHeight中
    }
    
    if (projectItem.highlights && projectItem.highlights.length > 0) {
      const leftColumnWidth = 418;
      const charWidth = 10.5;
      const lineHeight = 22;
      
      projectItem.highlights.forEach(highlight => {
        const charsPerLine = Math.floor((leftColumnWidth - 12) / charWidth);
        const lines = Math.ceil(highlight.length / charsPerLine);
        baseHeight += Math.max(lines * lineHeight + 4, 22);
      });
    }
    return baseHeight + 16;
  },
  educationItem: 60,
  skillGroup: (skillGroup: ResumeData['skills'][0]) => {
    const tagCount = skillGroup.keywords.length;
    // 更准确的技能标签高度估算
    // 考虑标签文字长度和换行，每个标签平均宽度约60px，右栏宽度约265px
    let totalTagWidth = 0;
    skillGroup.keywords.forEach(keyword => {
      // 每个字符约8px，加上padding和margin约20px
      totalTagWidth += (keyword.length * 8) + 20;
    });
    
    const rightColumnWidth = 265; // 38% of 698px
    const lines = Math.ceil(totalTagWidth / rightColumnWidth);
    const adjustedLines = Math.max(1, Math.min(lines, Math.ceil(tagCount / 4))); // 每行最少1个，最多4个标签
    
    return 28 + (adjustedLines * 28) + 8; // 类别标题28px + 标签行28px + 底部间距8px
  },
  achievementItem: 20,
  certificationItem: 18,
  pageMargin: 48,
} as const;

// 细粒度内容分页：像Word/Google Docs一样精细分割内容
function intelligentContentSplit(resumeData: ResumeData, firstPageAvailableHeight: number, otherPageAvailableHeight: number): PageContent[] {
  
  // 更细粒度的内容单元定义
  interface IntelligentContentUnit {
    id: string;
    type: 'section-title' | 'work-header' | 'work-highlight' | 'project-header' | 'project-highlight' | 
          'education-item' | 'skill-group' | 'achievement-item' | 'certification-item';
    sectionType: 'work' | 'project' | 'education' | 'skills' | 'achievements' | 'certifications';
    data: unknown;
    height: number;
    column: 'left' | 'right';
    breakable: boolean; // 是否可以被分页打断
    parentId?: string; // 父级内容ID，用于关联
  }
  
  const contentUnits: IntelligentContentUnit[] = [];
  let unitIdCounter = 0;
  
  // 生成唯一ID
  const generateId = () => `unit_${++unitIdCounter}`;
  
  // 处理工作经历 - 拆分成更细的单元
  if (resumeData.work && resumeData.work.length > 0) {
    // 添加Work section标题
    contentUnits.push({
      id: generateId(),
      type: 'section-title',
      sectionType: 'work',
      data: { title: 'Experience' },
      height: HEIGHT_ESTIMATES.sectionTitle,
      column: 'left',
      breakable: false
    });
    
    resumeData.work.forEach((workItem, workIndex) => {
      const workId = generateId();
      
      // 工作基本信息（公司、职位、时间）- 不可分割
      contentUnits.push({
        id: workId,
        type: 'work-header',
        sectionType: 'work',
        data: workItem,
        height: 85, // 基本信息固定高度
        column: 'left',
        breakable: false
      });
      
      // 每个highlight作为独立单元 - 可分割
      if (workItem.highlights && workItem.highlights.length > 0) {
        workItem.highlights.forEach((highlight, highlightIndex) => {
          const leftColumnWidth = 418; // 60% of 698px
          const charWidth = 10.5;
          const lineHeight = 22;
          const charsPerLine = Math.floor((leftColumnWidth - 12) / charWidth);
          const lines = Math.ceil(highlight.length / charsPerLine);
          const highlightHeight = Math.max(lines * lineHeight + 4, 22);
          
          contentUnits.push({
            id: generateId(),
            type: 'work-highlight',
            sectionType: 'work',
            data: { highlight, workIndex, highlightIndex },
            height: highlightHeight,
            column: 'left',
            breakable: false, // highlight作为单元不再分割
            parentId: workId
          });
        });
      }
    });
  }

  // 处理项目经历 - 拆分成更细的单元
  if (resumeData.projects && resumeData.projects.length > 0) {
    // 添加Projects section标题
    contentUnits.push({
      id: generateId(),
      type: 'section-title',
      sectionType: 'project',
      data: { title: 'Projects' },
      height: HEIGHT_ESTIMATES.sectionTitle,
      column: 'left',
      breakable: false
    });
    
    resumeData.projects.forEach((project, projectIndex) => {
      const projectId = generateId();
      
      // 项目基本信息（名称、描述、URL）
      let projectHeaderHeight = 75; // 基础高度
      if (project.description) {
        const leftColumnWidth = 418;
        const charWidth = 10.5;
        const lineHeight = 22;
        const charsPerLine = Math.floor(leftColumnWidth / charWidth);
        const descriptionLines = Math.ceil(project.description.length / charsPerLine);
        projectHeaderHeight += (descriptionLines - 1) * lineHeight;
      }
      
      contentUnits.push({
        id: projectId,
        type: 'project-header',
        sectionType: 'project',
        data: project,
        height: projectHeaderHeight,
        column: 'left',
        breakable: false
      });
      
      // 每个project highlight作为独立单元
      if (project.highlights && project.highlights.length > 0) {
        project.highlights.forEach((highlight, highlightIndex) => {
          const leftColumnWidth = 418;
          const charWidth = 10.5;
          const lineHeight = 22;
          const charsPerLine = Math.floor((leftColumnWidth - 12) / charWidth);
          const lines = Math.ceil(highlight.length / charsPerLine);
          const highlightHeight = Math.max(lines * lineHeight + 4, 22);
          
          contentUnits.push({
            id: generateId(),
            type: 'project-highlight',
            sectionType: 'project',
            data: { highlight, projectIndex, highlightIndex },
            height: highlightHeight,
            column: 'left',
            breakable: false,
            parentId: projectId
          });
        });
      }
    });
  }

  // 处理教育经历 - 每个条目作为独立单元
  if (resumeData.education && resumeData.education.length > 0) {
    contentUnits.push({
      id: generateId(),
      type: 'section-title',
      sectionType: 'education',
      data: { title: 'Education' },
      height: HEIGHT_ESTIMATES.sectionTitle,
      column: 'right',
      breakable: false
    });
    
    resumeData.education.forEach((edu, index) => {
      contentUnits.push({
        id: generateId(),
        type: 'education-item',
        sectionType: 'education',
        data: { ...edu, index },
        height: HEIGHT_ESTIMATES.educationItem,
        column: 'right',
        breakable: false
      });
    });
  }
  
  // 处理技能 - 每个技能组作为独立单元
  if (resumeData.skills && resumeData.skills.length > 0) {
    contentUnits.push({
      id: generateId(),
      type: 'section-title',
      sectionType: 'skills',
      data: { title: 'Skills' },
      height: HEIGHT_ESTIMATES.sectionTitle,
      column: 'right',
      breakable: false
    });
    
    resumeData.skills.forEach((skill, index) => {
      contentUnits.push({
        id: generateId(),
        type: 'skill-group',
        sectionType: 'skills',
        data: { ...skill, index },
        height: HEIGHT_ESTIMATES.skillGroup(skill),
        column: 'right',
        breakable: false
      });
    });
  }
  
  // 处理成就 - 每个条目作为独立单元
  if (resumeData.achievements && resumeData.achievements.length > 0) {
    contentUnits.push({
      id: generateId(),
      type: 'section-title',
      sectionType: 'achievements',
      data: { title: 'Achievements' },
      height: HEIGHT_ESTIMATES.sectionTitle,
      column: 'right',
      breakable: false
    });
    
    resumeData.achievements.forEach((achievement, index) => {
      contentUnits.push({
        id: generateId(),
        type: 'achievement-item',
        sectionType: 'achievements',
        data: { achievement, index },
        height: HEIGHT_ESTIMATES.achievementItem,
        column: 'right',
        breakable: false
      });
    });
  }
  
  // 处理证书 - 每个条目作为独立单元
  if (resumeData.certifications && resumeData.certifications.length > 0) {
    contentUnits.push({
      id: generateId(),
      type: 'section-title',
      sectionType: 'certifications',
      data: { title: 'Certifications' },
      height: HEIGHT_ESTIMATES.sectionTitle,
      column: 'right',
      breakable: false
    });
    
    resumeData.certifications.forEach((cert, index) => {
      contentUnits.push({
        id: generateId(),
        type: 'certification-item',
        sectionType: 'certifications',
        data: { certification: cert, index },
        height: HEIGHT_ESTIMATES.certificationItem,
        column: 'right',
        breakable: false
      });
    });
  }
  
  // 全新的真正独立双栏分页算法
  const leftColumnQueue = contentUnits.filter(unit => unit.column === 'left');
  const rightColumnQueue = contentUnits.filter(unit => unit.column === 'right');
  
  // 全局跟踪已显示的section标题 
  const globalSectionStates = new Map<string, boolean>();
  
  // 独立的左右栏页面索引
  let leftPageIndex = 0;
  let rightPageIndex = 0;
  
  // 存储所有页面
  const allPages = new Map<number, PageContent>();
  
  // 处理左栏内容 - 完全独立
  while (leftColumnQueue.length > 0) {
    const currentPage = leftPageIndex;
    const isFirstPage = currentPage === 0;
    const availableHeight = isFirstPage ? firstPageAvailableHeight : otherPageAvailableHeight;
    
    // 获取或创建页面
    if (!allPages.has(currentPage)) {
      allPages.set(currentPage, {
        pageNumber: currentPage + 1,
        leftColumn: { 
          work: [], 
          projects: [], 
          workContinuation: false, 
          projectsContinuation: false 
        },
        rightColumn: { 
          education: [], 
          skills: [], 
          achievements: [], 
          certifications: [],
          educationContinuation: false,
          skillsContinuation: false,
          achievementsContinuation: false,
          certificationsContinuation: false
        }
      });
      
      // 第一页添加头部和简介
      if (isFirstPage) {
        allPages.get(currentPage)!.header = resumeData.basics;
        allPages.get(currentPage)!.summary = resumeData.basics.summary;
      }
    }
    
    const page = allPages.get(currentPage)!;
    let leftColumnHeight = 0;
    
    // 填充左栏内容 - 真正独立的左栏算法
    while (leftColumnQueue.length > 0 && leftColumnHeight < availableHeight * 0.95) {
      const unit = leftColumnQueue[0];
      
      if (leftColumnHeight + unit.height <= availableHeight) {
        leftColumnQueue.shift(); // 移除已处理的单元
        
        // 处理不同类型的内容单元
        switch (unit.type) {
          case 'section-title':
            // Section标题：只在全局第一次出现时添加
            if (!globalSectionStates.has(unit.sectionType)) {
              globalSectionStates.set(unit.sectionType, true);
              leftColumnHeight += unit.height;
              if (process.env.NODE_ENV === 'development') {
                console.log(`左栏页面 ${currentPage + 1} 首次显示section标题: ${unit.sectionType}`);
              }
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.log(`左栏页面 ${currentPage + 1} 跳过重复section标题: ${unit.sectionType}`);
              }
            }
            break;
            
          case 'work-header':
            const workItem = reconstructWorkItem(unit.data, leftColumnQueue, unit.id);
            page.leftColumn.work.push(workItem);
            
            // 检查是否为continuation
            if (globalSectionStates.has('work') && page.leftColumn.work.length === 1 && currentPage > 0) {
              let hasWorkInPreviousPages = false;
              for (const [pageNum, prevPage] of allPages.entries()) {
                if (pageNum < currentPage && prevPage.leftColumn.work && prevPage.leftColumn.work.length > 0) {
                  hasWorkInPreviousPages = true;
                  break;
                }
              }
              if (hasWorkInPreviousPages) {
                page.leftColumn.workContinuation = true;
              }
            }
            
            leftColumnHeight += unit.height;
            if (process.env.NODE_ENV === 'development') {
              console.log(`左栏页面 ${currentPage + 1} 添加work-header: ${workItem.company}`);
            }
            break;
            
          case 'work-highlight':
            const lastWork = page.leftColumn.work[page.leftColumn.work.length - 1];
            if (lastWork && !lastWork.highlights) {
              lastWork.highlights = [];
            }
            if (lastWork) {
              lastWork.highlights.push((unit.data as { highlight: string }).highlight);
            }
            leftColumnHeight += unit.height;
            if (process.env.NODE_ENV === 'development') {
              console.log(`左栏页面 ${currentPage + 1} 添加work-highlight`);
            }
            break;
            
          case 'project-header':
            const projectItem = reconstructProjectItem(unit.data, leftColumnQueue, unit.id);
            page.leftColumn.projects.push(projectItem);
            
            if (globalSectionStates.has('project') && page.leftColumn.projects.length === 1 && currentPage > 0) {
              let hasProjectsInPreviousPages = false;
              for (const [pageNum, prevPage] of allPages.entries()) {
                if (pageNum < currentPage && prevPage.leftColumn.projects && prevPage.leftColumn.projects.length > 0) {
                  hasProjectsInPreviousPages = true;
                  break;
                }
              }
              if (hasProjectsInPreviousPages) {
                page.leftColumn.projectsContinuation = true;
              }
            }
            
            leftColumnHeight += unit.height;
            if (process.env.NODE_ENV === 'development') {
              console.log(`左栏页面 ${currentPage + 1} 添加project-header: ${projectItem.name}`);
            }
            break;
            
          case 'project-highlight':
            const lastProject = page.leftColumn.projects[page.leftColumn.projects.length - 1];
            if (lastProject && !lastProject.highlights) {
              lastProject.highlights = [];
            }
            if (lastProject) {
              lastProject.highlights.push((unit.data as { highlight: string }).highlight);
            }
            leftColumnHeight += unit.height;
            if (process.env.NODE_ENV === 'development') {
              console.log(`左栏页面 ${currentPage + 1} 添加project-highlight`);
            }
            break;
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`左栏页面 ${currentPage + 1} 无法容纳 ${unit.type} (需要${unit.height}px, 剩余${availableHeight - leftColumnHeight}px) - 转到下一页`);
        }
        break; // 当前页面左栏已满，转到下一页
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`左栏页面 ${currentPage + 1} 完成 - 高度: ${leftColumnHeight}px/${availableHeight}px, 剩余队列: ${leftColumnQueue.length}`);
    }
    
    leftPageIndex++; // 移动到下一页
    
    // 防止无限循环
    if (leftPageIndex > 10) {
      console.warn('左栏分页超过最大页数限制');
      break;
    }
  }
    
  // 处理右栏内容 - 完全独立
  while (rightColumnQueue.length > 0) {
    const currentPage = rightPageIndex;
    const isFirstPage = currentPage === 0;
    const availableHeight = isFirstPage ? firstPageAvailableHeight : otherPageAvailableHeight;
    
    // 获取或创建页面
    if (!allPages.has(currentPage)) {
      allPages.set(currentPage, {
        pageNumber: currentPage + 1,
        leftColumn: { 
          work: [], 
          projects: [], 
          workContinuation: false, 
          projectsContinuation: false 
        },
        rightColumn: { 
          education: [], 
          skills: [], 
          achievements: [], 
          certifications: [],
          educationContinuation: false,
          skillsContinuation: false,
          achievementsContinuation: false,
          certificationsContinuation: false
        }
      });
      
      // 第一页添加头部和简介（如果还没有添加）
      if (isFirstPage) {
        allPages.get(currentPage)!.header = resumeData.basics;
        allPages.get(currentPage)!.summary = resumeData.basics.summary;
      }
    }
    
    const page = allPages.get(currentPage)!;
    let rightColumnHeight = 0;
    
    // 填充右栏内容 - 真正独立的右栏算法
    while (rightColumnQueue.length > 0 && rightColumnHeight < availableHeight * 0.95) {
      const unit = rightColumnQueue[0];
      
      if (rightColumnHeight + unit.height <= availableHeight) {
        rightColumnQueue.shift();
        
        switch (unit.type) {
          case 'section-title':
            // Section标题：使用全局状态跟踪
            if (!globalSectionStates.has(unit.sectionType)) {
              globalSectionStates.set(unit.sectionType, true);
              rightColumnHeight += unit.height;
              if (process.env.NODE_ENV === 'development') {
                console.log(`右栏页面 ${currentPage + 1} 首次显示section标题: ${unit.sectionType}`);
              }
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.log(`右栏页面 ${currentPage + 1} 跳过重复section标题: ${unit.sectionType}`);
              }
            }
            break;
            
          case 'education-item':
            if (!page.rightColumn.education) {
              page.rightColumn.education = [];
            }
            page.rightColumn.education.push(unit.data as ResumeData['education'][0]);
            
            // 检查education continuation
            if (globalSectionStates.has('education') && page.rightColumn.education.length === 1 && currentPage > 0) {
              let hasEducationInPreviousPages = false;
              for (const [pageNum, prevPage] of allPages.entries()) {
                if (pageNum < currentPage && prevPage.rightColumn.education && prevPage.rightColumn.education.length > 0) {
                  hasEducationInPreviousPages = true;
                  break;
                }
              }
              if (hasEducationInPreviousPages) {
                page.rightColumn.educationContinuation = true;
              }
            }
            
            rightColumnHeight += unit.height;
            if (process.env.NODE_ENV === 'development') {
              console.log(`右栏页面 ${currentPage + 1} 添加education-item`);
            }
            break;
            
          case 'skill-group':
            if (!page.rightColumn.skills) {
              page.rightColumn.skills = [];
            }
            page.rightColumn.skills.push(unit.data as ResumeData['skills'][0]);
            
            // 检查skills continuation
            if (globalSectionStates.has('skills') && page.rightColumn.skills.length === 1 && currentPage > 0) {
              let hasSkillsInPreviousPages = false;
              for (const [pageNum, prevPage] of allPages.entries()) {
                if (pageNum < currentPage && prevPage.rightColumn.skills && prevPage.rightColumn.skills.length > 0) {
                  hasSkillsInPreviousPages = true;
                  break;
                }
              }
              if (hasSkillsInPreviousPages) {
                page.rightColumn.skillsContinuation = true;
              }
            }
            
            rightColumnHeight += unit.height;
            if (process.env.NODE_ENV === 'development') {
              console.log(`右栏页面 ${currentPage + 1} 添加skill-group`);
            }
            break;
            
          case 'achievement-item':
            if (!page.rightColumn.achievements) {
              page.rightColumn.achievements = [];
            }
            page.rightColumn.achievements.push((unit.data as { achievement: string }).achievement);
            
            // 检查achievements continuation
            if (globalSectionStates.has('achievements') && page.rightColumn.achievements.length === 1 && currentPage > 0) {
              let hasAchievementsInPreviousPages = false;
              for (const [pageNum, prevPage] of allPages.entries()) {
                if (pageNum < currentPage && prevPage.rightColumn.achievements && prevPage.rightColumn.achievements.length > 0) {
                  hasAchievementsInPreviousPages = true;
                  break;
                }
              }
              if (hasAchievementsInPreviousPages) {
                page.rightColumn.achievementsContinuation = true;
              }
            }
            
            rightColumnHeight += unit.height;
            if (process.env.NODE_ENV === 'development') {
              console.log(`右栏页面 ${currentPage + 1} 添加achievement-item`);
            }
            break;
            
          case 'certification-item':
            if (!page.rightColumn.certifications) {
              page.rightColumn.certifications = [];
            }
            page.rightColumn.certifications.push((unit.data as { certification: string }).certification);
            
            // 检查certifications continuation
            if (globalSectionStates.has('certifications') && page.rightColumn.certifications.length === 1 && currentPage > 0) {
              let hasCertificationsInPreviousPages = false;
              for (const [pageNum, prevPage] of allPages.entries()) {
                if (pageNum < currentPage && prevPage.rightColumn.certifications && prevPage.rightColumn.certifications.length > 0) {
                  hasCertificationsInPreviousPages = true;
                  break;
                }
              }
              if (hasCertificationsInPreviousPages) {
                page.rightColumn.certificationsContinuation = true;
              }
            }
            
            rightColumnHeight += unit.height;
            if (process.env.NODE_ENV === 'development') {
              console.log(`右栏页面 ${currentPage + 1} 添加certification-item`);
            }
            break;
        }
        
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`右栏页面 ${currentPage + 1} 无法容纳 ${unit.type} (需要${unit.height}px, 剩余${availableHeight - rightColumnHeight}px) - 转到下一页`);
        }
        break; // 当前页面右栏已满，转到下一页
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`右栏页面 ${currentPage + 1} 完成 - 高度: ${rightColumnHeight}px/${availableHeight}px, 剩余队列: ${rightColumnQueue.length}`);
    }
    
    rightPageIndex++; // 移动到下一页
    
    // 防止无限循环
    if (rightPageIndex > 10) {
      console.warn('右栏分页超过最大页数限制');
      break;
    }
  }
  
  // 将Map转换为数组并排序
  const pages = Array.from(allPages.entries())
    .sort(([a], [b]) => a - b)
    .map(([, page]) => page);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`双栏独立分页完成，共生成 ${pages.length} 页`);
    console.log('全局section状态:', Object.fromEntries(globalSectionStates));
    console.log('最终页面统计:');
    pages.forEach((page, index) => {
      const leftContent = [];
      const rightContent = [];
      if (page.leftColumn.work.length > 0) leftContent.push(`工作:${page.leftColumn.work.length}`);
      if (page.leftColumn.projects.length > 0) leftContent.push(`项目:${page.leftColumn.projects.length}`);
      if (page.rightColumn.education && page.rightColumn.education.length > 0) rightContent.push(`教育:${page.rightColumn.education.length}`);
      if (page.rightColumn.skills && page.rightColumn.skills.length > 0) rightContent.push(`技能:${page.rightColumn.skills.length}`);
      if (page.rightColumn.achievements && page.rightColumn.achievements.length > 0) rightContent.push(`成就:${page.rightColumn.achievements.length}`);
      if (page.rightColumn.certifications && page.rightColumn.certifications.length > 0) rightContent.push(`证书:${page.rightColumn.certifications.length}`);
      console.log(`  页面 ${index + 1}: 左栏[${leftContent.join(', ')}] | 右栏[${rightContent.join(', ')}]`);
    });
  }
  
  return pages;
}

// 重构工作项目 - 预览即将添加的highlights  
function reconstructWorkItem(workData: unknown, queue: { type: string; parentId?: string; data: unknown }[], workId: string): ResumeData['work'][0] {
  const workItem = { ...(workData as ResumeData['work'][0]), highlights: [] };
  
  // 查找属于这个工作的highlights但不移除（让主循环处理）
  const workHighlights = queue.filter(unit => 
    unit.type === 'work-highlight' && unit.parentId === workId
  );
  
  // 只预览第一个highlight，其余的让主循环逐个处理
  if (workHighlights.length > 0) {
    workItem.highlights = []; // 先初始化空数组
  }
  
  return workItem;
}

// 重构项目 - 预览即将添加的highlights
function reconstructProjectItem(projectData: unknown, queue: { type: string; parentId?: string; data: unknown }[], projectId: string): ResumeData['projects'][0] {
  const projectItem = { ...(projectData as ResumeData['projects'][0]), highlights: [] };
  
  const projectHighlights = queue.filter(unit => 
    unit.type === 'project-highlight' && unit.parentId === projectId
  );
  
  if (projectHighlights.length > 0) {
    projectItem.highlights = [];
  }
  
  return projectItem;
}

// 智能分页函数 - 重新设计为保持左右栏布局
export function splitContentIntoPages(resumeData: ResumeData): PageContent[] {
  const maxHeight = A4_CONFIG.content.height - HEIGHT_ESTIMATES.pageMargin;
  
  // 计算第一页头部和简介占用的高度
  let firstPageUsedHeight = 0;
  if (resumeData.basics) {
    firstPageUsedHeight += HEIGHT_ESTIMATES.header;
  }
  if (resumeData.basics.summary) {
    firstPageUsedHeight += HEIGHT_ESTIMATES.summary(resumeData.basics.summary);
  }

  // 计算左右栏可用高度（第一页需要减去头部和简介的高度）
  const firstPageAvailableHeight = maxHeight - firstPageUsedHeight;
  const otherPageAvailableHeight = maxHeight;

  // 使用新的智能分页算法
  return intelligentContentSplit(resumeData, firstPageAvailableHeight, otherPageAvailableHeight);
}

// 优化分页，避免孤立内容和空隙
export function optimizePageBreaks(pages: PageContent[]): PageContent[] {
  if (pages.length <= 1) return pages;

  // 新的智能分页算法已经优化了页面空间利用，这里主要做最后的检查和调整
  const optimizedPages = [...pages];
  
  // 重新编号页面
  optimizedPages.forEach((page, index) => {
    page.pageNumber = index + 1;
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`优化分页完成，总共 ${optimizedPages.length} 页`);
    optimizedPages.forEach((page, index) => {
      const leftItems = (page.leftColumn.work?.length || 0) + (page.leftColumn.projects?.length || 0);
      const rightSections = [
        page.rightColumn.education?.length && 'education',
        page.rightColumn.skills?.length && 'skills', 
        page.rightColumn.achievements?.length && 'achievements',
        page.rightColumn.certifications?.length && 'certifications'
      ].filter(Boolean);
      console.log(`页面 ${index + 1}: 左栏${leftItems}项, 右栏${rightSections.length}部分 [${rightSections.join(', ')}]`);
    });
  }

  return optimizedPages;
}

