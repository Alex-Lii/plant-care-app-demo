/**
 * 轻量后端：CVH 代理 + 静态托管
 *
 * 作用：
 * 1. 把 /api/cvh/* 转发到 https://www.cvh.ac.cn/*，并补上 Referer
 *    （CVH 接口校验 Referer，缺失时直接返回 {"message":"access denied"}；
 *     且其 CORS 响应头是非法值 "www.cvh.ac.cn"，浏览器无法直连，必须由服务端转发）。
 * 2. 给响应加 Access-Control-Allow-Origin: *，使 Capacitor 打包后的 App
 *    （跑在 https://localhost）也能跨域访问本后端。
 * 3. 静态托管 dist/，带 SPA fallback。
 *
 * 零依赖：仅 node:http + node:fs + 全局 fetch（Node 18+）。
 * 启动：npm run server（默认端口 8787，可用 PORT 覆盖）。
 */

import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 8787);
const CVH_ORIGIN = "https://www.cvh.ac.cn";
const CVH_PREFIX = "/api/cvh";
/** CVH 接口要求的 Referer，缺失会被判定为 access denied */
const CVH_REFERER = `${CVH_ORIGIN}/species/taxon_tree.php`;
const IPLANT_ORIGIN = "https://www.iplant.cn";
const IPLANT_PREFIX = "/api/iplant";
/** iplant.cn 检索接口缺 Referer 时返回空，统一补上站内来源 */
const IPLANT_REFERER = `${IPLANT_ORIGIN}/`;

const DIST_DIR = resolve(fileURLToPath(new URL("../dist", import.meta.url)));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
};

/** 跨域响应头，允许打包后的 App 从 https://localhost 访问 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(payload));
}

/** 读取请求体（仅用于需要转发的 POST） */
function readBody(req) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolvePromise(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** 转发上游请求：透传 method/query/body，补 Referer 与必要的请求头 */
async function proxyUpstream(req, res, origin, prefix, referer, tag) {
  // req.url 形如 /api/cvh/controller/ajax/autocomplete.php?term=银杏
  const pathAndQuery = req.url.slice(prefix.length);
  const target = `${origin}${pathAndQuery}`;

  const headers = { Referer: referer };
  const contentType = req.headers["content-type"];
  if (contentType) headers["Content-Type"] = contentType;
  const userAgent = req.headers["user-agent"];
  if (userAgent) headers["User-Agent"] = userAgent;

  let body;
  if (req.method === "POST" || req.method === "PUT") {
    body = await readBody(req);
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: "follow",
    });

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
      ...CORS_HEADERS,
    });
    res.end(buffer);
  } catch (err) {
    sendJson(res, 502, {
      message: `${tag} proxy failed`,
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

function proxyCvh(req, res) {
  return proxyUpstream(req, res, CVH_ORIGIN, CVH_PREFIX, CVH_REFERER, "cvh");
}

function proxyIplant(req, res) {
  return proxyUpstream(req, res, IPLANT_ORIGIN, IPLANT_PREFIX, IPLANT_REFERER, "iplant");
}

/** 静态托管 dist/，未命中的路径回落到 index.html（SPA） */
function serveStatic(req, res) {
  if (!existsSync(DIST_DIR)) {
    sendJson(res, 404, {
      message: "dist/ 不存在，请先执行 npm run build",
    });
    return;
  }

  const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const rel = normalize(urlPath).replace(/^([/\\])+/, "");
  let filePath = join(DIST_DIR, rel);

  // 目录穿越保护
  if (!filePath.startsWith(DIST_DIR)) {
    sendJson(res, 403, { message: "forbidden" });
    return;
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(DIST_DIR, "index.html");
  }

  const type = MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const pathname = (req.url ?? "/").split("?")[0];

  // 预检请求
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (pathname === CVH_PREFIX || pathname.startsWith(`${CVH_PREFIX}/`)) {
    proxyCvh(req, res);
    return;
  }

  if (pathname === IPLANT_PREFIX || pathname.startsWith(`${IPLANT_PREFIX}/`)) {
    proxyIplant(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`[plant-care] server listening on http://localhost:${PORT}`);
  console.log(`[plant-care] CVH proxy:  /api/cvh/* -> ${CVH_ORIGIN}/*`);
  console.log(`[plant-care] iplant proxy: /api/iplant/* -> ${IPLANT_ORIGIN}/*`);
  console.log(`[plant-care] static root: ${DIST_DIR}`);
});
