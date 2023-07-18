import { command, input } from 'clifer'
import { fetchProjects, showCurrentProject, switchProject } from './project-service'
import chalk from 'chalk'

interface Props {
  view?: boolean
}

async function run({ view }: Props) {
  try {
    if (view) {
      const projects = await fetchProjects()
      await showCurrentProject(projects)
      return
    }
    await switchProject()
  } catch (e) {
    console.error(chalk.red(e.message))
  }
}

export default command<Props>('project')
  .description('View the selected project or select a project')
  .option(input('view').description('Show the selected project'))
  .handle(run)
