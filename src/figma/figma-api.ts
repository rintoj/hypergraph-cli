import fetch from 'node-fetch'
import { config } from '../config/config'

const URL = 'https://api.figma.com/v1'

export async function fetchFigma(url: string, data?: Record<string, string>) {
  if (!config.figmaToken) {
    throw new Error('Use "hypergraph figma token <personal access token>" to configure figma')
  }
  const response = await fetch(`${URL}${url}`, {
    headers: {
      'X-FIGMA-TOKEN': config.figmaToken as string,
    },
  })

  if (!response.ok) throw new Error(response.statusText)
  return response.json()
}
