import { command, input } from 'clifer'
import { saveConfig } from '../../config/config'

interface Props {
  token: string
}

async function run({ token }: Props) {
  saveConfig({ figmaToken: token })
}

export default command<Props>('token')
  .description('Set personal access token to configure figma access')
  .option(input('token').description('Personal access token').string().required().prompt())
  .handle(run)
