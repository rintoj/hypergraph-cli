import chalk from 'chalk'
import { command, input } from 'clifer'
import { runCheckout } from '../../checkout/checkout-command'
import { useCreateProjectMutation } from './use-create-project-mutation'
import { useProjectIdQuery } from './use-project-id'

interface Props {
  projectName: string
  checkout?: boolean
  open?: boolean
}

async function createProject({ checkout, projectName, open }: Props) {
  const projectIdResponse = await useProjectIdQuery({ name: projectName })
  const input = { projectId: projectIdResponse.data.projectId as string, name: projectName }
  const response = await useCreateProjectMutation({ variables: { input } })
  console.log(
    chalk.green(
      `Create project ${response.data?.createProject?.name}(${response.data?.createProject?.id})`,
    ),
  )
  console.log(`\nUse ${chalk.yellow(`hypergraph checkout`)} to start using the project`)
  if (checkout) {
    await runCheckout({ projectId: input.projectId, open })
  }
}

export default command<Props>('create')
  .description('Create a project')
  .argument(input('projectName').description('Name of the project').string().prompt())
  .option(input('checkout').description('Checkout the project after it is created'))
  .option(input('open').description('Open the project once it has been checked out'))
  .handle(createProject)
