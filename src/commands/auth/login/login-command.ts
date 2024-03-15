import chalk from 'chalk'
import { command } from 'clifer'
import { exit } from 'process'
import { readConfig, saveConfig } from '../../../config/config'
import { AuthProvider, authorize } from '../auth-service'
import { signInWithCode } from './signin-with-code'

interface Props {
  provider: AuthProvider
}

async function run({ provider = AuthProvider.Github }: Props) {
  try {
    const { remote } = readConfig()
    const code = await authorize(remote ?? 'http://localhost:4000', provider)
    const result = await signInWithCode({ variables: { code } })
    if (!result.data?.signInWithCode?.user) {
      throw new Error('Unable to login!')
    }
    saveConfig({ accessToken: result.data?.signInWithCode?.accessToken ?? '' })
    console.log(chalk.green(`Logged in as ${result.data?.signInWithCode?.user?.name ?? ''}`))
    exit(0)
  } catch (e) {
    console.log(chalk.red(e.toString()))
    exit(1)
  }
}

export default command<Props>('login')
  .description('Access your Hypergraph account by logging in')
  // .option(
  //   input('provider')
  //     .description('Authenticate using Google or Github credentials.')
  //     .string()
  //     .prompt('How would you like to login?')
  //     .choices([AuthProvider.Google, AuthProvider.Github])
  //     .prompt(),
  // )
  .handle(run)
