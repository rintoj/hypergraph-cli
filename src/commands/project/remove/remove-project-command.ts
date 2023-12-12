import { command } from 'clifer'

interface Props {}

async function removeProject(props: Props) {}

export default command<Props>('remove').description('Remove a project').handle(removeProject)
