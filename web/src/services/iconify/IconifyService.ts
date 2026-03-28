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
      const response = await fetch(`${this.baseUrl}/${iconName}.json`);
      
      if (!response.ok) {
        throw new Error(`Iconify API error: ${response.status}`);
      }
      
      const data = await response.json();
      const [prefix, name] = iconName.split(':');
      
      return {
        prefix,
        name,
        body: data.body,
        width: data.width,
        height: data.height,
      };
    } catch (error) {
      console.error('Iconify get icon error:', error);
      return null;
    }
  }

  // 获取图标的 SVG URL
  getIconSvgUrl(iconName: string): string {
    return `${this.baseUrl}/${iconName}.svg`;
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
