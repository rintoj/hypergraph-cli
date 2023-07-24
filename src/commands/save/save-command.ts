import { command, input, prompt } from 'clifer'
import { readEnvironment } from '../../environment/read-environment'
import { config } from '../../config/config'
import {
  chooseAProject,
  fetchProjects,
  resolveProject,
  selectProjectById,
} from '../project/project-service'

interface Props {
  projectId: string
  sourceFile: string
}

async function run(props: Props) {
  const project = await resolveProject(props)
  const files = props.sourceFile.split(',')
  console.log('save source file', { files, project })
}

export default command<Props>('save')
  .description('Save a source file to a given project')
  .argument(
    input('sourceFile')
      .description('Source file(s) to upload. Separate each name with a coma')
      .string()
      .required(),
  )
  .option(input('projectId').description('Project ID in Hypergraph').string())
  .handle(run)
