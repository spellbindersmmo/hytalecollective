import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const apiKey = env.VITE_CURSEFORGE_API_KEY
  console.log('CurseForge API Key loaded:', apiKey ? 'Yes (' + apiKey.length + ' chars)' : 'No')

  return {
    plugins: [svelte(), tailwindcss()],
    server: {
      proxy: {
        '/api/curseforge': {
          target: 'https://api.curseforge.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/curseforge/, '/v1'),
          headers: {
            'x-api-key': apiKey,
            'Accept': 'application/json'
          },
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Explicitly set the API key header on each request
              proxyReq.setHeader('x-api-key', apiKey)
              console.log('Proxying to:', 'https://api.curseforge.com' + proxyReq.path)
              console.log('x-api-key header set:', apiKey ? apiKey.substring(0, 10) + '...' : 'Missing')
            })
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Response status:', proxyRes.statusCode)
              if (proxyRes.statusCode === 403) {
                let body = ''
                proxyRes.on('data', chunk => body += chunk)
                proxyRes.on('end', () => console.log('Error body:', body))
              }
            })
          }
        }
      }
    }
  }
})
