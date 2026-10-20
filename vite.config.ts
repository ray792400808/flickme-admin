import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: { proxy: { '/admin/v1': { target: 'http://127.0.0.1', changeOrigin: true } } },
});
