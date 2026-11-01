import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      tailwindcss(),
      react(),
    ],
    server: {
      // Allow public tunnel URLs (Cloudflare quick tunnel / ngrok) to reach the dev server for demos
      allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.app'],
      // Forward API + signed evidence file requests to the Civora backend in development
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_ORIGIN || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  }
})
