import { command } from 'clifer'
import add from './add/add-collaborator-command'
import list from './list/list-collaborators-command'
import remove from './remove/remove-collaborator-command'

export default command('collaborator')
  .description('Administer project collaborators and permissions.')
  .command(add)
  .command(list)
  .command(remove)
