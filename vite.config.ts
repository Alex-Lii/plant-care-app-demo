import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // CVH（中国数字植物标本馆）接口不能跨域调用：
      // 响应头 Access-Control-Allow-Origin 是非法的 "www.cvh.ac.cn"，且接口校验 Referer，
      // 缺少 Referer 时直接返回 {"message":"access denied"}。
      // 因此由开发服务器代理转发，并补上 Referer。
      // 路径与生产后端保持一致（server/index.mjs 暴露 /api/cvh/*），
      // 开发期无需启动后端即可跑通 CVH，打包后换成 VITE_API_BASE 指向真实后端。
      '/api/cvh': {
        target: 'https://www.cvh.ac.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cvh/, ''),
        headers: {
          Referer: 'https://www.cvh.ac.cn/species/taxon_tree.php',
        },
      },
      // iplant.cn（中国植物志在线版「植物智」）的检索接口同样不能跨域调用
      // （无 Access-Control-Allow-Origin 响应头，且缺 Referer 时返回空），
      // 与 CVH 相同走代理转发并补 Referer；生产后端见 server/index.mjs 的 /api/iplant/*
      '/api/iplant': {
        target: 'https://www.iplant.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/iplant/, ''),
        headers: {
          Referer: 'https://www.iplant.cn/',
        },
      },
    },
  },
})
