import { command } from 'clifer'
import create from './create/create-project-command'
import list from './list/list-projects-command'
import remove from './remove/remove-project-command'

export default command('project')
  .description('Manage my projects')
  .command(create)
  .command(list)
  .command(remove)
