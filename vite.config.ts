import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { 
    port: 5173,
    host: true, // 允许外部访问
    hmr: {
      port: 5173
    }
  }
})
