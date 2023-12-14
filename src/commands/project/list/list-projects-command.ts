import { command } from 'clifer'
import { useMyProjectsQuery } from './use-my-projects-query'
import chalk from 'chalk'
import { withErrorHandler } from '../../../util/error-handler'

interface Props {}

async function listProjects(props: Props) {
  withErrorHandler(async () => {
    const { data } = await useMyProjectsQuery()
    console.log('')
    for (const project of data.myProjects ?? []) {
      console.log(`→ ${chalk.yellow(project.name)} ${chalk.gray(`(${project.id})`)}`)
    }
  })
}

export default command<Props>('list').description('List all projects').handle(listProjects)
