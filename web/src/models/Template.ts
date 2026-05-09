import { Work } from './Work';

export interface ThemeConfig {
  primaryColor: string; // 十六进制颜色值
  secondaryColor: string;
  backgroundColor: string;
  nodeShape: 'rectangle' | 'rounded' | 'circle' | 'diamond' | 'bubble';
  edgeStyle: 'straight' | 'curved' | 'polyline';
  fontFamily: string;
  animationEnabled: boolean;
}

export interface LayoutConfig {
  layoutType: 'mindmap' | 'tree' | 'orgchart' | 'fishbone';
  direction: 'horizontal' | 'vertical' | 'radial';
  levelSpacing: number;
  nodeSpacing: number;
}

export interface Template extends Work {
  templateType: 'basic' | 'business' | 'education' | 'personal';
  isDefault: boolean;
  themeConfig: ThemeConfig;
  layoutConfig: LayoutConfig;
  usageCount: number;
  nodesData?: any[];
  uploader?: string;
  description?: string;
}

export interface TemplateCreateDTO {
  title: string;
  templateType: 'basic' | 'business' | 'education' | 'personal';
  isDefault?: boolean;
  themeConfig: ThemeConfig;
  layoutConfig: LayoutConfig;
  tags?: string[];
  nodesData?: any[];
  uploader?: string;
}

export interface TemplateUpdateDTO {
  title?: string;
  description?: string;
  templateType?: 'basic' | 'business' | 'education' | 'personal';
  themeConfig?: Partial<ThemeConfig>;
  layoutConfig?: Partial<LayoutConfig>;
  tags?: string[];
}
