export type ProjectDocumentSummary = {
  id: string
  name: string
  subtitle?: string | null
  description?: string | null
  status?: string
  sectionCount?: number
}

export type ProjectDocumentSection = {
  id: string
  title: string
}

export type ProjectDocumentSectionContent = ProjectDocumentSection & {
  projectId: string
  content: string
}
