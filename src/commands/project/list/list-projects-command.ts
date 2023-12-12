import { command } from 'clifer'

interface Props {}

async function listProjects(props: Props) {}

export default command<Props>('list').description('List all projects').handle(listProjects)
