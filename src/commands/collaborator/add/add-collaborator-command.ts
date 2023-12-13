import { command, input, prompt } from 'clifer'
import { resolveProject } from '../../../project/project-service'
import { UserType, useSearchUserQuery } from './use-search-user-query'
import { useAddCollaboratorMutation } from './use-add-collaborator'
import chalk from 'chalk'

interface Props {
  projectId?: string
}

function formatUser(user: UserType) {
  return `${user.name} ${user.email ? `(${user.email})` : ''}`
}

async function selectAUser(users: UserType[]) {
  if (!users.length) return
  const { user } = await prompt(
    input('user').string().choices(users.map(formatUser)).prompt('Select a user'),
  )
  return users.find(item => formatUser(item) === user)
}

async function run(props: Props) {
  const project = await resolveProject(props)
  let user
  do {
    const { query } = await prompt(input('query').string().prompt('Search (name, email or id)'))
    const response = await useSearchUserQuery({ query })
    const users = response.data.searchUser
    user = await selectAUser(users)
    if (user) break
    console.log(chalk.yellow('No user found that matches the given query'))
  } while (true)
  const { asAdmin } = await prompt(input('asAdmin').prompt('Add as admin?'))
  await useAddCollaboratorMutation({
    variables: { input: { projectId: project.id, userId: user?.id, asAdmin } },
  })
  console.log('Done')
}

export default command<Props>('add')
  .description('Add a collaborator to the project')
  .option(input('projectId').description('Specify the ID of the project').string())
  .handle(run)
