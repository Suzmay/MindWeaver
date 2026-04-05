// Iconify API 服务
// 文档: https://iconify.design/docs/api/

export interface IconifySearchResult {
  icons: string[];
  total: number;
  limit: number;
  start: number;
  collections?: Record<string, IconifyCollection>;
}

export interface IconifyCollection {
  name: string;
  total: number;
  author: {
    name: string;
    url?: string;
  };
  license: {
    title: string;
    spdx?: string;
    url?: string;
  };
  samples?: string[];
  height?: number | number[];
  displayHeight?: number;
  category?: string;
  palette?: boolean;
}

export interface IconifyIconData {
  prefix: string;
  name: string;
  body: string;
  width?: number;
  height?: number;
}

class IconifyService {
  private baseUrl = 'https://api.iconify.design';

  // 搜索图标
  async searchIcons(query: string, limit: number = 32): Promise<IconifySearchResult> {
    if (!query.trim()) {
      return { icons: [], total: 0, limit, start: 0 };
    }

    try {
      // Iconify 搜索 API: https://api.iconify.design/search?query={keyword}
      const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}&limit=${limit}`;
      console.log('Iconify API URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Iconify API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Iconify API response:', data);
      
      return data;
    } catch (error) {
      console.error('Iconify search error:', error);
      return { icons: [], total: 0, limit, start: 0 };
    }
  }

  // 获取图标数据
  async getIcon(iconName: string): Promise<IconifyIconData | null> {
    try {
      // 解析图标名称，格式为 "prefix:name"
      const [prefix, name] = iconName.split(':');
      
      // Iconify API 格式: https://api.iconify.design/{prefix}.json?icons={name}
      const url = `${this.baseUrl}/${prefix}.json?icons=${name}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Iconify API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 检查是否有别名映射
      let actualName = name;
      if (data.aliases && data.aliases[name]) {
        actualName = data.aliases[name].parent;
      }
      
      // 获取图标数据
      const iconData = data.icons[actualName];
      if (!iconData) {
        throw new Error(`Icon not found: ${iconName}`);
      }
      
      return {
        prefix,
        name,
        body: iconData.body,
        width: data.width || iconData.width,
        height: data.height || iconData.height,
      };
    } catch (error) {
      console.error('Iconify get icon error:', error);
      return null;
    }
  }

  // 获取图标的 SVG URL
  getIconSvgUrl(iconName: string): string {
    // Iconify API 格式: https://api.iconify.design/{prefix}/{name}.svg
    const [prefix, name] = iconName.split(':');
    return `${this.baseUrl}/${prefix}/${name}.svg`;
  }

  // 生成 SVG 字符串
  generateSvg(iconData: IconifyIconData): string {
    const width = iconData.width || 24;
    const height = iconData.height || 24;
    
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${iconData.body}</svg>`;
  }
}

// 导出单例实例
export const iconifyService = new IconifyService();
