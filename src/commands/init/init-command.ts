import { command, input } from 'clifer'
import { useCreateProjectMutation } from './use-create-project-mutation.gql'
import { useProjectIdQuery } from './use-project-id'
import chalk from 'chalk'

interface Props {
  projectName: string
}

async function run({ projectName }: Props) {
  const projectIdResponse = await useProjectIdQuery({ name: projectName })
  const input = { projectId: projectIdResponse.data.projectId as string, name: projectName }
  const response = await useCreateProjectMutation({ variables: { input } })
  console.log(
    chalk.green(
      `Create project ${response.data?.createProject?.name}(${response.data?.createProject?.id})`,
    ),
  )
  console.log(`\nUse ${chalk.yellow(`hypergraph checkout`)} to start using the project`)
}

export default command<Props>('init')
  .description('Initialize a project')
  .option(input('projectName').description('Name of the project').string().prompt())
  .handle(run)
