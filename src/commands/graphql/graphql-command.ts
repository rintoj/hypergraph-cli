import { command } from 'clifer'
import validate from './validate/graphql-validate-command'

export default command('graphql')
  .description('GraphQL utilities and validation tools')
  .command(validate)