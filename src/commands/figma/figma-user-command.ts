import chalk from 'chalk'
import { command } from 'clifer'
import { fetchFigmaUser } from '../../figma'

export async function run() {
  try {
    const user = await fetchFigmaUser()
    if (!user) return console.log(chalk.yellow('Not logged in'))
    console.log(`Figma user: ${chalk.green(user.handle)} (${user.email})`)
  } catch (e) {
    console.log(chalk.red(e.message))
  }
}

export default command('user').description('Get current figma user').handle(run)
