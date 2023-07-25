export * from './util'
export * from './environment'

import { runCli } from 'clifer'
import command from './commands'

void runCli(command)
