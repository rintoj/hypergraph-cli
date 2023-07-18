import { command, input } from 'clifer'
import chalk from 'chalk'
import { config, saveConfig } from '../../../config/config'
import { fetchMe } from '../../auth/user/fetch-me-query'
import fetch from 'node-fetch'

interface Props {
  url?: string
}

async function run({ url }: Props) {
  if (!url) {
    return console.log(`Current remote: ${chalk.yellow(config.remote)}`)
  }
  const remote = config.remote
  try {
    saveConfig({ remote: url })
    const response = await fetch(url)
    if (response.status === 404) {
      throw new Error(`Unable to reach the service. Please check "${url}" is a valid url`)
    }
    await fetchMe()
    return
  } catch (e) {
    saveConfig({ remote })
    console.log(chalk.red(e.message))
  }
}

export default command<Props>('remote')
  .description('View or update remote server URL')
  .argument(input('url').description('Server url').string())
  .handle(run)
