import { MindMapNode } from '../../models/Work';

export interface ExportOptions {
  format: 'json' | 'markdown' | 'png' | 'svg' | 'mmw';
  includeAssets?: boolean;
  quality?: number;
}

export interface MindWeaverFile {
  version: string;
  title: string;
  createdAt: string;
  exportedAt: string;
  data: {
    nodes: MindMapNode[];
    layout?: any;
    canvasBackground?: string;
  };
}

export class ExportService {
  private static readonly FILE_VERSION = '1.0';
  
  /**
   * 导出为 JSON 格式
   */
  static exportToJson(
    nodes: MindMapNode[],
    title: string,
    layout?: any,
    canvasBackground?: string
  ): Blob {
    const data: MindWeaverFile = {
      version: this.FILE_VERSION,
      title,
      createdAt: new Date().toISOString(),
      exportedAt: new Date().toISOString(),
      data: {
        nodes,
        layout,
        canvasBackground
      }
    };
    
    const content = JSON.stringify(data, null, 2);
    return new Blob([content], { type: 'application/json' });
  }
  
  /**
   * 导出为 Markdown 格式
   */
  static exportToMarkdown(nodes: MindMapNode[], title: string): Blob {
    const rootNode = nodes.find(n => n.level === 0);
    if (!rootNode) {
      return new Blob([`# ${title}\n\n空思维导图`], { type: 'text/markdown' });
    }
    
    let markdown = `# ${title}\n\n`;
    markdown += this.nodeToMarkdown(rootNode, nodes, 1);
    
    return new Blob([markdown], { type: 'text/markdown' });
  }
  
  private static nodeToMarkdown(
    node: MindMapNode,
    allNodes: MindMapNode[],
    level: number
  ): string {
    let result = '';
    
    // 标题
    const heading = '#'.repeat(Math.min(level, 6));
    result += `${heading} ${node.title}\n\n`;
    
    // 摘要
    if (node.summary) {
      result += `*${node.summary}*\n\n`;
    }
    
    // 内容
    if (node.content) {
      result += `${node.content}\n\n`;
    }
    
    // 子节点
    if (node.children && node.children.length > 0) {
      for (const childId of node.children) {
        const childNode = allNodes.find(n => n.id === childId);
        if (childNode) {
          result += this.nodeToMarkdown(childNode, allNodes, level + 1);
        }
      }
    }
    
    return result;
  }
  
  /**
   * 导出为图片（需要 canvas 元素）
   * @param canvasElement canvas 元素
   * @param format 导出格式
   * @param backgroundColor 背景颜色
   * @param backgroundImage 背景图片 URL
   * @param backgroundType 背景类型：'solid' | 'gradient' | 'grid' | 'image'
   * @param backgroundSize 背景尺寸（用于图片和网格）
   * @param backgroundGradientColors 渐变颜色数组
   * @param backgroundGridColor 网格颜色
   * @param quality 质量
   */
  static async exportToImage(
    canvasElement: HTMLCanvasElement,
    format: 'png' | 'svg' = 'png',
    backgroundColor?: string,
    backgroundImage?: string,
    backgroundType?: 'solid' | 'gradient' | 'grid' | 'image',
    backgroundSize?: string,
    backgroundGradientColors?: string[],
    backgroundGridColor?: string,
    quality: number = 1.0
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (format === 'png') {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasElement.width;
        tempCanvas.height = canvasElement.height;
        const ctx = tempCanvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('无法获取 canvas 上下文'));
          return;
        }
        
        const drawBackground = () => {
          // 绘制纯色背景
          if (backgroundColor && backgroundColor !== 'transparent') {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
          }
          
          // 绘制渐变背景
          if (backgroundType === 'gradient' && backgroundGradientColors && backgroundGradientColors.length >= 2) {
            const gradient = ctx.createLinearGradient(0, 0, canvasElement.width, canvasElement.height);
            backgroundGradientColors.forEach((color, index) => {
              gradient.addColorStop(index / (backgroundGradientColors.length - 1), color);
            });
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
          }
          
          // 绘制网格背景
          if (backgroundType === 'grid' && backgroundGridColor && backgroundSize) {
            const gridSize = parseInt(backgroundSize) || 50;
            ctx.strokeStyle = backgroundGridColor;
            ctx.lineWidth = 1;
            
            // 绘制垂直线
            for (let x = 0; x <= canvasElement.width; x += gridSize) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, canvasElement.height);
              ctx.stroke();
            }
            // 绘制水平线
            for (let y = 0; y <= canvasElement.height; y += gridSize) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(canvasElement.width, y);
              ctx.stroke();
            }
          }
        };
        
        const drawImageBackground = (img: HTMLImageElement) => {
          // 绘制图片背景（cover 模式）
          const imgRatio = img.width / img.height;
          const canvasRatio = canvasElement.width / canvasElement.height;
          
          let drawX = 0, drawY = 0, drawWidth = canvasElement.width, drawHeight = canvasElement.height;
          
          if (imgRatio > canvasRatio) {
            // 图片更宽，以高度为基准
            drawWidth = canvasElement.height * imgRatio;
            drawX = (canvasElement.width - drawWidth) / 2;
          } else {
            // 图片更高，以宽度为基准
            drawHeight = canvasElement.width / imgRatio;
            drawY = (canvasElement.height - drawHeight) / 2;
          }
          
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        };
        
        const drawWithBackground = () => {
          // 根据背景类型绘制
          if (backgroundType === 'image' && backgroundImage) {
            // 图片背景（cover 模式）
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              drawBackground(); // 先绘制纯色背景（作为底层）
              drawImageBackground(img);
              ctx.drawImage(canvasElement, 0, 0);
              
              tempCanvas.toBlob(
                (blob) => blob ? resolve(blob) : reject(new Error('Failed to export image')),
                'image/png',
                quality
              );
            };
            img.onerror = () => {
              drawBackground();
              ctx.drawImage(canvasElement, 0, 0);
              tempCanvas.toBlob(
                (blob) => blob ? resolve(blob) : reject(new Error('Failed to export image')),
                'image/png',
                quality
              );
            };
            img.src = backgroundImage;
          } else {
            // 其他背景类型（纯色、渐变、网格）
            drawBackground();
            ctx.drawImage(canvasElement, 0, 0);
            
            tempCanvas.toBlob(
              (blob) => blob ? resolve(blob) : reject(new Error('Failed to export image')),
              'image/png',
              quality
            );
          }
        };
        
        drawWithBackground();
      } else {
        // SVG 导出需要特殊处理
        const svgData = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${canvasElement.width}" height="${canvasElement.height}">
            <foreignObject width="100%" height="100%">
              <div xmlns="http://www.w3.org/1999/xhtml">
                <!-- SVG export requires more complex implementation -->
              </div>
            </foreignObject>
          </svg>
        `;
        resolve(new Blob([svgData], { type: 'image/svg+xml' }));
      }
    });
  }
  
  /**
   * 导出为 MindWeaver 格式（.mmw）
   */
  static exportToMMW(
    nodes: MindMapNode[],
    title: string,
    layout?: any,
    canvasBackground?: string
  ): Blob {
    const data: MindWeaverFile = {
      version: this.FILE_VERSION,
      title,
      createdAt: new Date().toISOString(),
      exportedAt: new Date().toISOString(),
      data: {
        nodes,
        layout,
        canvasBackground
      }
    };
    
    const content = JSON.stringify(data, null, 2);
    return new Blob([content], { type: 'application/mindweaver+json' });
  }
  
  /**
   * 从 Blob 导入 MindWeaver 文件
   */
  static async importFromMMW(file: Blob): Promise<MindWeaverFile> {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!data.version || !data.data?.nodes) {
      throw new Error('无效的 MindWeaver 文件格式');
    }
    
    return data as MindWeaverFile;
  }
  
  /**
   * 生成分享链接
   */
  static generateShareLink(
    nodes: MindMapNode[],
    title: string,
    layout?: any,
    canvasBackground?: string
  ): string {
    const data: MindWeaverFile = {
      version: this.FILE_VERSION,
      title,
      createdAt: new Date().toISOString(),
      exportedAt: new Date().toISOString(),
      data: {
        nodes,
        layout,
        canvasBackground
      }
    };
    
    const json = JSON.stringify(data);
    const encoded = btoa(encodeURIComponent(json));
    const baseUrl = window.location.origin;
    return `${baseUrl}/import?data=${encoded}`;
  }
  
  /**
   * 从分享链接解析数据
   */
  static parseShareLink(url: string): MindWeaverFile | null {
    try {
      const urlObj = new URL(url);
      const encoded = urlObj.searchParams.get('data');
      
      if (!encoded) {
        return null;
      }
      
      const json = decodeURIComponent(atob(encoded));
      const data = JSON.parse(json);
      
      if (!data.version || !data.data?.nodes) {
        return null;
      }
      
      return data as MindWeaverFile;
    } catch {
      return null;
    }
  }
  
  /**
   * 下载文件
   */
  static downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  /**
   * 复制文本到剪贴板
   */
  static async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}
