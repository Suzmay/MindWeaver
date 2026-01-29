import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 模拟GitHub认证回调API的插件
const githubAuthPlugin = () => {
  return {
    name: 'github-auth-plugin',
    configureServer(server) {
      server.middlewares.use('/api/auth/github/callback', (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => {
            body += chunk.toString()
          })
          req.on('end', () => {
            try {
              const { code } = JSON.parse(body)
              console.log('模拟API接收到code:', code)
              
              // 模拟GitHub API响应
              const mockUser = {
                id: 12345678,
                username: 'githubuser',
                email: 'githubuser@example.com',
                avatar: 'https://github.com/github.png'
              }
              
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 200
              res.end(JSON.stringify({
                success: true,
                user: mockUser
              }))
            } catch (error) {
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 400
              res.end(JSON.stringify({
                success: false,
                error: 'Invalid request'
              }))
            }
          })
        } else {
          next()
        }
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), githubAuthPlugin()],
  server: {
    port: 3000,
    open: true, // 自动打开浏览器
    host: true, // 允许外部访问
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
