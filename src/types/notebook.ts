export type NotebookOutput = {
  output_type: string
  data?: Record<string, unknown>
  metadata?: Record<string, unknown>
  text?: string | string[]
  name?: string
  ename?: string
  evalue?: string
  traceback?: string[]
  execution_count?: number | null
}

export type NotebookCell = {
  cell_type: string
  source: string | string[]
  outputs?: NotebookOutput[]
  execution_count?: number | null
  metadata?: Record<string, unknown>
}

export type NotebookJson = {
  nbformat: number
  nbformat_minor?: number
  metadata?: Record<string, unknown>
  cells?: NotebookCell[]
  // nbformat v3 legacy shape, upgraded to `cells` by `convertNotebook`.
  worksheets?: Array<{ cells: Record<string, unknown>[] }>
  [key: string]: unknown
}

export type NotebookResourceData = {
  notebook: NotebookJson
  markdownHtml: Record<string, string>
}
