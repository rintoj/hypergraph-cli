import express from 'express'

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
