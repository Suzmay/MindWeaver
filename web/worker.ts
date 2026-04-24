export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

interface Env {
  ASSETS: Fetcher;
  ASSETS_KV: KVNamespace;
  WORKS_KV: KVNamespace;
  ASSETS_R2: R2Bucket;
  USERS_KV: KVNamespace;
  VERIFICATION_CODES_KV: KVNamespace;
  TOKEN_BLACKLIST_KV: KVNamespace;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
  JWT_SECRET: string;
  GH_CLIENT_ID: string;
  GH_CLIENT_SECRET: string;
}

interface Fetcher {
  fetch: (request: Request) => Promise<Response>;
}

interface ExportedHandler<Env> {
  fetch: (request: Request, env: Env) => Promise<Response>;
}

type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
};

type R2Bucket = {
  put(key: string, value: any, options?: any): Promise<void>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<void>;
};

async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      }
    });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/health") {
    return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  if (path === "/api/auth/send-code" && request.method === "POST") {
    const { email, type } = await request.json();
    if (!email || !type) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const code = Math.random().toString().slice(2, 8);
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await env.VERIFICATION_CODES_KV.put(`${email}_${type}`, JSON.stringify({ code, expiresAt }), {
      expirationTtl: 10 * 60,
    });

    console.log(`Verification code for ${email} (${type}): ${code}`);

    return new Response(JSON.stringify({ success: true, message: '验证码已发送' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  return new Response(JSON.stringify({ error: "API 端点不存在" }), {
    status: 404,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}