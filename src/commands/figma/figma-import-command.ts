import { command, input } from 'clifer'
import { fetchFigmaFile, fetchFigmaUser } from '../../figma'
import urlUtil from 'url'
import queryString from 'node:querystring'

interface Props {
  url: string
}

async function run({ url }: Props) {
  const { query, pathname, search, ...x } = urlUtil.parse(url)
  const [, , fileKey] = pathname?.split('/') ?? []
  const { 'node-id': nodeId = '' } = queryString.parse(query ?? '')
  const file = await fetchFigmaFile(fileKey, nodeId)
  console.log(JSON.stringify(file, null, 2))
}

export default command<Props>('import')
  .description('Import design from a URL')
  .option(input('url').description('URL of the node').string().required())
  .handle(run)
