import { command } from 'clifer'
import { useMyProjectsQuery } from './use-my-projects-query'
import chalk from 'chalk'

interface Props {}

async function listProjects(props: Props) {
  const { data } = await useMyProjectsQuery({ pagination: { limit: 200 } })
  console.log('')
  for (const project of data.myProjects?.items ?? []) {
    console.log(`→ ${chalk.yellow(project.name)} ${chalk.gray(`(${project.id})`)}`)
  }
}

export default command<Props>('list').description('List all projects').handle(listProjects)
