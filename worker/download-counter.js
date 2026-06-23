/* ============================================================
   太阳花守护 - 下载计数 Cloudflare Worker
   ------------------------------------------------------------
   端点：
     POST/GET /api/track?platform=android|harmonyos|ios   记录一次下载
     GET    /api/stats                                     查询各平台计数（需鉴权）

   存储：Cloudflare Workers KV（namespace: DOWNLOAD_COUNTS）
        key 形如 count_android / count_harmonyos / count_ios

   注意：KV 计数为最终一致性，极端高并发下可能有少量丢失，对小项目可接受。
   部署：见同目录 wrangler.toml 与 README.md
   ============================================================ */

const VALID_PLATFORMS = ['android', 'harmonyos', 'ios'];
const ALLOWED_ORIGINS = [
  'https://sunflower-guard.github.io',
  'http://localhost:8000'
];
const ALLOWED_HOSTS = [
  'sunflower-guard.github.io',
  'localhost:8000'
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
  if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

function json(data, status, request) {
  const corsHeaders = request ? getCorsHeaders(request) : {};
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, corsHeaders)
  });
}

/* 常量时间比较，防止时序攻击 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const len = Math.max(a.length, b.length);
  let result = 0;
  for (let i = 0; i < len; i++) {
    result |= (i < a.length ? a.charCodeAt(i) : 0) ^ (i < b.length ? b.charCodeAt(i) : 0);
  }
  return result === 0 && a.length === b.length;
}

/* 简单请求来源校验，挡住直接 curl 刷量 */
function isRequestAllowed(request) {
  const origin = request.headers.get('Origin') || '';
  const referer = request.headers.get('Referer') || '';
  // 有 Origin 时必须匹配白名单
  if (origin && ALLOWED_ORIGINS.indexOf(origin) === -1) return false;
  // 有 Referer 时必须匹配白名单
  if (referer) {
    try {
      const host = new URL(referer).host;
      if (ALLOWED_HOSTS.indexOf(host) === -1) return false;
    } catch (e) {
      return false;
    }
  }
  // sendBeacon 在部分浏览器可能不带 Origin/Referer，放行
  return true;
}

/* 简单的 IP 滑窗限流：每 IP 每分钟最多 10 次 track 请求 */
async function isRateLimited(kv, request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = 'rl_' + ip;
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 10;

  let raw;
  try {
    raw = await kv.get(key);
  } catch (e) {
    return false;
  }

  let timestamps = raw ? JSON.parse(raw) : [];
  timestamps = timestamps.filter(t => now - t < windowMs);

  if (timestamps.length >= maxRequests) return true;

  timestamps.push(now);
  try {
    await kv.put(key, JSON.stringify(timestamps), { expirationTtl: 120 });
  } catch (e) {
    /* 限流失败不影响正常请求 */
  }
  return false;
}

async function increment(kv, key) {
  const raw = await kv.get(key);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (isNaN(current) ? 0 : current) + 1;
  await kv.put(key, String(next));
  return next;
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }

  // 健康检查
  if (path === '/' || path === '/ping') {
    return json({ ok: true, service: 'sunflower-guard-download-counter' }, 200, request);
  }

  // 记录下载
  if (path === '/api/track') {
    // 来源校验
    if (!isRequestAllowed(request)) {
      return json({ ok: false, error: 'forbidden' }, 403, request);
    }
    // 限流
    try {
      if (await isRateLimited(env.DOWNLOAD_COUNTS, request)) {
        return json({ ok: false, error: 'rate limited' }, 429, request);
      }
    } catch (e) {
      /* KV 不可用时跳过限流 */
    }

    const platform = (url.searchParams.get('platform') || '').toLowerCase();
    if (VALID_PLATFORMS.indexOf(platform) === -1) {
      return json({ ok: false, error: 'invalid platform' }, 400, request);
    }
    const key = 'count_' + platform;
    try {
      const total = await increment(env.DOWNLOAD_COUNTS, key);
      return json({ ok: true, platform: platform, total: total }, 200, request);
    } catch (e) {
      // KV 未配置时降级：仍返回成功（不影响下载）
      return json({ ok: true, platform: platform, total: 0, warning: 'kv unavailable' }, 200, request);
    }
  }

  // 查询统计（需 Token 鉴权，通过 Authorization header 传递）
  if (path === '/api/stats') {
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token || !timingSafeEqual(token, env.ADMIN_TOKEN || '')) {
      return json({ ok: false, error: 'unauthorized' }, 401, request);
    }
    const result = {};
    for (let i = 0; i < VALID_PLATFORMS.length; i++) {
      const p = VALID_PLATFORMS[i];
      const raw = await env.DOWNLOAD_COUNTS.get('count_' + p);
      result[p] = raw ? parseInt(raw, 10) || 0 : 0;
    }
    const totalAll = (result.android || 0) + (result.harmonyos || 0) + (result.ios || 0);
    return json({ ok: true, total: totalAll, platforms: result }, 200, request);
  }

  return json({ ok: false, error: 'not found' }, 404, request);
}

export default {
  fetch: handleRequest
};
