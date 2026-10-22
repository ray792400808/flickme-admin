import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { fileURLToPath, URL } from 'node:url';

// 走 host.docker.internal 让请求绕过 Windows loopback，
// 直接命中 docker desktop 暴露的 8000 端口（flickme-nginx）。
const apiTarget = process.env.VITE_PROXY_TARGET ?? 'http://host.docker.internal:8000';

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      // importStyle: false —— element-plus/dist/index.css 已在 main.ts 全局引入，
      // 再按组件引入 style/css 会让 vite 依赖预构建生成一堆 element-plus_es_components_* 资源，
      // 预构建失效时直接 504 导致页面动态 import 失败（整页白屏）。
      resolvers: [ElementPlusResolver({ importStyle: false })],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: false,
    }),
    Components({
      resolvers: [ElementPlusResolver({ importStyle: false })],
      dts: false,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/admin': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
