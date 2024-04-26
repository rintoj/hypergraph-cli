import { green, yellow, red } from 'chalk'
import { command } from 'clifer'
import { fetchFigmaUser } from '../../figma'

export async function run() {
  try {
    const user = await fetchFigmaUser()
    if (!user) return console.log(yellow('Not logged in'))
    console.log(`Figma user: ${green(user.handle)} (${user.email})`)
  } catch (e) {
    console.log(red(e.message))
  }
}

export default command('user').description('Get current figma user').handle(run)
