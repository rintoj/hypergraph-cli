import { fetchFigma } from './figma-api'

export interface FigmaUser {
  id: string
  email: string
  handle: string
  img_url: string
}

export function fetchFigmaUser(): Promise<FigmaUser> {
  return fetchFigma('/me')
}
