import { command } from 'clifer'
import { config } from '../../config/config'
import remote from './remote/remote-command'

async function run() {
  console.table(
    Object.keys(config)
      .filter(key => !['accessToken'].includes(key))
      .map(key => ({ key, value: (config as any)[key] })),
    ['key', 'value'],
  )
}

export default command('config')
  .description('View or update configuration')
  .command(remote)
  .handle(run)
