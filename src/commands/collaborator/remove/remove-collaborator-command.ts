import chalk from 'chalk'
import { command, input, prompt } from 'clifer'
import { resolveProject } from '../../../project/project-service'
import { UserType, useCollaboratorsQuery } from './use-list-collaborators-query'
import { useRemoveCollaboratorMutation } from './use-remove-collaborator'

interface Props {
  projectId?: string
}

function formatUser(user: UserType | undefined) {
  if (!user) return ''
  return `${user.name} ${user.email ? `(${user.email})` : ''}`
}

async function run(props: Props) {
  const project = await resolveProject(props)
  const response = await useCollaboratorsQuery({ projectId: project.id })
  const { userName } = await prompt(
    input('userName')
      .string()
      .choices(response.data.collaborators?.map(c => formatUser(c.user)))
      .prompt('Select a collaborator to remove'),
  )
  const user = response.data.collaborators?.find(i => formatUser(i.user) === userName)?.user
  if (!user) throw new Error('No collaborator was selected')
  await useRemoveCollaboratorMutation({
    variables: { input: { projectId: project.id, userId: user.id } },
  })
  console.log('Done')
}

export default command<Props>('remove')
  .description('Remove a collaborator from the project')
  .option(input('projectId').description('Project id').string())
  .handle(run)
