import chalk from 'chalk'
import { command, input } from 'clifer'
import { resolveProject } from '../../../project/project-service'
import { UserType, useCollaboratorsQuery } from './use-list-collaborators-query'
import { toArrayByProperty } from 'tsds-tools'

interface Props {
  projectId?: string
}

function formatUser(user: UserType) {
  return `${user.name} ${user.email ? `(${user.email})` : ''}`
}

async function run(props: Props) {
  const project = await resolveProject(props)
  const response = await useCollaboratorsQuery({ projectId: project.id })
  console.log('')
  const byRole = toArrayByProperty(response.data.collaborators, 'role')

  for (const role of Object.keys(byRole)) {
    console.log(role + ':')
    const collaborators = byRole[role]
    for (const collaborator of collaborators ?? []) {
      console.log(
        `→ ${chalk.yellow(collaborator.user?.name)} ${chalk.gray(`(${collaborator.user?.email})`)}`,
      )
    }
    console.log()
  }
}

export default command<Props>('list')
  .description('Display contributors within a project')
  .option(input('projectId').description('Project id').string())
  .handle(run)
