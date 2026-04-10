// Cloudflare Worker 主入口文件
// 使用 TypeScript 语法，标准的 ASSETS 绑定处理静态资产

// 定义 Fetcher 接口
interface Fetcher {
  fetch: (request: Request) => Promise<Response>;
}

// Worker 环境接口
interface Env {
  ASSETS: Fetcher;
  ASSETS_KV: KVNamespace; // 用于存储素材元数据
  WORKS_KV: KVNamespace; // 用于存储作品数据
  ASSETS_R2: R2Bucket; // 用于存储素材文件
}

// 添加 CORS 头
function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, cache-control");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// 处理 OPTIONS 请求
function handleOptions(): Response {
  return addCorsHeaders(new Response(null, {
    status: 204,
    headers: { "Content-Type": "text/plain" }
  }));
}

// 处理 API 请求
async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  // 处理 OPTIONS 请求
  if (request.method === "OPTIONS") {
    return handleOptions();
  }
  
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 健康检查端点
  if (path === "/api/health") {
    const response = new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
      headers: { "Content-Type": "application/json" }
    });
    return addCorsHeaders(response);
  }
  
  // 素材管理 API
  if (path.startsWith("/api/assets/")) {
    const assetPath = path.substring(11); // 移除 "/api/assets/"
    
    // 素材上传
    if (assetPath === "upload" && request.method === "POST") {
      const response = await handleAssetUpload(request, env);
      return addCorsHeaders(response);
    }
    
    // 素材列表
    if (assetPath === "list" && request.method === "GET") {
      const response = await handleAssetList(env);
      return addCorsHeaders(response);
    }
    
    // 素材删除
    if (assetPath.startsWith("delete/") && request.method === "DELETE") {
      const assetId = assetPath.substring(7);
      const response = await handleAssetDelete(assetId, env);
      return addCorsHeaders(response);
    }
    
    // 素材预览
    if (assetPath.startsWith("preview/") && request.method === "GET") {
      const assetId = assetPath.substring(8);
      const response = await handleAssetPreview(assetId, env);
      return addCorsHeaders(response);
    }
  }
  
  // 作品管理 API
  if (path.startsWith("/api/works/")) {
    const workPath = path.substring(11); // 移除 "/api/works/"
    
    // 作品创建
    if (workPath === "" && request.method === "POST") {
      const response = await handleWorkCreate(request, env);
      return addCorsHeaders(response);
    }
    
    // 作品列表
    if (workPath === "" && request.method === "GET") {
      const response = await handleWorkList(env);
      return addCorsHeaders(response);
    }
    
    // 作品详情
    if (!workPath.includes("/") && request.method === "GET") {
      const workId = workPath;
      const response = await handleWorkGet(workId, env);
      return addCorsHeaders(response);
    }
    
    // 作品更新
    if (!workPath.includes("/") && request.method === "PUT") {
      const workId = workPath;
      const response = await handleWorkUpdate(workId, request, env);
      return addCorsHeaders(response);
    }
    
    // 作品删除
    if (!workPath.includes("/") && request.method === "DELETE") {
      const workId = workPath;
      const response = await handleWorkDelete(workId, env);
      return addCorsHeaders(response);
    }
  }
  
  // 未找到的 API 端点
  const response = new Response(JSON.stringify({ error: "API 端点不存在" }), {
    status: 404,
    headers: { "Content-Type": "application/json" }
  });
  return addCorsHeaders(response);
}

// 处理素材上传
async function handleAssetUpload(request: Request, env: Env): Promise<Response> {
  try {
    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const type = formData.get("type") as string;
    const tags = formData.get("tags") as string;
    
    if (!file || !name || !type) {
      return new Response(JSON.stringify({ error: "缺少必要参数" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 生成唯一 ID
    const assetId = Date.now().toString();
    
    // 存储文件到 R2
    const fileKey = `assets/${assetId}/${file.name}`;
    await env.ASSETS_R2.put(fileKey, file, {
      httpMetadata: { contentType: file.type }
    });
    
    // 存储素材元数据到 KV
    const assetData = {
      id: assetId,
      name,
      type,
      tags: tags ? JSON.parse(tags) : [],
      fileName: file.name,
      fileType: file.type,
      fileKey,
      createdAt: new Date().toISOString()
    };
    await env.ASSETS_KV.put(`asset:${assetId}`, JSON.stringify(assetData));
    
    // 存储素材 ID 列表
    const assetList = await env.ASSETS_KV.get("assets:list");
    const assets = assetList ? JSON.parse(assetList) : [];
    assets.push(assetId);
    await env.ASSETS_KV.put("assets:list", JSON.stringify(assets));
    
    return new Response(JSON.stringify({ success: true, asset: assetData }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("上传失败:", error);
    return new Response(JSON.stringify({ error: "上传失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 处理素材列表
async function handleAssetList(env: Env): Promise<Response> {
  try {
    const assetList = await env.ASSETS_KV.get("assets:list");
    const assetIds = assetList ? JSON.parse(assetList) : [];
    
    const assets = [];
    for (const assetId of assetIds) {
      const assetData = await env.ASSETS_KV.get(`asset:${assetId}`);
      if (assetData) {
        assets.push(JSON.parse(assetData));
      }
    }
    
    return new Response(JSON.stringify({ success: true, assets }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("获取素材列表失败:", error);
    return new Response(JSON.stringify({ error: "获取素材列表失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 处理素材删除
async function handleAssetDelete(assetId: string, env: Env): Promise<Response> {
  try {
    // 获取素材元数据
    const assetData = await env.ASSETS_KV.get(`asset:${assetId}`);
    if (!assetData) {
      return new Response(JSON.stringify({ error: "素材不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const asset = JSON.parse(assetData);
    
    // 从 R2 删除文件
    if (asset.fileKey) {
      await env.ASSETS_R2.delete(asset.fileKey);
    }
    
    // 从 KV 删除元数据
    await env.ASSETS_KV.delete(`asset:${assetId}`);
    
    // 更新素材 ID 列表
    const assetList = await env.ASSETS_KV.get("assets:list");
    const assets = assetList ? JSON.parse(assetList) : [];
    const updatedAssets = assets.filter((id: string) => id !== assetId);
    await env.ASSETS_KV.put("assets:list", JSON.stringify(updatedAssets));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("删除素材失败:", error);
    return new Response(JSON.stringify({ error: "删除素材失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 处理素材预览
async function handleAssetPreview(assetId: string, env: Env): Promise<Response> {
  try {
    // 获取素材元数据
    const assetData = await env.ASSETS_KV.get(`asset:${assetId}`);
    if (!assetData) {
      return new Response(JSON.stringify({ error: "素材不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const asset = JSON.parse(assetData);
    
    // 对于字体类型，生成预览
    if (asset.type === "fontStyle") {
      // 这里可以实现字体预览生成逻辑
      // 暂时返回一个占位预览
      const previewSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <text x="100" y="80" font-size="24" text-anchor="middle" fill="white">字体预览</text>
        <text x="100" y="120" font-size="20" text-anchor="middle" fill="white">MindWeaver</text>
      </svg>`;
      
      return new Response(previewSvg, {
        headers: { "Content-Type": "image/svg+xml" }
      });
    }
    
    // 对于其他类型，返回文件
    if (asset.fileKey) {
      const object = await env.ASSETS_R2.get(asset.fileKey);
      if (object) {
        return new Response(object.body, {
          headers: { "Content-Type": asset.fileType }
        });
      }
    }
    
    return new Response(JSON.stringify({ error: "预览失败" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("获取预览失败:", error);
    return new Response(JSON.stringify({ error: "获取预览失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 处理作品创建
async function handleWorkCreate(request: Request, env: Env): Promise<Response> {
  try {
    const workData = await request.json();
    
    // 生成唯一 ID
    const workId = Date.now().toString();
    
    // 构建作品数据
    const work = {
      id: workId,
      title: workData.title || "未命名作品",
      category: workData.category || "个人",
      tags: workData.tags || [],
      nodes: workData.nodes || 0,
      layout: workData.layout || { mode: "tree", direction: "right" },
      encryptedData: workData.encryptedData || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 存储作品到 KV
    await env.WORKS_KV.put(`work:${workId}`, JSON.stringify(work));
    
    // 存储作品 ID 列表
    const workList = await env.WORKS_KV.get("works:list");
    const works = workList ? JSON.parse(workList) : [];
    works.push(workId);
    await env.WORKS_KV.put("works:list", JSON.stringify(works));
    
    return new Response(JSON.stringify({ success: true, work }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("创建作品失败:", error);
    return new Response(JSON.stringify({ error: "创建作品失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 处理作品列表
async function handleWorkList(env: Env): Promise<Response> {
  try {
    const workList = await env.WORKS_KV.get("works:list");
    const workIds = workList ? JSON.parse(workList) : [];
    
    const works = [];
    for (const workId of workIds) {
      const workData = await env.WORKS_KV.get(`work:${workId}`);
      if (workData) {
        works.push(JSON.parse(workData));
      }
    }
    
    return new Response(JSON.stringify({ success: true, works }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("获取作品列表失败:", error);
    return new Response(JSON.stringify({ error: "获取作品列表失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 处理作品详情
async function handleWorkGet(workId: string, env: Env): Promise<Response> {
  try {
    const workData = await env.WORKS_KV.get(`work:${workId}`);
    if (!workData) {
      return new Response(JSON.stringify({ error: "作品不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const work = JSON.parse(workData);
    return new Response(JSON.stringify({ success: true, work }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("获取作品详情失败:", error);
    return new Response(JSON.stringify({ error: "获取作品详情失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 处理作品更新
async function handleWorkUpdate(workId: string, request: Request, env: Env): Promise<Response> {
  try {
    // 检查作品是否存在
    const existingWorkData = await env.WORKS_KV.get(`work:${workId}`);
    if (!existingWorkData) {
      return new Response(JSON.stringify({ error: "作品不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const existingWork = JSON.parse(existingWorkData);
    const updateData = await request.json();
    
    // 更新作品数据
    const updatedWork = {
      ...existingWork,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // 存储更新后的作品
    await env.WORKS_KV.put(`work:${workId}`, JSON.stringify(updatedWork));
    
    return new Response(JSON.stringify({ success: true, work: updatedWork }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("更新作品失败:", error);
    return new Response(JSON.stringify({ error: "更新作品失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 处理作品删除
async function handleWorkDelete(workId: string, env: Env): Promise<Response> {
  try {
    // 检查作品是否存在
    const workData = await env.WORKS_KV.get(`work:${workId}`);
    if (!workData) {
      return new Response(JSON.stringify({ error: "作品不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 从 KV 删除作品
    await env.WORKS_KV.delete(`work:${workId}`);
    
    // 更新作品 ID 列表
    const workList = await env.WORKS_KV.get("works:list");
    const works = workList ? JSON.parse(workList) : [];
    const updatedWorks = works.filter((id: string) => id !== workId);
    await env.WORKS_KV.put("works:list", JSON.stringify(updatedWorks));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("删除作品失败:", error);
    return new Response(JSON.stringify({ error: "删除作品失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 处理 API 请求
    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, env);
    }

    // 其他请求都交给静态资源处理
    // Workers 会自动处理缓存、压缩等优化
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

// TypeScript 类型定义
interface ExportedHandler<Env> {
  fetch: (request: Request, env: Env) => Promise<Response>;
}

// 扩展类型定义
type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
};

type R2Bucket = {
  put(key: string, value: any, options?: any): Promise<void>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<void>;
};