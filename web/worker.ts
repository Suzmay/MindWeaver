// Cloudflare Worker 主入口文件
// 使用 TypeScript 语法，标准的 ASSETS 绑定处理静态资产

// 定义 Fetcher 接口
interface Fetcher {
  fetch: (request: Request) => Promise<Response>;
}

// Worker 环境接口
interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 预留 API 路由，方便未来扩展
    if (url.pathname.startsWith("/api/")) {
      // 现在先返回个友好的提示
      return new Response("API 功能开发中，敬请期待! 🚧");
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