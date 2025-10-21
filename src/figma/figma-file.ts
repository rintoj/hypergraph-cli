import { fetchFigma } from './figma-api'

export interface FigmaFile {
  name: string
  lastModified: Date
  thumbnailUrl: string
  version: string
  role: string
  editorType: string
  linkAccess: string
  nodes: Nodes
}

export interface Nodes {
  '362:82434': The36282434
}

export interface The36282434 {
  document: Document
  components: { [key: string]: Component }
  componentSets: ComponentSets
  schemaVersion: number
  styles: Les
}

export interface ComponentSets {
  '1:4159': The14159
}

export interface The14159 {
  key: string
  name: string
  description: string
  remote: boolean
}

export interface Component {
  key: string
  name: string
  description: string
  remote: boolean
  componentSetId?: string
  documentationLinks: any[]
}

export interface Document {
  id: string
  name: string
  type: string
  scrollBehavior: string
  boundVariables: DocumentBoundVariables
  blendMode: string
  children: Child[]
  absoluteBoundingBox: Absolute
  absoluteRenderBounds: Absolute
  constraints: Constraints
  layoutAlign: string
  layoutGrow: number
  layoutSizingHorizontal: string
  layoutSizingVertical: string
  clipsContent: boolean
  background: Background[]
  fills: Background[]
  strokes: any[]
  strokeWeight: number
  strokeAlign: string
  backgroundColor: Color
  layoutMode: string
  counterAxisSizingMode: string
  primaryAxisSizingMode: string
  counterAxisAlignItems: string
  layoutWrap: string
  effects: any[]
}

export interface Absolute {
  x: number
  y: number
  width: number
  height: number
}

export interface Background {
  blendMode: string
  type: string
  color: Color
  boundVariables: BackgroundBoundVariables
}

export interface BackgroundBoundVariables {
  color: Fill
}

export interface Fill {
  type: string
  id: string
}

export interface Color {
  r: number
  g: number
  b: number
  a: number
}

export interface DocumentBoundVariables {
  fills: Fill[]
}

export interface Child {
  id: string
  name: string
  type: string
  scrollBehavior: string
  boundVariables?: ChildBoundVariables
  blendMode: string
  children: any[]
  absoluteBoundingBox: Absolute
  absoluteRenderBounds: Absolute
  constraints: Constraints
  layoutAlign: string
  layoutGrow: number
  layoutSizingHorizontal: string
  layoutSizingVertical: string
  clipsContent: boolean
  background: Background[]
  fills: Background[]
  strokes: Background[]
  strokeWeight: number
  individualStrokeWeights?: IndividualStrokeWeights
  strokeAlign: string
  backgroundColor: Color
  layoutMode: string
  counterAxisSizingMode: string
  itemSpacing: number
  primaryAxisSizingMode: string
  counterAxisAlignItems?: string
  primaryAxisAlignItems: string
  paddingLeft?: number
  paddingRight?: number
  paddingTop: number
  paddingBottom: number
  layoutWrap: string
  effects: any[]
  componentId?: string
  componentProperties?: ComponentProperties
  overrides?: Override[]
}

export interface ChildBoundVariables {
  fills: Fill[]
  strokes: Fill[]
}

export interface ComponentProperties {
  type: Type
}

export interface Type {
  value: string
  type: string
  boundVariables: Les
}

export interface Les {}

export interface Constraints {
  vertical: string
  horizontal: string
}

export interface IndividualStrokeWeights {
  top: number
  right: number
  bottom: number
  left: number
}

export interface Override {
  id: string
  overriddenFields: string[]
}

interface FigmaFileOptions {
  depth?: number
}

export function fetchFigmaFile(
  fileKey: string,
  ids: string | string[],
  { depth }: FigmaFileOptions = {},
): Promise<FigmaFile> {
  const args = [`ids=${ids}`, !!depth ? `depth=${depth}` : undefined].filter(i => !!i).join('&')
  return fetchFigma(`/files/${fileKey}/nodes?${args}`)
}
