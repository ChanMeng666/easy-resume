# Easy Resume - Project Structure

## 📁 新的项目架构

### 路由结构
```
/                    → 营销首页（Landing Page）
/templates           → 模板展示页（Template Gallery）
/editor              → 简历编辑器（Resume Editor）
```

### 目录结构
```
src/
├── app/
│   ├── page.tsx              # 营销首页
│   ├── editor/
│   │   └── page.tsx          # 简历编辑器
│   └── templates/
│       └── page.tsx          # 模板展示页
│
├── templates/                 # 模板系统（新增）
│   ├── types.ts              # 模板类型定义
│   ├── registry.ts           # 模板注册表
│   ├── two-column/           # 双栏模板
│   │   ├── index.ts
│   │   ├── metadata.ts
│   │   └── generator.ts
│   ├── modern-cv/            # 现代简约模板
│   │   ├── index.ts
│   │   ├── metadata.ts
│   │   └── generator.ts
│   └── classic/              # 经典学术模板
│       ├── index.ts
│       ├── metadata.ts
│       └── generator.ts
│
├── components/
│   ├── shared/               # 共享组件（新增）
│   │   ├── Navbar.tsx        # 导航栏
│   │   └── SimpleFooter.tsx  # 简化页脚
│   ├── editor/               # 编辑器组件
│   │   ├── TemplateSelector.tsx  # 模板选择器（新增）
│   │   ├── ResumeEditor.tsx
│   │   └── sections/
│   ├── preview/              # 预览组件
│   ├── template/             # 模板组件
│   └── layout/               # 布局组件
│
├── lib/
│   ├── latex/                # LaTeX 生成
│   ├── validation/           # 数据验证
│   └── utils.ts
│
└── hooks/                    # React Hooks

```

## 🎨 模板系统架构

### 核心概念

#### 1. 模板接口定义
```typescript
interface Template {
  metadata: TemplateMetadata;  // 模板元数据
  generator: TemplateGenerator; // LaTeX 生成函数
}

interface TemplateMetadata {
  id: string;                  // 唯一标识
  name: string;                // 模板名称
  description: string;         // 描述
  category: TemplateCategory;  // 类别
  tags: string[];             // 标签
  isPremium: boolean;         // 是否付费
  previewImage: string;       // 预览图
}
```

#### 2. 模板注册表
- **单例模式**：`templateRegistry` 作为全局注册表
- **便捷函数**：
  - `getAllTemplates()` - 获取所有模板
  - `getTemplateById(id)` - 根据 ID 获取模板
  - `getFreeTemplates()` - 获取免费模板
  - `getPremiumTemplates()` - 获取付费模板

#### 3. 如何添加新模板

**步骤 1：创建模板目录**
```bash
mkdir -p src/templates/your-template
```

**步骤 2：创建元数据文件** (`metadata.ts`)
```typescript
import { TemplateMetadata } from '../types';

export const yourTemplateMetadata: TemplateMetadata = {
  id: 'your-template',
  name: 'Your Template Name',
  description: '模板描述',
  category: 'tech', // 'tech' | 'academic' | 'business' | 'creative'
  tags: ['标签1', '标签2'],
  isPremium: false,
  previewImage: '/templates/your-template-preview.png',
};
```

**步骤 3：创建生成器函数** (`generator.ts`)
```typescript
import { ResumeData } from '@/lib/validation/schema';

export function generateYourTemplate(data: ResumeData): string {
  // 实现 LaTeX 代码生成逻辑
  return `
    \\documentclass[11pt,a4paper]{article}
    % 你的 LaTeX 代码
  `;
}
```

**步骤 4：创建入口文件** (`index.ts`)
```typescript
import { Template } from '../types';
import { yourTemplateMetadata } from './metadata';
import { generateYourTemplate } from './generator';

const yourTemplate: Template = {
  metadata: yourTemplateMetadata,
  generator: generateYourTemplate,
};

export default yourTemplate;
```

**步骤 5：注册模板** (在 `registry.ts`)
```typescript
import yourTemplate from './your-template';

constructor() {
  this.register(twoColumnTemplate);
  this.register(modernCvTemplate);
  this.register(classicTemplate);
  this.register(yourTemplate); // 添加你的模板
}
```

## 🚀 页面功能

### 营销首页 (`/`)
- **Hero Section**：价值主张和主 CTA
- **Features**：4 个核心特性展示
- **Template Gallery**：展示前 3 个模板
- **Stats**：统计数据展示
- **Final CTA**：底部行动号召

### 模板展示页 (`/templates`)
- **模板列表**：显示所有已注册模板
- **筛选功能**：按类别筛选（未来可扩展）
- **实时数据**：从模板注册表读取

### 编辑器页面 (`/editor`)
- **模板选择器**：
  - 桌面版：顶部导航栏显示
  - 移动版：编辑区域右上角显示
- **URL 参数支持**：`/editor?template=xxx`
- **实时切换**：选择模板后实时生成对应 LaTeX 代码

## 🔧 技术细节

### 模板切换逻辑
```typescript
// 编辑器页面
const [selectedTemplateId, setSelectedTemplateId] = useState(
  urlTemplateId || DEFAULT_TEMPLATE_ID
);

const latexCode = useMemo(() => {
  const template = getTemplateById(selectedTemplateId);
  return template?.generator(currentData) || '';
}, [currentData, selectedTemplateId]);
```

### 数据流
1. 用户在编辑器修改简历数据 (`ResumeData`)
2. 数据变化触发 `useMemo` 重新计算
3. 从注册表获取当前选中的模板
4. 调用模板的 `generator` 函数生成 LaTeX
5. LaTeX 代码显示在预览区域

## 📊 当前模板列表

| ID | 名称 | 类别 | 描述 | 状态 |
|---|---|---|---|---|
| `two-column` | Two-Column Layout | tech | 双栏布局（60/40） | ✅ 免费 |
| `modern-cv` | Modern CV | tech | 现代简约单栏 | ✅ 免费 |
| `classic` | Classic Academic | academic | 经典学术风格 | ✅ 免费 |

## 🎯 设计原则

1. **易于扩展**：添加新模板只需 4 个文件
2. **类型安全**：TypeScript 完整类型定义
3. **解耦设计**：模板独立，互不影响
4. **统一接口**：所有模板遵循相同接口
5. **轻量实现**：纯前端，无需后端

## 🔜 未来扩展建议

### 模板功能
- [ ] 添加模板预览图片
- [ ] 实现模板筛选功能
- [ ] 添加模板评分系统
- [ ] 支持用户自定义模板

### 编辑器增强
- [ ] 模板参数配置（颜色、字体等）
- [ ] 实时 PDF 预览（集成 LaTeX 编译）
- [ ] 模板对比功能
- [ ] 导出为多种格式

### 商业化
- [ ] 付费模板系统
- [ ] 用户账户系统
- [ ] 云端保存功能
- [ ] 团队协作功能

## 📝 使用指南

### 用户流程
1. 访问首页 `/` 浏览特性
2. 点击"浏览模板" → `/templates` 查看所有模板
3. 选择模板 → 跳转编辑器 `/editor?template=xxx`
4. 编辑简历内容
5. 切换模板（可选）
6. 导出到 Overleaf 或下载 .tex 文件

### 开发者流程
1. 创建新模板目录和文件
2. 实现 LaTeX 生成逻辑
3. 在 `registry.ts` 注册模板
4. 测试模板生成
5. 提交代码

## 🛠️ 维护建议

### 代码组织
- ✅ 每个模板独立目录
- ✅ 统一的文件命名
- ✅ 完整的类型定义
- ✅ 清晰的注释

### 测试要点
- 模板生成是否正常
- URL 参数是否正确解析
- 模板切换是否流畅
- 响应式布局是否正常

### 性能优化
- 使用 `useMemo` 避免重复生成
- 模板按需加载（未来可实现）
- 图片懒加载
- Code splitting

---

**创建时间**: 2025-01-05
**架构版本**: v2.0
**维护者**: Easy Resume Team
