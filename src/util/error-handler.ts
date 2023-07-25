import chalk from 'chalk'
import { config } from '../config/config'

export async function withErrorHandler(callback: any) {
  try {
    return await callback()
  } catch (e) {
    if (/Received status code 404/.test(e.message)) {
      console.log(
        chalk.red(`
Error: We are unable to connect to the remote service URL "${chalk.yellow(config.remote)}"
  - Please make sure that you are connected to the correct service URL
  - Or update it using ${chalk.green('hypergraph config remote ')}${chalk.yellow('<url>')}
`),
      )
    } else if (/You are unauthorized/.test(e.message)) {
      throw new Error(`
Error: You are not logged in. Make sure to login using ${chalk.green('hypergraph auth login')}.
`)
    } else {
      console.log(chalk.red(`Error: ${e.message}`))
    }
    process.exit(1)
  }
}
