import { command } from 'clifer'
import figmaImportCommand from './figma-import-command'
import figmaTokenCommand from './figma-token-command'
import figmaUserCommand from './figma-user-command'

export default command('figma')
  .description('Tools to handle figma imports')
  .command(figmaUserCommand)
  .command(figmaTokenCommand)
  .command(figmaImportCommand)
