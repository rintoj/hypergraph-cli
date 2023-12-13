import { highlight } from 'cli-highlight'
import { Spinner } from 'cli-spinner'
import { command, input, prompt } from 'clifer'
import { ensureDir } from 'fs-extra'
import { toDashedName } from 'name-util'
import { ProjectContext } from '../../environment/read-environment'
import { resolveProject } from '../../project/project-service'
import { withErrorHandler } from '../../util/error-handler'
import { getProjectRoot } from '../../util/get-project-root'
import { runCommand } from '../../util/run-command'
import { writeSourceFiles } from '../../util/source-file-util'
import { saveSourceFiles } from '../save/save-command'
import { ProjectType, useGenerateQuery } from './use-generate-query.gql'
import { basename } from 'path'

interface Props {
  projectId?: string
}

async function withSpinner(callback: () => Promise<any>) {
  const spinner = new Spinner({
    text: 'Processing.. %s',
    stream: process.stderr,
    onTick: function (msg) {
      this.clearLine(this.stream)
      this.stream.write(msg)
    },
  })
  spinner.start()
  const response = await callback()
  spinner.stop(true)
  return response
}

async function createContext(project: ProjectType): Promise<ProjectContext> {
  if (!project.name) throw new Error('Project is missing a name. Can not checkout the project!')
  const projectName = toDashedName((project.name ?? '').toLowerCase())
  const projectRoot = await getProjectRoot(projectName)
  return {
    projectName,
    projectId: project.id,
    projectRoot,
  }
}

async function ensureProjectDir({ projectRoot }: Pick<ProjectContext, 'projectRoot'>) {
  await ensureDir(projectRoot)
  await runCommand('git init', { cwd: projectRoot, silent: true })
}

export async function runCheckout(props: Props) {
  return withErrorHandler(async () => {
    const selectedProject = await resolveProject(props)
    const projectContext = await createContext(selectedProject as any)
    let project: ProjectType | undefined
    let context: string | undefined
    console.log('Tip: Type "save" to save your work or "exit" to finish up!')
    do {
      const { ask } = await prompt(input('ask').prompt('Ask AI').string())
      if (ask.trim() === '') {
        continue
      } else if (ask.trim().toLowerCase() === 'exit') {
        break
      } else if (ask.trim().toLowerCase() === 'save') {
        if (!project) {
          console.log('Nothing to save')
        } else {
          await ensureProjectDir(projectContext)
          await writeSourceFiles(projectContext.projectRoot, project.sourceFiles as any)
          const sourceFile =
            project.sourceFiles?.length > 1
              ? `**/{${project.sourceFiles
                  ?.map(sourceFile => basename(sourceFile.fileName))
                  .join(',')}}`
              : project.sourceFiles?.[0]?.fileName?.replace('backend/', '')
          await saveSourceFiles({ projectId: selectedProject.id, sourceFile })
        }
        continue
      }
      project = await withSpinner(async () => {
        const response = await useGenerateQuery({
          input: { projectId: selectedProject.id, prompt: ask, context },
        })
        context = response.data.generate.response
        return response.data.generate.project
      })
      console.log('')
      console.log(
        highlight(
          project?.sourceFiles
            ?.map(sourceFile => [`// ${sourceFile.fileName}`, ...sourceFile.content].join('\n'))
            .join('\n') ?? '',
          { language: 'typescript' },
        ),
      )
    } while (true)
  })
}

export default command<Props>('generate')
  .description('Generate project models and resolvers using AI')
  .option(input('projectId').description('Specify the ID of the project').string())
  .handle(runCheckout)
