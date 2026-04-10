// 素材类型定义
export interface Asset {
  id: string;
  name: string;
  type: 'icon' | 'shape' | 'connector' | 'iconSet' | 'fontStyle' | 'colorScheme' | 'background' | 'animation';
  category: string;
  tags: string[];
  thumbnail: string;
  uploader: string;
  description?: string; // 素材描述
  data?: any; // 素材的实际数据
}

// Lucide 图标 SVG 数据
const lucideLightbulbSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;

const lucideBriefcaseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;

const lucideCpuSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`;

const lucideGraduationCapSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;

// 将 SVG 转换为 data URL
const svgToDataUrl = (svg: string): string => {
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml;utf8,${encoded}`;
};



// 内置图标库
const iconAssets: Asset[] = [
  {
    id: 'icon-lightbulb',
    name: '创意图标',
    type: 'icon',
    category: '设计',
    tags: ['创意', '设计'],
    thumbnail: svgToDataUrl(lucideLightbulbSvg),
    uploader: '官方',
    data: { svg: lucideLightbulbSvg, lucideName: 'Lightbulb' }
  },
  {
    id: 'icon-briefcase',
    name: '商务图标',
    type: 'icon',
    category: '商务',
    tags: ['商务', '专业'],
    thumbnail: svgToDataUrl(lucideBriefcaseSvg),
    uploader: '官方',
    data: { svg: lucideBriefcaseSvg, lucideName: 'Briefcase' }
  },
  {
    id: 'icon-cpu',
    name: '科技图标',
    type: 'icon',
    category: '科技',
    tags: ['科技', '未来'],
    thumbnail: svgToDataUrl(lucideCpuSvg),
    uploader: '官方',
    data: { svg: lucideCpuSvg, lucideName: 'Cpu' }
  },
  {
    id: 'icon-graduation-cap',
    name: '教育图标',
    type: 'icon',
    category: '教育',
    tags: ['教育', '学习'],
    thumbnail: svgToDataUrl(lucideGraduationCapSvg),
    uploader: '官方',
    data: { svg: lucideGraduationCapSvg, lucideName: 'GraduationCap' }
  }
];

// 主题颜色
const THEME_COLOR = '#3B82F6';

// 形状颜色（节点颜色第三个选项：蓝色 #3B82F6）
const SHAPE_COLOR = THEME_COLOR;

// 六边形 SVG（带圆角）
const hexagonSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M32,4 Q34,4 36,5 L58,18 Q60,19 60,22 L60,42 Q60,45 58,46 L36,59 Q34,60 32,60 Q30,60 28,59 L6,46 Q4,45 4,42 L4,22 Q4,19 6,18 L28,5 Q30,4 32,4 Z" fill="${SHAPE_COLOR}" stroke="${SHAPE_COLOR}" stroke-width="2"/></svg>`;

// 等边三角形 SVG（带圆角）
const triangleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M32,14 L48,42 L16,42 Z" fill="${SHAPE_COLOR}" stroke="${SHAPE_COLOR}" stroke-width="2"/></svg>`;

// 平行四边形 SVG（带圆角，高度减半）
const parallelogramSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40" viewBox="0 0 64 40"><path d="M19,5 L55,5 Q57,5 58,7 L58,12 L47,33 Q46,35 44,35 L8,35 Q6,35 5,33 L5,28 L16,7 Q17,5 19,5 Z" fill="${SHAPE_COLOR}" stroke="${SHAPE_COLOR}" stroke-width="2"/></svg>`;

// 等腰梯形 SVG（带圆角，高度减半）
const trapezoidSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40" viewBox="0 0 64 40"><path d="M23,5 L43,5 Q45,5 46,7 L58,31 Q59,34 57,36 Q55,37 54,37 L10,37 Q8,37 7,36 Q5,34 6,31 L18,7 Q19,5 23,5 Z" fill="${SHAPE_COLOR}" stroke="${SHAPE_COLOR}" stroke-width="2"/></svg>`;

// 内置形状库
const shapeAssets: Asset[] = [
  {
    id: 'shape-hexagon',
    name: '六边形',
    type: 'shape',
    category: '几何',
    tags: ['几何', '流程'],
    thumbnail: svgToDataUrl(hexagonSvg),
    uploader: '官方',
    data: {
      type: 'hexagon',
      svg: hexagonSvg,
      // Canvas 绘制配置
      render: {
        type: 'path',
        // 相对于中心点的路径点 (x, y)，范围 -1 到 1
        points: [
          { x: 0, y: -1 },      // 顶部
          { x: 0.866, y: -0.5 }, // 右上
          { x: 0.866, y: 0.5 },  // 右下
          { x: 0, y: 1 },       // 底部
          { x: -0.866, y: 0.5 }, // 左下
          { x: -0.866, y: -0.5 } // 左上
        ],
        closePath: true,
        widthRatio: 1.3,  // 宽度比例
        heightRatio: 1.2    // 高度比例
      }
    }
  },
  {
    id: 'shape-triangle',
    name: '三角形',
    type: 'shape',
    category: '几何',
    tags: ['几何', '目标'],
    thumbnail: svgToDataUrl(triangleSvg),
    uploader: '官方',
    data: {
      type: 'triangle',
      svg: triangleSvg,
      render: {
        type: 'path',
        points: [
          { x: 0, y: -1.116 },    // 顶部
          { x: 1, y: 0.616 }, // 右下
          { x: -1, y: 0.616 } // 左下
        ],
        closePath: true,
        widthRatio: 2,
        heightRatio: 1.732
      }
    }
  },
  {
    id: 'shape-parallelogram',
    name: '平行四边形',
    type: 'shape',
    category: '几何',
    tags: ['几何', '数据'],
    thumbnail: svgToDataUrl(parallelogramSvg),
    uploader: '官方',
    data: {
      type: 'parallelogram',
      svg: parallelogramSvg,
      render: {
        type: 'path',
        points: [
          { x: -0.5, y: -0.5 }, // 左上
          { x: 0.7, y: -0.5 },  // 右上
          { x: 0.5, y: 0.5 },   // 右下
          { x: -0.7, y: 0.5 }   // 左下
        ],
        closePath: true,
        widthRatio: 2.5,
        heightRatio: 1.2
      }
    }
  },
  {
    id: 'shape-trapezoid',
    name: '等腰梯形',
    type: 'shape',
    category: '几何',
    tags: ['几何', '决策'],
    thumbnail: svgToDataUrl(trapezoidSvg),
    uploader: '官方',
    data: {
      type: 'trapezoid',
      svg: trapezoidSvg,
      render: {
        type: 'path',
        points: [
          { x: -0.4, y: -0.5 }, // 左上
          { x: 0.4, y: -0.5 },  // 右上
          { x: 0.6, y: 0.5 },   // 右下
          { x: -0.6, y: 0.5 }   // 左下
        ],
        closePath: true,
        widthRatio: 2.5,
        heightRatio: 1.2
      }
    }
  }
];

// 箭头连线 SVG
const arrowConnectorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4,12 L18,12 L15,9 M18,12 L15,15"/></svg>`;

// 阶梯连线 SVG
const stepConnectorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4,12 L9,12 L9,7 L15,7 L15,17 L20,17"/></svg>`;

// 双连线 SVG
const doubleConnectorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4,8 L20,8 M4,16 L20,16"/></svg>`;

// 点线连线 SVG
const dottedConnectorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="1,3,3,3" stroke-linecap="round" stroke-linejoin="round"><path d="M4,12 L20,12"/></svg>`;

// 内置连接线样式库
const connectorAssets: Asset[] = [
  {
    id: 'connector-arrow',
    name: '箭头连线',
    type: 'connector',
    category: '连接线',
    tags: ['箭头', '方向'],
    thumbnail: svgToDataUrl(arrowConnectorSvg),
    uploader: '官方',
    data: {
      type: 'arrow',
      svg: arrowConnectorSvg,
      render: {
        type: 'arrow',
        lineDash: [],
        lineWidth: 3,
        hasArrowHead: true,
        arrowSize: 10,
        // 绘制函数配置
        drawType: 'straight' // straight, curved, step
      }
    }
  },
  {
    id: 'connector-step',
    name: '阶梯连线',
    type: 'connector',
    category: '连接线',
    tags: ['阶梯', '流程图'],
    thumbnail: svgToDataUrl(stepConnectorSvg),
    uploader: '官方',
    data: {
      type: 'step',
      svg: stepConnectorSvg,
      render: {
        type: 'step',
        lineDash: [],
        lineWidth: 3,
        hasArrowHead: false,
        arrowSize: 0,
        drawType: 'step'
      }
    }
  },
  {
    id: 'connector-double',
    name: '双连线',
    type: 'connector',
    category: '连接线',
    tags: ['双线', '强调'],
    thumbnail: svgToDataUrl(doubleConnectorSvg),
    uploader: '官方',
    data: {
      type: 'double',
      svg: doubleConnectorSvg,
      render: {
        type: 'double',
        lineDash: [],
        lineWidth: 3,
        hasArrowHead: false,
        arrowSize: 0,
        drawType: 'double',
        doubleLine: true,
        lineGap: 6
      }
    }
  },
  {
    id: 'connector-dotted',
    name: '点线连线',
    type: 'connector',
    category: '连接线',
    tags: ['点线', '装饰'],
    thumbnail: svgToDataUrl(dottedConnectorSvg),
    uploader: '官方',
    data: {
      type: 'dotted',
      svg: dottedConnectorSvg,
      render: {
        type: 'dotted',
        lineDash: [2, 5, 10, 5],
        lineWidth: 3,
        hasArrowHead: false,
        arrowSize: 0,
        drawType: 'straight'
      }
    }
  }
];

// 生成四宫格图标组合 SVG 的函数
const generateIconSetSvg = (icons: { name: string; svg: string }[]): string => {
  // 图标尺寸 24x24，在 64x64 画布中居中排列 2x2 图标
  // 计算间距：(64 - 2*24) / 3 = 16/3 ≈ 5.33
  const positions = [
    { x: 8, y: 8 },     // 第一行第一个 (左上)
    { x: 36, y: 8 },    // 第一行第二个 (右上)
    { x: 8, y: 36 },    // 第二行第一个 (左下)
    { x: 36, y: 36 }    // 第二行第二个 (右下)
  ];
  
  const iconSvg = icons.slice(0, 4).map((icon, index) => {
    const pos = positions[index];
    // 提取 SVG 内容（去掉 svg 标签）
    const content = icon.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    return `<g transform="translate(${pos.x}, ${pos.y})"><g transform="scale(1)">${content}</g></g>`;
  }).join('');
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>`;
};

// 生成字体样式 SVG 的函数
const generateFontStyleSvg = (fontFamily: string, _fontSize: string, fontWeight: string): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="none">
  <rect width="100%" height="100%" fill="#3b82f6"/>
  <text x="32" y="28" font-family="${fontFamily}" font-size="10px" font-weight="${fontWeight}" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">字体预览</text>
  <text x="32" y="44" font-family="${fontFamily}" font-size="10px" font-weight="${fontWeight}" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">MindWeaver</text>
</svg>`;
};

// 生成配色方案 4x4 网格 SVG 的函数
const generateColorSchemeSvg = (colors: string[]): string => {
  // 4x4 网格，每个颜色块 16x16
  const squares = colors.slice(0, 16).map((color, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    const x = col * 16;
    const y = row * 16;
    return `<rect width="16" height="16" x="${x}" y="${y}" fill="${color}" stroke="#e0e0e0" stroke-width="0.5"/>`;
  }).join('');
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="none">${squares}</svg>`;
};

// 生成背景 SVG 的函数
const generateBackgroundSvg = (type: string, options: any): string => {
  if (type === 'gradient') {
    const { colors } = options;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      ${colors.map((color: string, index: number) => `<stop offset="${index * (100 / (colors.length - 1))}%" stop-color="${color}"/>`).join('')}
    </linearGradient>
  </defs>
  <rect width="64" height="64" x="0" y="0" fill="url(#gradient)"/>
</svg>`;
  } else if (type === 'grid') {
    const { size, color, backgroundColor } = options;
    const gridSize = parseInt(size);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" x="0" y="0" fill="${backgroundColor}"/>
  ${Array.from({ length: Math.ceil(64 / gridSize) }).map((_, i) => {
    const pos = i * gridSize;
    return `
  <line x1="0" y1="${pos}" x2="64" y2="${pos}" stroke="${color}" stroke-width="2"/>
  <line x1="${pos}" y1="0" x2="${pos}" y2="64" stroke="${color}" stroke-width="2"/>
`;
  }).join('')}
</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" x="0" y="0" fill="#f8f9fa"/></svg>`;
};

// 生成动画效果 SVG 的函数
const generateAnimationSvg = (type: string, options: any): string => {
  const { duration = '1s' } = options;
  
  // 通用圆形元素模板
  const createCircle = (animations: string) => {
    return `<circle cx="32" cy="32" r="8" fill="${THEME_COLOR}">${animations}</circle>`;
  };
  
  // 通用连接线元素模板
  const createLine = (x1: number, y1: number, x2: number, y2: number, animations: string) => {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${THEME_COLOR}" stroke-width="2">${animations}</line>`;
  };
  
  // 通用动画模板
  const createAnimation = (attribute: string, values: string, dur: string, begin: string = '0s') => {
    return `<animate attributeName="${attribute}" values="${values}" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>`;
  };
  

  
  // 带位置的圆形元素模板
  const createCircleAt = (cx: number, cy: number, animations: string) => {
    return `<circle cx="${cx}" cy="${cy}" r="8" fill="${THEME_COLOR}">${animations}</circle>`;
  };
  
  // 固定点和线位置的思维导图模板
  const createMindMapTemplate = (animations: string[]) => {
    return `
  ${createCircleAt(32, 40, animations[0])}
  ${createLine(32, 40, 16, 24, animations[1])}
  ${createLine(32, 40, 48, 24, animations[2])}
  ${createCircleAt(16, 24, animations[3])}
  ${createCircleAt(48, 24, animations[4])}
`;
  };
  
  if (type === 'fadeIn') {
    const animations = [
      createAnimation('opacity', '0;1', duration),
      createAnimation('r', '7.6;8;8', duration)
    ].join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  ${createCircle(animations)}
</svg>`;
  } else if (type === 'bounce') {
    const animations = [
      createAnimation('cy', '32;22;32', duration)
    ].join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  ${createCircle(animations)}
</svg>`;
  } else if (type === 'scaleIn') {
    const animations = [
      createAnimation('opacity', '0;1', duration),
      createAnimation('r', '6.4;8;8', duration)
    ].join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  ${createCircle(animations)}
</svg>`;

  } else if (type === 'nodeReveal') {
    const animations = [
      createAnimation('opacity', '0;1', duration, '0.4s'),
      createAnimation('opacity', '0;1', duration, '0.2s'),
      createAnimation('opacity', '0;1', duration, '0.6s'),
      createAnimation('opacity', '0;1', duration, '0s'),
      createAnimation('opacity', '0;1', duration, '0.8s')
    ];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  ${createMindMapTemplate(animations)}
</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" x="0" y="0" fill="#f8f9fa"/></svg>`;
};

// 商务图标组合数据
const businessIconSetData = {
  count: 12,
  style: 'flat',
  icons: [
    { name: 'Briefcase', svg: lucideBriefcaseSvg },
    { name: 'TrendingUp', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8 10 2 16 22 22"></polyline></svg>` },
    { name: 'BarChart3', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M12 17V5"></path><path d="M6 17v-3"></path></svg>` },
    { name: 'Users', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><path d="M16 3v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><path d="M4 9h16"></path></svg>` },
    { name: 'DollarSign', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>` },
    { name: 'Calendar', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>` },
    { name: 'FileText', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>` },
    { name: 'Phone', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>` },
    { name: 'Mail', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>` },
    { name: 'Shield', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>` },
    { name: 'Clock', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12,6 12,12 16,14"></polyline></svg>` },
    { name: 'MapPin', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>` }
  ]
};

// 科技图标组合数据
const techIconSetData = {
  count: 15,
  style: 'outline',
  icons: [
    { name: 'Cpu', svg: lucideCpuSvg },
    { name: 'Monitor', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>` },
    { name: 'Code', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>` },
    { name: 'Zap', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>` },
    { name: 'Wifi', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>` },
    { name: 'Cloud', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>` },
    { name: 'Database', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>` },
    { name: 'Server', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"></rect><rect width="20" height="8" x="2" y="14" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>` },
    { name: 'Network', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="10" height="10" x="2" y="2" rx="2" ry="2"></rect><rect width="10" height="10" x="12" y="12" rx="2" ry="2"></rect><path d="M8 12h4M12 8v4"></path></svg>` },
    { name: 'Globe', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>` },
    { name: 'Satellite', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path><path d="M12 6v6l4 2"></path></svg>` },
    { name: 'Radio', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 6v6l4 2"></path></svg>` },
    { name: 'Camera', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>` },
    { name: 'Headphones', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"></path><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>` },
    { name: 'Microchip', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v-4"></path><path d="M12 8v4"></path><path d="M17 12h-4"></path><path d="M11 12H7"></path><path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z"></path></svg>` }
  ]
};

// 内置图标组合库
const iconSetAssets: Asset[] = [
  {
    id: 'iconSet-business',
    name: '商务图标组合',
    type: 'iconSet',
    category: '商务',
    tags: ['商务', '专业'],
    thumbnail: svgToDataUrl(generateIconSetSvg(businessIconSetData.icons)),
    uploader: '官方',
    data: businessIconSetData
  },
  {
    id: 'iconSet-tech',
    name: '科技图标组合',
    type: 'iconSet',
    category: '科技',
    tags: ['科技', '未来'],
    thumbnail: svgToDataUrl(generateIconSetSvg(techIconSetData.icons)),
    uploader: '官方',
    data: techIconSetData
  }
];



// 内置配色方案库
const colorSchemeAssets: Asset[] = [
  {
    id: 'colorScheme-ocean',
    name: '海洋蓝调',
    type: 'colorScheme',
    category: '配色',
    tags: ['蓝色', '海洋'],
    thumbnail: svgToDataUrl(generateColorSchemeSvg([
      // 第1行：最深
      '#004B70', '#006491', '#0077B6', '#0096C7',
      // 第2行
      '#0087AD', '#00A0C6', '#00B4D8', '#00D4FF',
      // 第3行
      '#60D0ED', '#80D8EF', '#90E0EF', '#BDE8F5',
      // 第4行：最浅
      '#A4E6FC', '#B8EEFC', '#CAF0F8', '#E6F9FF'
    ])),
    uploader: '官方',
    data: {
      colors: [
        // 第1行：最深
        '#004B70', '#006491', '#0077B6', '#0096C7',
        // 第2行
        '#0087AD', '#00A0C6', '#00B4D8', '#00D4FF',
        // 第3行
        '#60D0ED', '#80D8EF', '#90E0EF', '#BDE8F5',
        // 第4行：最浅
        '#A4E6FC', '#B8EEFC', '#CAF0F8', '#E6F9FF'
      ]
    }
  },
  {
    id: 'colorScheme-forest',
    name: '森林绿调',
    type: 'colorScheme',
    category: '配色',
    tags: ['绿色', '自然'],
    thumbnail: svgToDataUrl(generateColorSchemeSvg([
      // 第1行：最深
      '#1A4430', '#23573F', '#2D6A4F', '#387E5D',
      // 第2行
      '#296749', '#36835F', '#40916C', '#4A9F7A',
      // 第3行
      '#3DA36E', '#4BB37D', '#52B788', '#5EC395',
      // 第4行：最浅
      '#58B782', '#6BC791', '#74C69D', '#84D3A9'
    ])),
    uploader: '官方',
    data: {
      colors: [
        // 第1行：最深
        '#1A4430', '#23573F', '#2D6A4F', '#387E5D',
        // 第2行
        '#296749', '#36835F', '#40916C', '#4A9F7A',
        // 第3行
        '#3DA36E', '#4BB37D', '#52B788', '#5EC395',
        // 第4行：最浅
        '#58B782', '#6BC791', '#74C69D', '#84D3A9'
      ]
    }
  }
];

// 内置导图背景库
const backgroundAssets: Asset[] = [
  {
    id: 'background-dusk',
    name: '暮色渐变',
    type: 'background',
    category: '背景',
    tags: ['渐变', '现代'],
    thumbnail: svgToDataUrl(generateBackgroundSvg('gradient', { colors: ['#667eea', '#764ba2'] })),
    uploader: '官方',
    data: { type: 'gradient', colors: ['#667eea', '#764ba2'] }
  },
  {
    id: 'background-grid',
    name: '格子图案',
    type: 'background',
    category: '背景',
    tags: ['格子', '图案'],
    thumbnail: svgToDataUrl(generateBackgroundSvg('grid', { size: '20px', color: '#cccccc', backgroundColor: '#ffffff' })),
    uploader: '官方',
    data: { type: 'grid', size: '20px', color: '#cccccc', backgroundColor: '#ffffff' }
  },
  {
    id: 'background-sky',
    name: '天空渐变',
    type: 'background',
    category: '背景',
    tags: ['渐变', '自然'],
    thumbnail: svgToDataUrl(generateBackgroundSvg('gradient', { colors: ['#87CEEB', '#E0F7FA'] })),
    uploader: '官方',
    data: { type: 'gradient', colors: ['#87CEEB', '#E0F7FA'] }
  },
  {
    id: 'background-sunset',
    name: '夕阳渐变',
    type: 'background',
    category: '背景',
    tags: ['渐变', '温暖'],
    thumbnail: svgToDataUrl(generateBackgroundSvg('gradient', { colors: ['#FFB6C1', '#FFD700'] })),
    uploader: '官方',
    data: { type: 'gradient', colors: ['#FFB6C1', '#FFD700'] }
  }
];

// 内置动画效果库
const animationAssets: Asset[] = [
  {
    id: 'animation-fade-in',
    name: '淡入效果',
    type: 'animation',
    category: '动画',
    tags: ['淡入', '平滑'],
    thumbnail: svgToDataUrl(generateAnimationSvg('fadeIn', { duration: '1000ms' })),
    uploader: '官方',
    data: {
      type: 'fadeIn',
      duration: '3000ms',
      easing: 'ease-out',
      keyframes: [
        { opacity: 0, transform: 'scale(0.95)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      applyTo: 'all' // 应用到所有元素
    }
  },
  {
    id: 'animation-bounce',
    name: '弹跳效果',
    type: 'animation',
    category: '动画',
    tags: ['弹跳', '活泼'],
    thumbnail: svgToDataUrl(generateAnimationSvg('bounce', { duration: '1000ms' })),
    uploader: '官方',
    data: {
      type: 'bounce',
      duration: '3000ms',
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      keyframes: [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-10px)' },
        { transform: 'translateY(0)' }
      ],
      applyTo: 'all',
      frequency: 1 // 弹跳频率
    }
  },
  {
    id: 'animation-scale-in',
    name: '缩放效果',
    type: 'animation',
    category: '动画',
    tags: ['缩放', '聚焦'],
    thumbnail: svgToDataUrl(generateAnimationSvg('scaleIn', { duration: '1000ms' })),
    uploader: '官方',
    data: {
      type: 'scaleIn',
      duration: '3000ms',
      easing: 'ease-out',
      keyframes: [
        { opacity: 0, transform: 'scale(0.8)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      applyTo: 'all'
    }
  },

  {
    id: 'animation-node-reveal',
    name: '节点揭示',
    type: 'animation',
    category: '动画',
    tags: ['节点', '连接线'],
    thumbnail: svgToDataUrl(generateAnimationSvg('nodeReveal', { duration: '1000ms' })),
    uploader: '官方',
    data: {
      type: 'nodeReveal',
      duration: '3000ms',
      easing: 'ease-out',
      sequence: [
        { selector: '.mindmap-node:nth-child(1)', delay: '0ms' },
        { selector: '.mindmap-connector:nth-child(1)', delay: '250ms' },
        { selector: '.mindmap-node:nth-child(2)', delay: '500ms' },
        { selector: '.mindmap-connector:nth-child(2)', delay: '750ms' },
        { selector: '.mindmap-node:nth-child(3)', delay: '1000ms' }
      ],
      keyframes: [
        { opacity: 0, transform: 'scale(0.8)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      applyTo: 'sequence' // 按顺序应用
    }
  }
];

// 内置字体样式素材
const fontStyleAssets: Asset[] = [
  {
    id: 'fontStyle-aa-hou-di-hei',
    name: 'Aa厚底黑',
    type: 'fontStyle',
    category: '字体',
    tags: ['黑体', '厚重'],
    thumbnail: svgToDataUrl(generateFontStyleSvg('AaHouDiHei', '12px', '400')),
    uploader: '官方',
    data: {
      fontFamily: 'AaHouDiHei',
      fontSize: '16px',
      fontWeight: '400'
    }
  },
  {
    id: 'fontStyle-hui-wen-ming-chao',
    name: '汇文明朝体',
    type: 'fontStyle',
    category: '字体',
    tags: ['宋体', '古典'],
    thumbnail: svgToDataUrl(generateFontStyleSvg('HuiWenMingChao', '12px', '400')),
    uploader: '官方',
    data: {
      fontFamily: 'HuiWenMingChao',
      fontSize: '16px',
      fontWeight: '400'
    }
  },
  {
    id: 'fontStyle-source-han-serif-cn-bold',
    name: '思源宋体 Bold',
    type: 'fontStyle',
    category: '字体',
    tags: ['宋体', '粗体'],
    thumbnail: svgToDataUrl(generateFontStyleSvg('SourceHanSerifCN', '12px', '700')),
    uploader: '官方',
    data: {
      fontFamily: 'SourceHanSerifCN',
      fontSize: '16px',
      fontWeight: '700'
    }
  },
  {
    id: 'fontStyle-gen-juu-gothic-bold',
    name: '思源柔黑 Bold',
    type: 'fontStyle',
    category: '字体',
    tags: ['圆体', '粗体'],
    thumbnail: svgToDataUrl(generateFontStyleSvg('GenJyuuGothic', '12px', '700')),
    uploader: '官方',
    data: {
      fontFamily: 'GenJyuuGothic',
      fontSize: '16px',
      fontWeight: '700'
    }
  },
  {
    id: 'fontStyle-hui-wen-zheng-kai',
    name: '汇文正楷',
    type: 'fontStyle',
    category: '字体',
    tags: ['楷体', '书法'],
    thumbnail: svgToDataUrl(generateFontStyleSvg('HuiWenZhengKai', '12px', '400')),
    uploader: '官方',
    data: {
      fontFamily: 'HuiWenZhengKai',
      fontSize: '16px',
      fontWeight: '400'
    }
  },
  {
    id: 'fontStyle-tanugo-bold',
    name: 'Tanugo手写体 Bold',
    type: 'fontStyle',
    category: '字体',
    tags: ['手写', '创意'],
    thumbnail: svgToDataUrl(generateFontStyleSvg('Tanugo', '12px', '700')),
    uploader: '官方',
    data: {
      fontFamily: 'Tanugo',
      fontSize: '16px',
      fontWeight: '700'
    }
  }
];

const builtInAssets: Asset[] = [...iconAssets, ...shapeAssets, ...connectorAssets, ...iconSetAssets, ...fontStyleAssets, ...colorSchemeAssets, ...backgroundAssets, ...animationAssets];

// 导入API服务
import { apiService } from '../api/ApiService';

// 素材服务类
class AssetService {
  private STORAGE_KEY = 'mindweaver_favorite_assets';
  private USER_ASSETS_KEY = 'mindweaver_user_assets';
  private favoriteAssets: Asset[] = [];
  private userAssets: Asset[] = [];
  private apiAvailable: boolean = false;
  
  constructor() {
    // 初始化时检查API是否可用
    this.checkApiAvailability();
    // 初始化时加载收藏的素材
    this.favoriteAssets = this.loadFavoriteAssets();
    // 初始化时同步加载用户上传的素材
    this.userAssets = this.loadUserAssetsFromLocal();
    // 异步加载（从API或本地）
    this.loadUserAssetsAsync();
  }
  
  // 检查API是否可用
  private async checkApiAvailability() {
    this.apiAvailable = await apiService.isApiAvailable();
    console.log('API可用性:', this.apiAvailable);
  }
  
  // 异步加载用户上传的素材
  private async loadUserAssetsAsync() {
    try {
      if (this.apiAvailable) {
        const response = await apiService.getAssets();
        if (response.success && response.assets) {
          this.userAssets = response.assets as Asset[];
          // 同时保存到本地作为备份
          this.saveUserAssetsToLocal(this.userAssets);
          return;
        }
      }
      // 降级到本地存储
      this.userAssets = this.loadUserAssetsFromLocal();
    } catch (error) {
      console.error('加载用户素材失败:', error);
      // 降级到本地存储
      this.userAssets = this.loadUserAssetsFromLocal();
    }
  }
  
  // 获取所有素材（包含内置、收藏的和用户上传的）
  getAllAssets(): Asset[] {
    const allAssetIds = new Set<string>();
    const result: Asset[] = [];
    
    // 先添加内置素材
    builtInAssets.forEach(asset => {
      if (!allAssetIds.has(asset.id)) {
        allAssetIds.add(asset.id);
        result.push(asset);
      }
    });
    
    // 再添加用户上传的素材（避免重复）
    this.userAssets.forEach(asset => {
      if (!allAssetIds.has(asset.id)) {
        allAssetIds.add(asset.id);
        result.push(asset);
      }
    });
    
    // 最后添加收藏的素材（避免重复）
    this.favoriteAssets.forEach(asset => {
      if (!allAssetIds.has(asset.id)) {
        allAssetIds.add(asset.id);
        result.push(asset);
      }
    });
    
    return result;
  }

  // 获取所有素材的合并列表
  private getCombinedAssets(): Asset[] {
    return this.getAllAssets();
  }

  // 根据类型获取素材
  getAssetsByType(type: Asset['type']): Asset[] {
    return this.getCombinedAssets().filter(asset => asset.type === type);
  }

  // 根据分类获取素材
  getAssetsByCategory(category: string): Asset[] {
    return this.getCombinedAssets().filter(asset => asset.category === category);
  }

  // 根据标签搜索素材
  searchAssetsByTag(tag: string): Asset[] {
    return this.getCombinedAssets().filter(asset => asset.tags.includes(tag));
  }

  // 根据关键词搜索素材
  searchAssets(keyword: string): Asset[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.getCombinedAssets().filter(asset => 
      asset.name.toLowerCase().includes(lowerKeyword) ||
      asset.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
      asset.category.toLowerCase().includes(lowerKeyword)
    );
  }

  // 根据ID获取素材
  getAssetById(id: string): Asset | undefined {
    const combinedAssets = this.getCombinedAssets();
    return combinedAssets.find(asset => asset.id === id);
  }

  // 获取素材类型列表
  getAssetTypes(): string[] {
    return Array.from(new Set(this.getCombinedAssets().map(asset => asset.type)));
  }

  // 获取素材分类列表
  getAssetCategories(): string[] {
    return Array.from(new Set(this.getCombinedAssets().map(asset => asset.category)));
  }

  // 获取所有标签（按首字母自动排序）
  getAllTags(): string[] {
    const tags = new Set<string>();
    this.getCombinedAssets().forEach(asset => {
      asset.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }

  // 异步版本：根据类型获取素材（包含系统字体）
  async getAssetsByTypeWithSystemFonts(type: Asset['type']): Promise<Asset[]> {
    const assets = await this.getAllAssetsWithSystemFonts();
    return assets.filter(asset => asset.type === type);
  }

  // 异步版本：根据分类获取素材（包含系统字体）
  async getAssetsByCategoryWithSystemFonts(category: string): Promise<Asset[]> {
    const assets = await this.getAllAssetsWithSystemFonts();
    return assets.filter(asset => asset.category === category);
  }

  // 异步版本：根据标签搜索素材（包含系统字体）
  async searchAssetsByTagWithSystemFonts(tag: string): Promise<Asset[]> {
    const assets = await this.getAllAssetsWithSystemFonts();
    return assets.filter(asset => asset.tags.includes(tag));
  }

  // 异步版本：根据关键词搜索素材（包含系统字体）
  async searchAssetsWithSystemFonts(keyword: string): Promise<Asset[]> {
    const assets = await this.getAllAssetsWithSystemFonts();
    const lowerKeyword = keyword.toLowerCase();
    return assets.filter(asset => 
      asset.name.toLowerCase().includes(lowerKeyword) ||
      asset.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
      asset.category.toLowerCase().includes(lowerKeyword)
    );
  }

  // 异步版本：根据ID获取素材（包含系统字体）
  async getAssetByIdWithSystemFonts(id: string): Promise<Asset | undefined> {
    const assets = await this.getAllAssetsWithSystemFonts();
    return assets.find(asset => asset.id === id);
  }

  // 异步版本：获取素材类型列表（包含系统字体）
  async getAssetTypesWithSystemFonts(): Promise<string[]> {
    const assets = await this.getAllAssetsWithSystemFonts();
    return Array.from(new Set(assets.map(asset => asset.type)));
  }

  // 异步版本：获取素材分类列表（包含系统字体）
  async getAssetCategoriesWithSystemFonts(): Promise<string[]> {
    const assets = await this.getAllAssetsWithSystemFonts();
    return Array.from(new Set(assets.map(asset => asset.category)));
  }

  // 异步版本：获取所有标签（包含系统字体）
  async getAllTagsWithSystemFonts(): Promise<string[]> {
    const assets = await this.getAllAssetsWithSystemFonts();
    const tags = new Set<string>();
    assets.forEach(asset => {
      asset.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }

  // 保存收藏的素材
  saveFavoriteAssets(assets: Asset[]): void {
    try {
      this.favoriteAssets = assets;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(assets));
    } catch (e) {
      console.error('Failed to save favorite assets:', e);
    }
  }

  // 加载收藏的素材
  loadFavoriteAssets(): Asset[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load favorite assets:', e);
    }
    // 默认返回一些内置素材
    return builtInAssets.filter(asset => ['icon-lightbulb', 'icon-briefcase'].includes(asset.id));
  }

  // 保存用户上传的素材到本地存储
  private saveUserAssetsToLocal(assets: Asset[]): void {
    try {
      localStorage.setItem(this.USER_ASSETS_KEY, JSON.stringify(assets));
    } catch (e) {
      console.error('Failed to save user assets to local storage:', e);
    }
  }

  // 从本地存储加载用户上传的素材
  private loadUserAssetsFromLocal(): Asset[] {
    try {
      const stored = localStorage.getItem(this.USER_ASSETS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load user assets from local storage:', e);
    }
    return [];
  }

  // 保存用户上传的素材
  async saveUserAssets(assets: Asset[]): Promise<void> {
    try {
      this.userAssets = assets;
      
      if (this.apiAvailable) {
        // 这里可以实现批量上传逻辑
        // 目前我们只保存到本地，因为上传逻辑在AssetUploadDialog中处理
      }
      
      // 保存到本地作为备份
      this.saveUserAssetsToLocal(assets);
    } catch (e) {
      console.error('Failed to save user assets:', e);
    }
  }

  // 加载用户上传的素材
  loadUserAssets(): Asset[] {
    return this.userAssets;
  }

  // 获取用户上传的素材
  getUserAssets(): Asset[] {
    return this.userAssets;
  }

  // 上传素材到服务端
  async uploadAsset(file: File, name: string, type: Asset['type'], tags: string[]): Promise<Asset | null> {
    try {
      if (this.apiAvailable) {
        const response = await apiService.uploadAsset(file, name, type, tags);
        if (response.success && response.asset) {
          // 更新本地素材列表
          this.userAssets.push(response.asset as Asset);
          await this.saveUserAssets(this.userAssets);
          return response.asset as Asset;
        }
      }
      return null;
    } catch (error) {
      console.error('上传素材失败:', error);
      return null;
    }
  }

  // 删除素材
  async deleteAsset(assetId: string): Promise<boolean> {
    try {
      if (this.apiAvailable) {
        const response = await apiService.deleteAsset(assetId);
        if (response.success) {
          // 更新本地素材列表
          this.userAssets = this.userAssets.filter(asset => asset.id !== assetId);
          await this.saveUserAssets(this.userAssets);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('删除素材失败:', error);
      return false;
    }
  }

  // 根据图标名称从图标组合中查找 SVG
  getIconSvgByName(iconName: string): string | null {
    // 查找所有图标组合
    const iconSets = this.getAssetsByType('iconSet');
    
    for (const iconSet of iconSets) {
      if (iconSet.data?.icons) {
        const icon = iconSet.data.icons.find((i: any) => i.name === iconName);
        if (icon?.svg) {
          return icon.svg;
        }
      }
    }
    
    return null;
  }

  // 获取用户系统字体
  async getUserSystemFonts(): Promise<Asset[]> {
    try {
      // 检查浏览器是否支持queryLocalFonts API
      if (typeof window !== 'undefined' && 'queryLocalFonts' in window) {
        // @ts-ignore - queryLocalFonts API 可能未在TypeScript定义中
        const fonts = await window.queryLocalFonts();
        
        // 转换为Asset格式
        return fonts.map((font: any, index: number) => ({
          id: `system-font-${index}-${font.family.replace(/\s+/g, '-').toLowerCase()}`,
          name: font.family,
          type: 'fontStyle' as const,
          category: '系统字体',
          tags: ['系统', '字体'],
          thumbnail: svgToDataUrl(generateFontStyleSvg(font.family, '16px', '400')),
          uploader: '系统',
          data: { fontFamily: font.family, fontSize: '16px', fontWeight: '400' }
        }));
      }
    } catch (error) {
      console.error('Failed to get system fonts:', error);
    }
    return [];
  }

  // 获取所有素材（包含内置、用户上传、收藏和系统字体）
  async getAllAssetsWithSystemFonts(): Promise<Asset[]> {
    const allAssetIds = new Set<string>();
    const result: Asset[] = [];
    
    // 先添加内置素材
    builtInAssets.forEach(asset => {
      if (!allAssetIds.has(asset.id)) {
        allAssetIds.add(asset.id);
        result.push(asset);
      }
    });
    
    // 再添加用户上传的素材（避免重复）
    this.userAssets.forEach(asset => {
      if (!allAssetIds.has(asset.id)) {
        allAssetIds.add(asset.id);
        result.push(asset);
      }
    });
    
    // 再添加收藏的素材（避免重复）
    this.favoriteAssets.forEach(asset => {
      if (!allAssetIds.has(asset.id)) {
        allAssetIds.add(asset.id);
        result.push(asset);
      }
    });
    
    // 最后添加系统字体
    const systemFonts = await this.getUserSystemFonts();
    systemFonts.forEach(font => {
      if (!allAssetIds.has(font.id)) {
        allAssetIds.add(font.id);
        result.push(font);
      }
    });
    
    return result;
  }
}

// 导出单例实例
export const assetService = new AssetService();
