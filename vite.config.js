import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Remove the 'root: public' line entirely
  build: {
    outDir: 'dist', // Standard output directory
  },
  preview: {
    port: 8080,
    host: '0.0.0.0',
    strictPort: true
  }
})