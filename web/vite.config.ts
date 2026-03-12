import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // 包体积分析（仅在分析构建时启用）
    process.env.ANALYZE === 'true' && visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3727',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3727',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // 目标现代浏览器，减少 polyfill
    target: 'esnext',
    // 启用更激进的代码压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console
        drop_debugger: true, // 移除 debugger
      },
    },
    // 代码分割配置
    rollupOptions: {
      output: {
        // 手动分块策略
        manualChunks: {
          // React 核心
          'react-core': ['react', 'react-dom'],
          // 路由
          'router': ['react-router-dom'],
          // 状态管理和数据获取
          'state': ['zustand', '@tanstack/react-query'],
          // UI 组件和图标
          'ui': ['lucide-react'],
          // Markdown 渲染
          'markdown': ['react-markdown', 'remark-gfm', 'react-syntax-highlighter'],
          // 日期处理
          'date': ['date-fns'],
          // 虚拟列表
          'virtual': ['react-window'],
        },
        // 入口文件命名
        entryFileNames: 'assets/[name]-[hash].js',
        // 代码块命名
        chunkFileNames: 'assets/[name]-[hash].js',
        // 资源文件命名
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || ''
          if (info.endsWith('.css')) {
            return 'assets/css/[name]-[hash][extname]'
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(info)) {
            return 'assets/images/[name]-[hash][extname]'
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(info)) {
            return 'assets/fonts/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
    // 增加构建警告阈值
    chunkSizeWarningLimit: 500, // 500KB
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@tanstack/react-query',
      'lucide-react',
      'date-fns',
      'react-window',
    ],
  },
})
