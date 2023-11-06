import { command } from 'clifer'
import createPackage from './create-package-command'

export default command('create')
  .description('Create a package and other resources')
  .command(createPackage)
