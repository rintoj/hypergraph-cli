import { command, input } from 'clifer'
import { ensureDir, writeFile } from 'fs-extra'
import path from 'path'
import { toDashedName } from 'name-util'
import { getProjectRoot, readPackageJSON } from '../../util'

interface Props {
  name: string
}

async function run({ name }: Props) {
  const dashedName = toDashedName(name)
  const projectRoot = `${await getProjectRoot()}/backend`
  const packageRoot = `${projectRoot}/packages/${dashedName}`
  const packageJSON = await readPackageJSON(projectRoot)
  const projectName = packageJSON?.hypergraph?.projectName
  if (!projectName)
    throw new Error(`Project name is missing. Define it under package.json as
  {
    "hypergraph": {
      "projectName": "PROJECT_NAME"
    }
  }
  `)
  await ensureDir(packageRoot)
  await writeFile(
    path.resolve(packageRoot, 'package.json'),
    JSON.stringify(
      {
        name: `@${toDashedName(projectName)}/${dashedName}`,
        version: '1.0.0',
        license: 'UNLICENSED',
        main: 'src/index.ts',
        private: true,
      },
      null,
      2,
    ),
    'utf-8',
  )
  const sourceRoot = path.resolve(packageRoot, 'src')
  await ensureDir(sourceRoot)
  await writeFile(
    path.resolve(sourceRoot, 'index.ts'),
    `export * from './${dashedName}'\n`,
    'utf-8',
  )
  await writeFile(path.resolve(sourceRoot, `${dashedName}.ts`), ` `, 'utf-8')
}

export default command<Props>('package')
  .description('Create a package')
  .argument(input('name').description('Name of the package').string().prompt())
  .handle(run)
