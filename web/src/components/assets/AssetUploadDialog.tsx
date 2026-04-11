import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { X, Upload, Plus, Eye, EyeOff } from 'lucide-react';
import { assetService, Asset } from '../../services/assets/AssetService';

interface AssetUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (asset: Asset) => void;
}

type AssetType = 'icon' | 'connector' | 'iconSet' | 'fontStyle' | 'colorScheme' | 'background' | 'animation';

export function AssetUploadDialog({ open, onOpenChange, onUpload }: AssetUploadDialogProps) {
  // 基础状态管理
  const [assetType, setAssetType] = useState<AssetType>('icon');
  const [name, setName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [filePreview, setFilePreview] = useState<string>('');
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const [tagError, setTagError] = useState('');
  const [formError, setFormError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLImageElement>(null);
  
  // 引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  // 拖拽计数器，用于处理嵌套元素的拖拽事件
  const dragCounter = useRef(0);
  
  // 加载字体文件
  useEffect(() => {
    if (filePreview && assetType === 'fontStyle') {
      const fontName = name || 'UploadedFont';
      try {
        // 创建 FontFace 对象
        const font = new FontFace(fontName, `url(${filePreview})`);
        
        // 加载字体
        font.load().then((loadedFont) => {
          // 添加字体到文档
          document.fonts.add(loadedFont);
          console.log('字体加载成功:', fontName);
          
          // 触发预览更新
          if (previewRef.current) {
            // 重新设置 src 以触发重新渲染
            const currentSrc = previewRef.current.src;
            previewRef.current.src = '';
            setTimeout(() => {
              previewRef.current!.src = currentSrc;
            }, 10);
          }
        }).catch((error) => {
          console.error('字体加载失败:', error);
        });
      } catch (error) {
        console.error('创建字体对象失败:', error);
      }
    }
  }, [filePreview, assetType, name]);
  

  
  // 连接线相关状态
  const [connectorType, setConnectorType] = useState('curve');
  const [connectorStyle, setConnectorStyle] = useState('solid');

  const [connectorArrow, setConnectorArrow] = useState('none');
  
  // 预设的美观配色方案（16种颜色）
  const presetColors = [
    '#3b82f6', // 主色调 - 蓝色
    '#10b981', // 辅助色1 - 绿色
    '#f59e0b', // 辅助色2 - 黄色
    '#ef4444', // 辅助色3 - 红色
    '#8b5cf6', // 辅助色4 - 紫色
    '#ec4899', // 辅助色5 - 粉色
    '#06b6d4', // 辅助色6 - 青色
    '#14b8a6', // 辅助色7 - 茶绿色
    '#f97316', // 辅助色8 - 橙色
    '#84cc16', // 辅助色9 - 浅绿色
    '#6366f1', // 辅助色10 - 靛蓝色
    '#d946ef', // 辅助色11 - 玫红色
    '#0ea5e9', // 辅助色12 - 天蓝色
    '#059669', // 辅助色13 - 深绿色
    '#d97706', // 辅助色14 - 深黄色
    '#dc2626'  // 辅助色15 - 深红色
  ];
  
  // 配色方案相关状态
  const [colorCount, setColorCount] = useState(4);
  const [colors, setColors] = useState<string[]>(presetColors.slice(0, 4));
  
  // 背景相关状态
  const [backgroundType, setBackgroundType] = useState('solid');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [gradientDirection, setGradientDirection] = useState('linear');
  const [gradientColor1, setGradientColor1] = useState('#3b82f6');
  const [gradientColor2, setGradientColor2] = useState('#10b981');
  const [gridSize, setGridSize] = useState(20);
  const [gridLineColor, setGridLineColor] = useState('#e5e7eb');
  const [gridBackgroundColor, setGridBackgroundColor] = useState('#ffffff');
  
  // 动画相关状态
  const [animationType, setAnimationType] = useState('fade');
  const [animationDuration, setAnimationDuration] = useState(1000);
  const [animationEasing, setAnimationEasing] = useState('ease-in-out');
  

  
  // 重置表单
  const resetForm = () => {
    setAssetType('icon');
    setName('');
    setTags([]);
    setTagInput('');
    setDescription('');
    setFile(null);
    setFiles([]);
    setFilePreview('');
    setFilePreviews([]);
    setFileError('');
    setTagError('');
    setFormError('');
    setIsUploading(false);
    setShowPreview(false);
    

    
    // 重置连接线相关状态
    setConnectorType('curve');
    setConnectorStyle('solid');
    setConnectorArrow('none');
    
    // 重置配色方案相关状态
    setColorCount(4);
    setColors(presetColors.slice(0, 4));
    
    // 重置背景相关状态
    setBackgroundType('solid');
    setBackgroundColor('#ffffff');
    setGradientDirection('linear');
    setGradientColor1('#3b82f6');
    setGradientColor2('#10b981');
    setGridSize(20);
    setGridLineColor('#e5e7eb');
    setGridBackgroundColor('#ffffff');
    
    // 重置动画相关状态
    setAnimationType('fade');
    setAnimationDuration(1000);
    setAnimationEasing('ease-in-out');
    

  };
  
  // 关闭对话框
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };
  
  // 处理标签添加
  const handleAddTag = () => {
    const tag = tagInput.trim();
    // 检查标签数量限制
    if (tags.length >= 3) {
      setTagError('标签数量不能超过3个');
      setTagInput('');
      // 3秒后自动清除错误信息
      setTimeout(() => {
        setTagError('');
      }, 3000);
      return;
    }
    // 禁止添加 iconify 标签
    if (tag.toLowerCase() === 'iconify') {
      setTagError('iconify 是系统保留标签，用于标识 Iconify 图标库的素材，不允许手动添加');
      setTagInput('');
      // 3秒后自动清除错误信息
      setTimeout(() => {
        setTagError('');
      }, 3000);
      return;
    }
    // 添加有效标签
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
      setTagError('');
    }
  };
  
  // 处理标签删除
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  // 验证文件类型
  const validateFileType = (file: File) => {
    const allowedTypes = getAllowedFileTypes();
    const allowedExtensions = allowedTypes.split(',').map(type => {
      if (type === 'image/*') return /\.(jpg|jpeg|png|gif|svg)$/i;
      if (type === 'font/*') return /\.(ttf|otf|woff|woff2|eot)$/i;
      if (type === 'application/svg+xml') return /\.svg$/i;
      if (type === 'application/zip') return /\.zip$/i;
      return null;
    }).filter(Boolean) as RegExp[];
    
    return allowedExtensions.some(ext => ext.test(file.name));
  };
  
  // 读取文件为data URL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (assetType === 'iconSet') {
        // 图标组合支持多文件
        const selectedFiles = Array.from(e.target.files);
        const validFiles = selectedFiles.filter(file => validateFileType(file));
        
        if (validFiles.length > 0) {
          setFiles(validFiles);
          // 生成预览
          const previews = await Promise.all(validFiles.map(file => readFileAsDataURL(file)));
          setFilePreviews(previews);
          setFileError('');
        } else {
          setFiles([]);
          setFilePreviews([]);
          setFileError('请选择正确格式的文件');
        }
      } else {
        // 其他类型只支持单文件
        const selectedFile = e.target.files[0];
        if (validateFileType(selectedFile)) {
          setFile(selectedFile);
          // 读取文件内容为data URL用于预览
          const dataUrl = await readFileAsDataURL(selectedFile);
          setFilePreview(dataUrl);
          setFileError('');
        } else {
          setFile(null);
          setFilePreview('');
          setFileError('请选择正确格式的文件');
        }
      }
    }
  };
  
  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  // 处理拖拽经过
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  // 处理拖拽进入
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setIsDragging(true);
    }
  };
  
  // 处理拖拽离开
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };
  
  // 处理拖拽释放
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (assetType === 'iconSet') {
        // 图标组合支持多文件
        const droppedFiles = Array.from(e.dataTransfer.files);
        const validFiles = droppedFiles.filter(file => validateFileType(file));
        
        if (validFiles.length > 0) {
          setFiles(validFiles);
          // 生成预览
          const previews = await Promise.all(validFiles.map(file => readFileAsDataURL(file)));
          setFilePreviews(previews);
          setFileError('');
        } else {
          setFiles([]);
          setFilePreviews([]);
          setFileError('请选择正确格式的文件');
        }
      } else {
        // 其他类型只支持单文件
        const droppedFile = e.dataTransfer.files[0];
        if (validateFileType(droppedFile)) {
          setFile(droppedFile);
          // 读取文件内容为data URL用于预览
          const dataUrl = await readFileAsDataURL(droppedFile);
          setFilePreview(dataUrl);
          setFileError('');
        } else {
          setFile(null);
          setFilePreview('');
          setFileError('请选择正确格式的文件');
        }
      }
    }
  };
  
  // 获取允许的文件类型
  const getAllowedFileTypes = () => {
    switch (assetType) {
      case 'icon':
        return 'image/*,application/svg+xml';
      case 'background':
        return 'image/*,application/svg+xml';
      case 'iconSet':
        return 'image/*,application/svg+xml';
      default:
        return '';
    }
  };
  
  // 支持文件上传的类型
  const supportsFileUpload = () => {
    return ['icon', 'background', 'iconSet'].includes(assetType);
  };
  
  // 根据素材类型设置分类
  const getCategoryByType = (type: AssetType): string => {
    switch (type) {
      case 'icon': return '图标';
      case 'connector': return '连接线';
      case 'iconSet': return '图标组合';
      case 'colorScheme': return '配色方案';
      case 'background': return '导图背景';
      case 'animation': return '动画效果';
      default: return '默认';
    }
  };
  

  
  // 生成图标组合预览
  const generateIconSetPreview = (): string => {
    const size = 200;
    
    if (filePreviews.length > 0) {
      // 生成一个网格预览，显示上传的图标
      const displayPreviews = filePreviews.slice(0, 4); // 最多显示4个预览
      const gridSize = 2; // 固定2x2网格
      const cellSize = 60; // 固定单元格大小
      const totalWidth = gridSize * cellSize + (gridSize - 1) * 20; // 20px间距
      const startX = (size - totalWidth) / 2;
      const startY = (size - totalWidth) / 2;
      
      let previewElements = '';
      
      displayPreviews.forEach((preview, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const x = startX + col * (cellSize + 20);
        const y = startY + row * (cellSize + 20);
        
        previewElements += `
          <image x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" href="${preview}" preserveAspectRatio="xMidYMid meet"/>
        `;
      });
      
      return `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" stroke="none">
          ${previewElements}
        </svg>
      `)}`;
    } else {
      // 如果没有上传文件，返回空字符串，使用通用提示
      return '';
    }
  };

  // 生成预览图
  const generatePreview = (): string => {
    switch (assetType) {
      case 'icon':
        // 使用filePreview（data URL）而不是blob URL
        return filePreview;
      case 'iconSet':
        // 对于图标组合，生成特殊的预览
        return generateIconSetPreview();
      case 'background':
        // 如果上传了文件，显示文件预览；否则显示背景配置预览
        if (filePreview) {
          return filePreview;
        }
        return generateBackgroundPreview();
      case 'connector':
        return generateConnectorPreview();
      case 'colorScheme':
        return generateColorSchemePreview();
      case 'animation':
        return generateAnimationPreview();
    }
    return '';
  };
  
  // 生成背景预览
  const generateBackgroundPreview = (): string => {
    const size = 200;
    
    switch (backgroundType) {
      case 'solid':
        // 纯色背景
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
            <rect width="100%" height="100%" fill="${backgroundColor}"/>
          </svg>
        `)}`;
      
      case 'gradient':
        // 渐变背景
        let gradientDef = '';
        let gradientFill = '';
        
        if (gradientDirection === 'linear') {
          gradientDef = `<linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${gradientColor1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${gradientColor2};stop-opacity:1" />
          </linearGradient>`;
          gradientFill = 'url(#grad)';
        } else if (gradientDirection === 'radial') {
          gradientDef = `<radialGradient id="grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style="stop-color:${gradientColor1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${gradientColor2};stop-opacity:1" />
          </radialGradient>`;
          gradientFill = 'url(#grad)';
        } else {
          // 角度渐变
          gradientDef = `<linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${gradientColor1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${gradientColor2};stop-opacity:1" />
          </linearGradient>`;
          gradientFill = 'url(#grad)';
        }
        
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
            <defs>${gradientDef}</defs>
            <rect width="100%" height="100%" fill="${gradientFill}"/>
          </svg>
        `)}`;
      
      case 'grid':
        // 网格背景
        const gridPattern = `
          <pattern id="grid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
            <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="${gridLineColor}" stroke-width="1"/>
          </pattern>
        `;
        
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
            <defs>${gridPattern}</defs>
            <rect width="100%" height="100%" fill="${gridBackgroundColor}"/>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        `)}`;
      
      default:
        return '';
    }
  };
  

  
  // 生成连接线预览
  const generateConnectorPreview = (): string => {
    let pathElement = '';
    let arrowElement = '';
    
    // 调整缩放比例和位置，使连接线放大并居中
    const scale = 5;
    const svgSize = 200;
    const centerX = svgSize / 2;
    const centerY = svgSize / 2;
    const width = 45 * scale;
    const height = 22.5 * scale;
    
    // 根据线条类型绘制不同的路径
    switch (connectorType) {
      case 'wavy':
        // 波浪线：绘制波浪形曲线，使用正弦波形状
        const waveCount = 3;
        const waveHeight = height / 1.5;
        let wavePath = `M${centerX - width/2},${centerY}`;
        
        // 绘制波浪线，使用多个二次贝塞尔曲线段
        const segmentsPerWave = 2; // 每个波浪有2个段（上和下）
        const totalSegments = waveCount * segmentsPerWave;
        
        for (let i = 0; i < totalSegments; i++) {
          const startX = centerX - width/2 + (width * i) / totalSegments;
          const endX = centerX - width/2 + (width * (i + 1)) / totalSegments;
          const midX = (startX + endX) / 2;
          
          // 根据段数确定是上凸还是下凸
          const isUpward = i % 2 === 0;
          const yOffset = isUpward ? -waveHeight : waveHeight;
          
          // 二次贝塞尔曲线：起点 -> 控制点 -> 终点
          const midY = centerY + yOffset;
          const endY = centerY;
          
          wavePath += ` Q${midX},${midY} ${endX},${endY}`;
        }
        
        pathElement = `
          <path d="${wavePath}" fill="none" stroke="#000000" stroke-width="3" stroke-dasharray="${connectorStyle === 'solid' ? 'none' : connectorStyle === 'dashed' ? '10,5' : '2,5,10,5'}"/>
        `;
        break;
      case 'step':
        // 阶梯线：先水平再垂直再水平
        pathElement = `
          <path d="M${centerX - width/2},${centerY - height/2} H${centerX} V${centerY + height/2} H${centerX + width/2}" fill="none" stroke="#000000" stroke-width="3" stroke-dasharray="${connectorStyle === 'solid' ? 'none' : connectorStyle === 'dashed' ? '10,5' : '2,5,10,5'}"/>
        `;
        break;
      case 'straight':
        // 直线
        pathElement = `
          <path d="M${centerX - width/2},${centerY} L${centerX + width/2},${centerY}" fill="none" stroke="#000000" stroke-width="3" stroke-dasharray="${connectorStyle === 'solid' ? 'none' : connectorStyle === 'dashed' ? '10,5' : '2,5,10,5'}"/>
        `;
        break;
      default:
        // 曲线（默认）：开口朝下
        pathElement = `
          <path d="M${centerX - width/2},${centerY + height/2} Q${centerX},${centerY - height/2} ${centerX + width/2},${centerY + height/2}" fill="none" stroke="#000000" stroke-width="3" stroke-dasharray="${connectorStyle === 'solid' ? 'none' : connectorStyle === 'dashed' ? '10,5' : '2,5,10,5'}"/>
        `;
    }
    
    // 绘制箭头（如果需要）
    // 波浪线固定为无箭头
    if (connectorArrow === 'normal' && connectorType !== 'wavy') {
      let arrowX = centerX;
      let arrowY = centerY;
      let arrowRotation = 0;
      
      // 根据线条类型计算箭头位置，确保箭头在线上
      if (connectorType === 'curve') {
        // 曲线：计算二次贝塞尔曲线在 t=0.5 时的点
        // B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        const t = 0.5;
        const P0x = centerX - width / 2;
        const P0y = centerY + height / 2;
        const P1x = centerX;
        const P1y = centerY - height / 2;
        const P2x = centerX + width / 2;
        const P2y = centerY + height / 2;
        
        arrowX = (1 - t) * (1 - t) * P0x + 2 * (1 - t) * t * P1x + t * t * P2x;
        arrowY = (1 - t) * (1 - t) * P0y + 2 * (1 - t) * t * P1y + t * t * P2y;
        
        // 计算切线方向作为箭头旋转角度
        const tangentX = 2 * (1 - t) * (P1x - P0x) + 2 * t * (P2x - P1x);
        const tangentY = 2 * (1 - t) * (P1y - P0y) + 2 * t * (P2y - P1y);
        arrowRotation = Math.atan2(tangentY, tangentX) * 180 / Math.PI;
      } else if (connectorType === 'step') {
        // 阶梯线：由三段组成 (水平 → 垂直 → 水平)
        // 计算中点落在哪一段
        const startX = centerX - width / 2;
        const midX = centerX;
        const startY = centerY - height / 2;
        const endY = centerY + height / 2;
        
        // 阶梯线总长度 = width/2 + height + width/2 = width + height
        const halfWidth = width / 2;
        const totalLength = width + height;
        const midLength = totalLength / 2;
        
        if (midLength <= halfWidth) {
          // 中点在第一段水平线上
          arrowX = startX + midLength;
          arrowY = startY;
          arrowRotation = 0;
        } else if (midLength <= halfWidth + height) {
          // 中点在垂直段上
          arrowX = midX;
          arrowY = startY + (midLength - halfWidth);
          arrowRotation = 90;
        } else {
          // 中点在第二段水平线上
          arrowX = midX + (midLength - halfWidth - height);
          arrowY = endY;
          arrowRotation = 0;
        }
      }
      // 直线(connectorType === 'straight')：使用默认的中心点 (centerX, centerY)
      
      arrowElement = `
        <g transform="translate(${arrowX}, ${arrowY}) rotate(${arrowRotation})">
          <path d="M0,0 L-10,5 L-10,-5 Z" fill="#000000"/>
        </g>
      `;
    }
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
      ${pathElement}
      ${arrowElement}
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };
  
  // 生成配色方案预览
  const generateColorSchemePreview = (): string => {
    // 4x4 网格，每个颜色块 16x16
    const squares = colors.slice(0, 16).map((color, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;
      const x = col * 16;
      const y = row * 16;
      return `<rect width="16" height="16" x="${x}" y="${y}" fill="${color}" stroke="#e0e0e0" stroke-width="0.5"/>`;
    }).join('');
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="none">${squares}</svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };
  
  // 生成动画预览
  const generateAnimationPreview = (): string => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <rect x="40" y="40" width="20" height="20" fill="#3b82f6">
        <animate attributeName="opacity" values="0;1;0" dur="${animationDuration / 1000}s" repeatCount="indefinite"/>
      </rect>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };
  
  // 处理上传
  const handleUpload = async () => {
    // 验证表单
    if (!name.trim()) {
      setFormError('请输入素材名称');
      return;
    }
    
    if (assetType === 'icon') {
      if (!file) {
        setFileError('请上传文件');
        return;
      }
    } else if (assetType === 'iconSet') {
      if (files.length === 0) {
        setFileError('请上传文件');
        return;
      }
    }
    
    // 验证标签数量
    const validTags = tags.filter(tag => tag.toLowerCase() !== 'iconify');
    if (validTags.length === 0) {
      setTagError('请至少添加1个标签');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setFormError('');
    setFileError('');
    setTagError('');
    
    try {
      // 生成预览图
      let thumbnail = '';
      if (assetType === 'iconSet' && files.length > 0) {
        // 对于图标组合，使用生成的网格预览
        thumbnail = generatePreview();
      } else if (file) {
        thumbnail = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        });
      } else {
        // 对于非文件类型的素材，生成预览图
        thumbnail = generatePreview();
      }
      
      // 过滤掉 iconify 标签
      const filteredTags = tags.filter(tag => tag.toLowerCase() !== 'iconify');
      
      // 确定上传者名称（暂时硬编码为游客，后续会根据登录状态修改）
      const uploaderName = '游客';
      
      // 构建素材对象
      const asset: Asset = {
        id: Date.now().toString(),
        name: name.trim(),
        type: assetType,
        category: getCategoryByType(assetType),
        tags: filteredTags,
        thumbnail,
        uploader: uploaderName,
        description: description.trim() || undefined,
        data: {}
      };
      
      // 根据素材类型处理数据
      if (assetType === 'iconSet' && files.length > 0) {
        // 对于图标组合，存储多个文件信息和图标数据
        asset.data = {
          count: files.length,
          style: 'custom',
          icons: files.map((file, index) => ({
            name: file.name.replace(/\.[^/.]+$/, '') // 去掉文件扩展名作为图标名称
              .toLowerCase() // 转换为小写
              .replace(/[^a-zA-Z0-9]/g, '') // 移除特殊字符
              .replace(/\s+/g, '') // 移除空格
              || `icon-${index + 1}`, // 确保有默认名称
            svg: filePreviews[index] || '' // 使用文件预览作为图标内容
          })),
          files: files.map(file => ({
            fileName: file.name,
            fileType: file.type
          }))
        };
      } else if (file) {
        if (assetType === 'icon' || assetType === 'background') {
          // 对于图片类素材，存储文件内容
          asset.data = {
            content: thumbnail
          };
        }
      } else {
        // 对于非文件类型的素材，根据类型设置数据
        if (assetType === 'connector') {
          // 将样式转换为 lineDash 数组
          let lineDash: number[] = [];
          if (connectorStyle === 'dashed') {
            lineDash = [10, 5];
          } else if (connectorStyle === 'dotted') {
            lineDash = [2, 5, 10, 5]; // 与内置点线连线一致
          }
          
          // 将 drawType 映射到正确的值
          let drawType: string = 'curved';
          if (connectorType === 'straight') {
            drawType = 'straight';
          } else if (connectorType === 'step') {
            drawType = 'step';
          } else if (connectorType === 'wavy') {
            drawType = 'wavy';
          } else if (connectorType === 'curve') {
            drawType = 'curved';
          }
          
          asset.data = {
            type: connectorType,
            render: {
              type: connectorType,
              lineDash: lineDash,
              lineWidth: 3,
              hasArrowHead: connectorArrow === 'normal',
              arrowSize: 10,
              drawType: drawType
            }
          };
        } else if (assetType === 'colorScheme') {
          asset.data = {
            colors: colors
          };
        } else if (assetType === 'background') {
          if (backgroundType === 'solid') {
            asset.data = {
              type: 'solid',
              color: backgroundColor
            };
          } else if (backgroundType === 'gradient') {
            asset.data = {
              type: 'gradient',
              colors: [gradientColor1, gradientColor2]
            };
          } else if (backgroundType === 'grid') {
            asset.data = {
              type: 'grid',
              size: `${gridSize}px`,
              color: gridLineColor,
              backgroundColor: gridBackgroundColor
            };
          }
        } else if (assetType === 'animation') {
          // 转换为与内置动画一致的格式
          let animationData: any = {
            type: animationType,
            duration: `${animationDuration}ms`,
            easing: animationEasing,
            applyTo: 'all'
          };
          
          // 根据动画类型设置关键帧
          if (animationType === 'fade') {
            // 淡入效果 → 映射到 fadeIn
            animationData.type = 'fadeIn';
            animationData.keyframes = [
              { opacity: 0, transform: 'scale(0.95)' },
              { opacity: 1, transform: 'scale(1)' }
            ];
          } else if (animationType === 'scale') {
            // 缩放效果 → 映射到 scaleIn
            animationData.type = 'scaleIn';
            animationData.keyframes = [
              { opacity: 0, transform: 'scale(0.8)' },
              { opacity: 1, transform: 'scale(1)' }
            ];
          } else if (animationType === 'bounce') {
            // 弹跳效果
            animationData.keyframes = [
              { transform: 'translateY(0)' },
              { transform: 'translateY(-10px)' },
              { transform: 'translateY(0)' }
            ];
            animationData.frequency = 1; // 弹跳频率
          }
          
          asset.data = animationData;
        }
      }
      
      // 尝试使用服务端上传
      if (assetType === 'iconSet' && files.length > 0) {
        // 对于图标组合，上传多个文件
        // 这里需要实现多文件上传逻辑
        // 暂时使用本地上传
        // 对于图标类型，使用 icon-[名称] 格式，满足思维导图界面引用要求
        const iconSetName = name.trim()
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        let baseId = `iconset-${iconSetName || Date.now().toString()}`;
        
        // 检查ID是否已存在，如果存在则添加数字后缀
        let counter = 1;
        asset.id = baseId;
        while (assetService.getAssetById(asset.id)) {
          asset.id = `${baseId}-${counter}`;
          counter++;
        }
        
        // 调用上传回调
        onUpload(asset);
      } else if (file) {
        const uploadedAsset = await assetService.uploadAsset(file, name, assetType, filteredTags);
        if (uploadedAsset) {
          // 调用上传回调
          onUpload(uploadedAsset);
        } else {
          // 降级到本地上传
          // 对于图标类型，使用 icon-[名称] 格式，满足思维导图界面引用要求
          if (assetType === 'icon') {
            // 将名称转换为小写，替换空格和特殊字符为连字符
            const iconName = name.trim()
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            let baseId = `icon-${iconName || Date.now().toString()}`;
            
            // 检查ID是否已存在，如果存在则添加数字后缀
            let counter = 1;
            asset.id = baseId;
            while (assetService.getAssetById(asset.id)) {
              asset.id = `${baseId}-${counter}`;
              counter++;
            }
          }
          
          // 调用上传回调
          onUpload(asset);
        }
      } else {
        // 非文件类型的素材直接使用本地上传
        onUpload(asset);
      }
      
      // 关闭对话框
      handleClose();
    } catch (error) {
      setFormError('上传失败，请重试');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  // 处理颜色数量变化
  const handleColorCountChange = (count: string) => {
    const newCount = parseInt(count);
    setColorCount(newCount);
    
    // 调整颜色数组长度
    const newColors = [...colors];
    if (newCount > colors.length) {
      // 添加新颜色（使用预设颜色）
      for (let i = colors.length; i < newCount; i++) {
        // 使用预设颜色，如果超出预设范围则循环使用
        const presetIndex = i % presetColors.length;
        newColors.push(presetColors[presetIndex]);
      }
    } else if (newCount < colors.length) {
      // 移除多余的颜色
      newColors.splice(newCount);
    }
    setColors(newColors);
  };
  
  // 处理颜色变化
  const handleColorChange = (index: number, color: string) => {
    const newColors = [...colors];
    newColors[index] = color;
    setColors(newColors);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">上传素材</DialogTitle>
          <DialogDescription>
            上传新的素材到素材中心
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 表单错误 */}
          {formError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{formError}</p>
            </div>
          )}
          
          {/* 素材类型 */}
          <div className="space-y-2">
            <Label htmlFor="asset-type">素材类型</Label>
            <Select value={assetType} onValueChange={(value) => {
              setAssetType(value as AssetType);
              // 切换素材类型时重置文件相关状态
              setFile(null);
              if (filePreview && filePreview.startsWith('data:')) {
                // 清理 data URL 不需要 revokeObjectURL
              }
              setFilePreview('');
              setFileError('');
              setTagError('');
              setTags([]);
            }}>
              <SelectTrigger id="asset-type">
                <SelectValue placeholder="选择素材类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="icon">图标</SelectItem>
                <SelectItem value="connector">连接线</SelectItem>
                <SelectItem value="iconSet">图标组合</SelectItem>
                <SelectItem value="colorScheme">配色方案</SelectItem>
                <SelectItem value="background">导图背景</SelectItem>
                <SelectItem value="animation">动画效果</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 文件上传区域 */}
          {supportsFileUpload() && (
            <div className="space-y-2">
              <Label>文件上传</Label>
              <div
                ref={dropRef}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary hover:bg-primary/5'}`}
                onClick={() => fileInputRef.current?.click()}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAllowedFileTypes()}
                  onChange={handleFileChange}
                  className="hidden"
                  title={assetType === 'iconSet' ? '选择多个文件' : '选择文件'}
                  multiple={assetType === 'iconSet'}
                />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {assetType === 'iconSet' ? (
                    files.length > 0 ? (
                      `已选择: ${files.length} 个文件`
                    ) : fileError ? (
                      fileError
                    ) : (
                      '点击或拖拽多个文件到此处上传'
                    )
                  ) : file ? (
                    `已选择: ${file.name}`
                  ) : fileError ? (
                    fileError
                  ) : (
                    '点击或拖拽文件到此处上传'
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {assetType === 'icon' && '支持 PNG、JPG、SVG 格式'}
                  {assetType === 'background' && '支持 PNG、JPG、SVG 格式'}
                  {assetType === 'iconSet' && '支持 PNG、JPG、SVG 格式（可选择多个文件）'}
                </p>
              </div>
            </div>
          )}
          
          {/* 素材信息 */}
          <div className="space-y-2">
            <Label htmlFor="asset-name">名称</Label>
            <Input
              id="asset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入素材名称"
            />
          </div>
          
          {/* 标签 */}
          <div className="space-y-2">
            <Label>标签</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="输入标签并按回车添加"
                className={tagError ? 'border-destructive' : ''}
              />
              <Button size="sm" onClick={handleAddTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tagError && (
              <p className="text-xs text-destructive">
                {tagError}
              </p>
            )}
            <div className="flex justify-between items-center">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                      title="删除标签"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {tags.length}/3
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="asset-description">描述 (可选)</Label>
            <Textarea
              id="asset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入素材描述"
              rows={3}
            />
          </div>
          
          {/* 连接线配置 */}
          {assetType === 'connector' && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-sm font-medium">连接线配置</h3>
              
              <div className="space-y-2">
                <Label htmlFor="connector-type">线条类型</Label>
                <Select value={connectorType} onValueChange={setConnectorType}>
                  <SelectTrigger id="connector-type">
                    <SelectValue placeholder="选择线条类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="curve">曲线</SelectItem>
                    <SelectItem value="straight">直线</SelectItem>
                    <SelectItem value="step">阶梯线</SelectItem>
                    <SelectItem value="wavy">波浪线</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="connector-style">线条样式</Label>
                <Select value={connectorStyle} onValueChange={setConnectorStyle}>
                  <SelectTrigger id="connector-style">
                    <SelectValue placeholder="选择线条样式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">实线</SelectItem>
                    <SelectItem value="dashed">虚线</SelectItem>
                    <SelectItem value="dotted">点线</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="connector-arrow">箭头设置</Label>
                <Select 
                  value={connectorType === 'wavy' ? 'none' : connectorArrow} 
                  onValueChange={setConnectorArrow}
                  disabled={connectorType === 'wavy'}
                >
                  <SelectTrigger id="connector-arrow">
                    <SelectValue placeholder="选择箭头类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无箭头</SelectItem>
                    <SelectItem value="normal">有箭头</SelectItem>
                  </SelectContent>
                </Select>
                {connectorType === 'wavy' && (
                  <p className="text-xs text-muted-foreground">波浪线不支持箭头</p>
                )}
              </div>
            </div>
          )}
          
          {/* 配色方案配置 */}
          {assetType === 'colorScheme' && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-sm font-medium">配色方案配置</h3>
              
              <div className="space-y-2">
                <Label htmlFor="color-count">颜色数量</Label>
                <Select value={colorCount.toString()} onValueChange={handleColorCountChange}>
                  <SelectTrigger id="color-count">
                    <SelectValue placeholder="选择颜色数量" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 种颜色</SelectItem>
                    <SelectItem value="7">7 种颜色</SelectItem>
                    <SelectItem value="10">10 种颜色</SelectItem>
                    <SelectItem value="13">13 种颜色</SelectItem>
                    <SelectItem value="16">16 种颜色</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>颜色选择</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {colors.map((color, index) => (
                    <div key={index} className="space-y-1">
                      <Label htmlFor={`color-${index}`}>颜色 {index + 1}</Label>
                      <Input
                        id={`color-${index}`}
                        type="color"
                        value={color}
                        onChange={(e) => handleColorChange(index, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* 背景配置 */}
          {assetType === 'background' && !file && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-sm font-medium">背景配置</h3>
              
              <div className="space-y-2">
                <Label htmlFor="background-type">背景类型</Label>
                <Select value={backgroundType} onValueChange={setBackgroundType}>
                  <SelectTrigger id="background-type">
                    <SelectValue placeholder="选择背景类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">纯色</SelectItem>
                    <SelectItem value="gradient">渐变</SelectItem>
                    <SelectItem value="grid">网格</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {backgroundType === 'solid' && (
                <div className="space-y-2">
                  <Label htmlFor="background-color">背景颜色</Label>
                  <Input
                    id="background-color"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                  />
                </div>
              )}
              
              {backgroundType === 'gradient' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gradient-direction">渐变方向</Label>
                    <Select value={gradientDirection} onValueChange={setGradientDirection}>
                      <SelectTrigger id="gradient-direction">
                        <SelectValue placeholder="选择渐变方向" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear">线性渐变</SelectItem>
                        <SelectItem value="radial">径向渐变</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gradient-color1">颜色 1</Label>
                      <Input
                        id="gradient-color1"
                        type="color"
                        value={gradientColor1}
                        onChange={(e) => setGradientColor1(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gradient-color2">颜色 2</Label>
                      <Input
                        id="gradient-color2"
                        type="color"
                        value={gradientColor2}
                        onChange={(e) => setGradientColor2(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {backgroundType === 'grid' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="grid-size">网格大小</Label>
                    <Input
                      id="grid-size"
                      type="number"
                      value={gridSize}
                      onChange={(e) => setGridSize(parseInt(e.target.value) || 0)}
                      min="10"
                      max="50"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="grid-line-color">网格线条颜色</Label>
                      <Input
                        id="grid-line-color"
                        type="color"
                        value={gridLineColor}
                        onChange={(e) => setGridLineColor(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="grid-bg-color">网格背景颜色</Label>
                      <Input
                        id="grid-bg-color"
                        type="color"
                        value={gridBackgroundColor}
                        onChange={(e) => setGridBackgroundColor(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 动画配置 */}
          {assetType === 'animation' && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-sm font-medium">动画配置</h3>
              
              <div className="space-y-2">
                <Label htmlFor="animation-type">动画类型</Label>
                <Select value={animationType} onValueChange={setAnimationType}>
                  <SelectTrigger id="animation-type">
                    <SelectValue placeholder="选择动画类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fade">淡入淡出</SelectItem>
                    <SelectItem value="scale">缩放</SelectItem>
                    <SelectItem value="bounce">弹跳</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="animation-duration">动画时长 (ms)</Label>
                <Input
                  id="animation-duration"
                  type="number"
                  value={animationDuration}
                  onChange={(e) => setAnimationDuration(parseInt(e.target.value) || 0)}
                  min="100"
                  max="5000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="animation-easing">缓动函数</Label>
                <Select value={animationEasing} onValueChange={setAnimationEasing}>
                  <SelectTrigger id="animation-easing">
                    <SelectValue placeholder="选择缓动函数" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">线性</SelectItem>
                    <SelectItem value="ease-in">缓入</SelectItem>
                    <SelectItem value="ease-out">缓出</SelectItem>
                    <SelectItem value="ease-in-out">缓入缓出</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          

          
          {/* 预览区域 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>预览</Label>
              <Button size="sm" variant="outline" onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {showPreview && (
              <div className="p-4 border rounded-lg flex items-center justify-center">
                {generatePreview() ? (
                  <img 
                    ref={previewRef}
                    src={generatePreview()} 
                    alt="预览" 
                    className="max-w-full max-h-40 object-contain"
                  />
                ) : (
                  <p className="text-muted-foreground">请上传文件或配置参数以查看预览</p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {isUploading && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>上传进度</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-in-out" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            取消
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || !name.trim() || tags.filter(tag => tag.toLowerCase() !== 'iconify').length === 0 || ((assetType === 'icon' || assetType === 'fontStyle') && !file) || (assetType === 'iconSet' && files.length === 0)}
          >
            {isUploading ? '上传中...' : '上传'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}