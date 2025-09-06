// A4布局配置 - 基于96 DPI标准

export const A4_CONFIG = {
  // A4纸张尺寸 (像素)
  page: {
    width: 794,    // 210mm at 96 DPI
    height: 1123,  // 297mm at 96 DPI  
    widthMm: 210,
    heightMm: 297,
  },
  
  // 打印边距 (像素)
  margin: {
    top: 48,       // 0.5 inch
    right: 48,     // 0.5 inch
    bottom: 48,    // 0.5 inch
    left: 48,      // 0.5 inch
  },
  
  // 内容区域 (像素)
  content: {
    width: 698,    // 794 - 48*2
    height: 1027,  // 1123 - 48*2
  },
  
  // 字体大小标准 (pt)
  fontSize: {
    name: 18,           // 姓名
    position: 14,       // 职位标题  
    sectionTitle: 12,   // 区块标题
    body: 11,          // 正文内容
    caption: 10,       // 辅助信息
    small: 9,          // 小字体
  },
  
  // 行高标准
  lineHeight: {
    tight: 1.2,     // 紧凑行高
    normal: 1.4,    // 正常行高
    relaxed: 1.6,   // 宽松行高
  },
  
  // 间距标准 (像素)
  spacing: {
    section: 24,        // 区块间距
    subsection: 16,     // 子区块间距
    paragraph: 12,      // 段落间距
    item: 8,           // 列表项间距
    line: 4,           // 行间距
  },
  
  // 布局配置
  layout: {
    columns: {
      left: '60%',      // 左栏宽度 (主要内容)
      right: '38%',     // 右栏宽度 (辅助信息)
      gap: '2%',        // 栏间距
    },
    header: {
      height: 120,      // 头部高度
    },
  },
  
  // 颜色配置 (A4打印优化)
  colors: {
    primary: '#1f2937',     // 深灰色 (适合打印)
    secondary: '#4b5563',   // 中灰色
    accent: '#2563eb',      // 蓝色强调
    text: '#111827',        // 主文本
    textLight: '#6b7280',   // 浅文本
    border: '#e5e7eb',      // 边框色
    background: '#ffffff',  // 背景色
  },
  
  // 缩放级别
  zoomLevels: [0.5, 0.75, 1, 1.25, 1.5] as const,
  defaultZoom: 1,
} as const;

// 响应式断点 (仅用于A4预览的适配)
export const A4_BREAKPOINTS = {
  mobile: 480,
  tablet: 768, 
  desktop: 1024,
  wide: 1400,
} as const;

// A4尺寸计算工具函数
export const a4Utils = {
  // 毫米转像素 (96 DPI)
  mmToPx: (mm: number): number => Math.round((mm * 96) / 25.4),
  
  // 像素转毫米 
  pxToMm: (px: number): number => Math.round((px * 25.4) / 96 * 100) / 100,
  
  // 点数转像素 (96 DPI)
  ptToPx: (pt: number): number => Math.round((pt * 96) / 72),
  
  // 像素转点数
  pxToPt: (px: number): number => Math.round((px * 72) / 96 * 100) / 100,
  
  // 检查内容是否适合A4页面
  fitsInA4: (contentHeight: number): boolean => {
    return contentHeight <= A4_CONFIG.content.height;
  },
  
  // 计算需要的页数
  calculatePages: (contentHeight: number): number => {
    return Math.ceil(contentHeight / A4_CONFIG.content.height);
  },
  
  // 获取缩放后的A4尺寸
  getScaledSize: (zoom: number) => ({
    width: A4_CONFIG.page.width * zoom,
    height: A4_CONFIG.page.height * zoom,
  }),
};
