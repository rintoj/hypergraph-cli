import { command } from 'clifer'
import { fetchMe } from './fetch-me-query'
import chalk from 'chalk'

export default command<any>('user')
  .description('Show the logged in user')
  .handle(async () => {
    try {
      const { data } = await fetchMe()
      console.log(chalk.green(`Logged in as ${data?.me?.name ?? ''}`))
    } catch (e) {
      if (e.message === 'User is not authorized to access this resource') {
        console.log(chalk.yellow('Not logged in'))
      } else {
        console.error(chalk.red(e.message))
      }
    }
  })
