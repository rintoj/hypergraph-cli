import { command, input } from 'clifer'
import { sync } from 'fast-glob'
import { readFile } from 'fs-extra'
import { readEnvironment } from '../../environment/read-environment'
import { resolveProject } from '../../project/project-service'
import { withErrorHandler } from '../../util/error-handler'
import { runCheckout } from '../checkout/checkout-command'
import { useSaveSourceFilesMutation } from './use-save-source-files-mutation.gql'

interface Props {
  projectId: string
  sourceFile: string
}

function run(props: Props) {
  return withErrorHandler(async () => {
    const files = sync(props.sourceFile ?? '**/*.hg.ts')
    const project = await resolveProject(props)
    const env = await readEnvironment()
    const sourceFiles = await Promise.all(
      files.map(async file => ({
        fileName: file.replace(env?.projectRoot + '/', ''),
        content: await readFile(file, 'utf-8'),
      })),
    )
    await useSaveSourceFilesMutation({
      variables: {
        input: { projectId: project.id, sourceFiles },
      },
    })
    await runCheckout(props)
  })
}

export default command<Props>('save')
  .description('Save a source file to a given project')
  .argument(
    input('sourceFile')
      .description('Source file(s) to upload. You may use glob patterns here')
      .string()
      .required(),
  )
  .option(input('projectId').description('Project ID in Hypergraph').string())
  .handle(run)
