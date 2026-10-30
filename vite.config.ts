import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // 把渲染器与提示词引擎拆成独立 chunk，首屏只加载骨架
        manualChunks(id) {
          if (id.includes('/src/engine/')) return 'engine'
          if (id.includes('/src/prompt/')) return 'prompt'
          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia')) return 'vendor'
        },
      },
    },
  },
})
