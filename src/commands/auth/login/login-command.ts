import chalk from 'chalk'
import { command, input } from 'clifer'
import express from 'express'
import { exit } from 'process'
import { saveConfig } from '../../../config/config'
import { findAvailablePort } from './find-available-ports'
import { AuthenticationProvider, signInWithOauth } from './signin-with-auth'

interface Props {
  provider: AuthenticationProvider
}

export const dynamicImport = new Function('specifier', 'return import(specifier)')

function generateGoogleOAuthUrl(hostname: string, port: number) {
  const redirectUri = `http://${hostname}:${port}/api/auth/google`
  const params = {
    // TODO: Store client ID in a config
    client_id: '627853931654-5v272c6ape7qdks0boso8f74k9f58rnu.apps.googleusercontent.com',
    redirect_uri: redirectUri,
    scope: 'profile email openid',
    // TODO: Pass a random string as state to prevent CSRF
    state: '',
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
  }
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams(params).toString()
  return url
}

function generateGithubOAuthUrl(hostname: string, port: number) {
  const redirectUri = `http://${hostname}:${port}/api/auth/github`
  const params = {
    // TODO: Store client ID in a config
    client_id: '1d2f73cd14e1951c2bdc',
    redirect_uri: redirectUri,
    scope: 'user:email',
    // TODO: Pass a random string as state to prevent CSRF
    state: '',
  }
  const url = new URL('https://github.com/login/oauth/authorize')
  url.search = new URLSearchParams(params).toString()
  return url
}

async function run({ provider }: Props) {
  const startPort = 4200
  const endPort = 4205
  const port: number = await findAvailablePort(startPort, endPort)
  const app = express()
  app.get(['/api/auth/github', '/api/auth/google'], async (req, res) => {
    const authorizationCode = req.query.code as string
    res.send('<script>window.close()</script>You can close this window now.')
    if (!authorizationCode) {
      throw new Error('Authorization code not found')
    }

    const result = await signInWithOauth({
      input: {
        provider,
        authorizationCode,
        redirectUri: `http://${req.hostname}:${port}${req.path}`,
      },
    }).catch(error => {
      console.error('Error signing in', error.message)
      exit(1)
    })

    if (!result.data?.signInWithOauth?.user) {
      throw new Error('Unable to login!')
    }
    saveConfig({ accessToken: result.data?.signInWithOauth?.accessToken ?? '' })
    console.log(chalk.green(`Logged in as ${result.data?.signInWithOauth?.user?.name ?? ''}`))
    exit(0)
  })

  app.listen(port, async () => {
    const url: URL =
      provider === AuthenticationProvider.GOOGLE
        ? generateGoogleOAuthUrl('localhost', port)
        : generateGithubOAuthUrl('127.0.0.1', port)
    console.log('Opening browser for authentication..')
    const { default: open } = await dynamicImport('open')
    open(url.toString())
    setTimeout(() => {
      console.log(chalk.red(`ERROR Failed to login. Session timed out`))
      exit(0)
    }, 60 * 1000)
  })
}

export default command<Props>('login')
  .description('Access your Hypergraph account by logging in')
  .option(
    input('provider')
      .description('Authenticate using Google or Github credentials.')
      .string()
      .prompt('How would you like to login?')
      .choices([AuthenticationProvider.GOOGLE, AuthenticationProvider.GITHUB])
      .prompt(),
  )
  .handle(run)
