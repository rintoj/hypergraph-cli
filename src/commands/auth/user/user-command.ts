import { command } from 'clifer'
import { fetchMe } from './fetch-me-query'
import chalk from 'chalk'

export default command<any>('user')
  .description('Display information of the currently logged-in user.')
  .handle(async () => {
    try {
      const { data } = await fetchMe()
      if (!data.me) {
        throw new Error('You are not currently logged in.')
      }
      console.log(
        `Logged in as ${chalk.green(data?.me?.name ?? '')} ${
          data?.me?.email ? `(${data?.me?.email})` : ''
        }`,
      )
    } catch (e) {
      if (e.message === 'User is not authorized to access this resource') {
        console.log(chalk.yellow('You are not currently logged in.'))
      } else {
        console.error(chalk.red(e.message))
      }
    }
  })
