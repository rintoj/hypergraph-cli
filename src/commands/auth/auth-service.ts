import express from 'express'
import { exit } from 'process'

const dynamicImport = new Function('specifier', 'return import(specifier)')

export enum AuthProvider {
  Google = 'Google',
  Github = 'Github',
}

export async function findAvailablePort(startPort: number, endPort: number): Promise<number> {
  const app = express()
  return new Promise((resolve, reject) => {
    const server = app.listen(startPort, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Invalid address'))
        return
      }
      server.close(() => {
        resolve(startPort) // Port is available
      })
    })
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        server.close()
        if (startPort < endPort) {
          resolve(findAvailablePort(startPort + 1, endPort)) // Try next port
        } else {
          reject(new Error('No available ports found'))
        }
      } else {
        reject(err)
      }
    })
  })
}

export async function authorize(serviceUrl: string, provider: AuthProvider) {
  return new Promise<string>(async (resolve, reject) => {
    const startPort = 4200
    const endPort = 4205
    const port: number = await findAvailablePort(startPort, endPort)
    const app = express()

    app.get('/code', async (req, res) => {
      const authorizationCode = req.query.code as string
      res.send('<script>window.close()</script>You can close this window now.')
      if (!authorizationCode) {
        reject('Authorization code not found')
        exit(1)
      }
      resolve(authorizationCode)
    })

    app.listen(port, async () => {
      const url: string = `${serviceUrl}/auth/${provider.toLowerCase()}/login?redirect_uri=http://localhost:${port}/code`
      console.log('Opening browser for authentication..')
      const { default: open } = await dynamicImport('open')
      open(url.toString())
      setTimeout(() => {
        reject('ERROR: Failed to login. Session timed out')
        exit(1)
      }, 60 * 1000)
    })
  })
}
