// Cloudflare Worker 主入口文件
// 用于提供静态资产服务

// 导入资产（这些会在部署时被 Wrangler 替换为实际的资产内容）
const assetManifest = require('./dist/asset-manifest.json');

// 处理请求
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// 请求处理函数
async function handleRequest(request) {
  const url = new URL(request.url);
  let path = url.pathname;
  
  // 根路径返回 index.html
  if (path === '/') {
    path = '/index.html';
  }
  
  // 尝试从资产中获取请求的文件
  try {
    // 检查资产清单
    if (assetManifest.files[path]) {
      // 从资产清单中获取实际的文件路径
      const assetPath = assetManifest.files[path];
      // 获取资产内容
      const asset = await getAsset(assetPath);
      
      // 返回资产响应
      return new Response(asset.body, {
        headers: {
          'Content-Type': getContentType(path),
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }
    
    // 如果请求的文件不存在，返回 404
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  } catch (error) {
    // 处理错误
    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
}

// 获取资产内容（这个函数会在部署时被 Wrangler 替换）
async function getAsset(path) {
  // 这是一个占位函数，实际实现会由 Wrangler 提供
  throw new Error('Asset not found');
}

// 根据文件路径获取内容类型
function getContentType(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  
  const contentTypes = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'pdf': 'application/pdf',
    'txt': 'text/plain'
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}
