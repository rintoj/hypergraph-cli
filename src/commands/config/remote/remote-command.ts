import chalk from 'chalk'
import { command, input } from 'clifer'
import { config, saveConfig } from '../../../config/config'

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
  } catch (e) {
    saveConfig({ remote })
    console.log(chalk.red(e.message))
  }
}

export default command<Props>('remote')
  .description('View or update remote server URL')
  .argument(input('url').description('Server url').string())
  .handle(run)
