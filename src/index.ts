import { cli, runCli } from 'clifer'

const command = cli('hypergraph').description('CLI for hypergraph ').version('1.0.0')

void runCli(command)
