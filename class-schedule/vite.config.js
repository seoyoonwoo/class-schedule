import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 같은 하위 경로 배포에서도 깨지지 않게 상대경로로 빌드
  base: './',
})
