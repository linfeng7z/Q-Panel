import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Q-Panel clickable prototype — no backend, all data is mocked locally.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5178,
    strictPort: true,
  },
})
