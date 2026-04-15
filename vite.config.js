import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/notion': {
          target: 'https://api.notion.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/notion/, ''),
        },
        '/api/teamwork': {
          target: `https://${env.VITE_TEAMWORK_SITE || 'localhost'}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/teamwork/, ''),
          headers: env.VITE_TEAMWORK_API_KEY ? {
            Authorization: `Basic ${Buffer.from(env.VITE_TEAMWORK_API_KEY + ':X').toString('base64')}`
          } : {}
        },
        '/api/github': {
          target: 'https://api.github.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/github/, ''),
          headers: env.VITE_GITHUB_TOKEN ? {
            Authorization: `Bearer ${env.VITE_GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
          } : {}
        },
      },
    },
  }
})
