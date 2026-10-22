/**
 * API 基址
 *
 * Web / 开发态默认同源 `/api`（开发服务器与生产后端都暴露在 /api 下）。
 * Capacitor 打包时原生 WebView 访问不到本机后端，必须用
 * `VITE_API_BASE=https://<后端或隧道地址>/api` 覆盖。
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
