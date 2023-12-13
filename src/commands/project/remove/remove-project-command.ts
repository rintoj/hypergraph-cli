import { command, input, prompt } from 'clifer'
import { withErrorHandler } from '../../../util/error-handler'
import { resolveProject } from '../../../project/project-service'
import { useRemoveProjectMutation } from './use-remove-project-mutation'
import chalk from 'chalk'

interface Props {
  projectId?: string
}

async function removeProject(props: Props) {
  return withErrorHandler(async () => {
    const selectedProject = await resolveProject(props)
    console.log(
      chalk.red(
        '\nNote: Deleting this project is a permanent action. All data, files, and configurations \nassociated with the project will be irretrievably lost!\n',
      ),
    )
    const { projectId } = await prompt(
      input('projectId')
        .string()
        .prompt(`Type "${chalk.yellow(selectedProject.id)}" to confirm.`),
    )
    if (projectId !== selectedProject.id) {
      throw new Error('Your input does not match the id of the project to be removed. Try again!')
    }
    await useRemoveProjectMutation({ variables: { projectId: selectedProject.id } })
    console.log(
      chalk.green(`\nProject "${selectedProject.name} (${selectedProject.id})" has been removed.`),
    )
  })
}

export default command<Props>('remove')
  .description('Remove a project')
  .option(input('projectId').description('Id of the project to be removed').string())
  .handle(removeProject)
