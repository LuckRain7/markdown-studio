import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 部署在自定义域名 http://md.ilabubu.com/ 根路径下
  base: '/',
  plugins: [vue()],
  server: {
    port: 5173,
    open: true,
  },
})
