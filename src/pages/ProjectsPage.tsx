import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BookOpen, FileText, FolderOpen, Loader2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActionButton, EmptyState, PageHeader, Panel, StatusPill } from '../components/features/FeaturePrimitives'
import { MarkdownAnswer } from '../components/features/MarkdownAnswer'
import { useI18n } from '../i18n'
import { api } from '../services/api'
import type {
  ProjectDocumentSection,
  ProjectDocumentSectionContent,
  ProjectDocumentSummary,
} from '../types/project-documents'

const EMPTY_PROJECTS: ProjectDocumentSummary[] = []
const EMPTY_SECTIONS: ProjectDocumentSection[] = []

export default function ProjectsPage() {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const { projectId = '', sectionId = '' } = useParams()

  const projectsQuery = useQuery({
    queryKey: ['project-documents'],
    queryFn: () => api.projectDocuments.list<ProjectDocumentSummary[]>(),
  })

  const projects = useMemo(
    () => [...(projectsQuery.data ?? EMPTY_PROJECTS)].sort((left, right) => {
      if (left.id === 'ledgerly') return -1
      if (right.id === 'ledgerly') return 1
      return left.name.localeCompare(right.name, locale)
    }),
    [locale, projectsQuery.data],
  )
  const selectedProject = projects.find((project) => project.id === projectId)

  const sectionsQuery = useQuery({
    queryKey: ['project-documents', projectId, 'sections'],
    queryFn: () => api.projectDocuments.sections<ProjectDocumentSection[]>(projectId),
    enabled: Boolean(projectId),
  })
  const sections = sectionsQuery.data ?? EMPTY_SECTIONS
  const selectedSectionId = sectionId && sections.some((section) => section.id === sectionId)
    ? sectionId
    : sections[0]?.id ?? ''
  const selectedSection = sections.find((section) => section.id === selectedSectionId)
  const selectedSectionIndex = sections.findIndex((section) => section.id === selectedSectionId)

  const documentQuery = useQuery({
    queryKey: ['project-documents', projectId, 'sections', selectedSectionId],
    queryFn: () => api.projectDocuments.section<ProjectDocumentSectionContent>(projectId, selectedSectionId),
    enabled: Boolean(projectId && selectedSectionId),
  })

  if (projectsQuery.isLoading) {
    return (
      <Panel className="grid min-h-80 place-items-center">
        <Loader2 className="size-5 animate-spin text-primary" aria-label={t('Projeler yükleniyor', 'Loading projects')} />
      </Panel>
    )
  }

  if (projectsQuery.isError) {
    return (
      <Panel>
        <EmptyState
          icon={FolderOpen}
          title={t('Projeler yüklenemedi', 'Projects could not be loaded')}
          description={t('API bağlantısını kontrol edip tekrar deneyin.', 'Check the API connection and try again.')}
        />
      </Panel>
    )
  }

  if (!projectId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('Proje bilgi tabanı', 'Project knowledge base')}
          title={t('Projeler', 'Projects')}
          description={t(
            'Amaç, kapsam, mimari kararlar, deneyler ve öğrenilenler bölüm bölüm yaşayan dokümanlara dönüşür.',
            'Scope, decisions, experiments, and lessons become structured living documents.',
          )}
        />

        {projects.length === 0 ? (
          <Panel>
            <EmptyState
              icon={FolderOpen}
              title={t('Henüz proje belgesi yok', 'No project documents yet')}
              description={t(
                'App_Data/project-docs dizinine bir Markdown belgesi ekleyin.',
                'Add a Markdown document to the App_Data/project-docs directory.',
              )}
            />
          </Panel>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => navigate(`/projects/${encodeURIComponent(project.id)}`)}
                className="group rounded-[22px] border border-border/70 bg-card/85 p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <FolderOpen className="size-5" aria-hidden="true" />
                  </span>
                  <StatusPill tone={project.status === 'Inception' ? 'warning' : 'neutral'}>
                    {project.status ?? t('Referans', 'Reference')}
                  </StatusPill>
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-foreground">{project.name}</h2>
                {project.subtitle ? <p className="mt-1 text-sm font-medium text-primary">{project.subtitle}</p> : null}
                <p className="mt-3 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-muted-foreground">
                  {project.description ?? t('Proje bağlamı ve teknik değerlendirme notları.', 'Project context and technical notes.')}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
                  <span>{t(`${project.sectionCount ?? 1} bölüm`, `${project.sectionCount ?? 1} sections`)}</span>
                  <span className="flex items-center gap-1 font-medium text-primary">
                    {t('Projeyi aç', 'Open project')}
                    <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!selectedProject) {
    return (
      <Panel>
        <EmptyState
          icon={FolderOpen}
          title={t('Proje bulunamadı', 'Project not found')}
          description={t('Proje listesine dönüp başka bir proje seçin.', 'Return to the project list and select another project.')}
          action={(
            <ActionButton icon={ArrowLeft} onClick={() => navigate('/projects')}>
              {t('Projelere dön', 'Back to projects')}
            </ActionButton>
          )}
        />
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      <Panel className="relative overflow-hidden px-5 py-7 sm:px-8 sm:py-9">
        <div className="absolute -right-16 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusPill tone={selectedProject.status === 'Inception' ? 'warning' : 'purple'}>
                {selectedProject.status ?? t('Yaşayan belge', 'Living document')}
              </StatusPill>
              <StatusPill tone="neutral">
                {t(
                  `${selectedProject.sectionCount ?? sections.length} bölüm`,
                  `${selectedProject.sectionCount ?? sections.length} sections`,
                )}
              </StatusPill>
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl">
              {selectedProject.name}
            </h2>
            {selectedProject.subtitle ? (
              <p className="mt-2 text-base font-medium text-primary">{selectedProject.subtitle}</p>
            ) : null}
            {selectedProject.description ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/80">{selectedProject.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <BookOpen className="size-4 text-primary" aria-hidden="true" />
              {t('Markdown · Version control', 'Markdown · Version control')}
            </div>
            <ActionButton icon={ArrowLeft} onClick={() => navigate('/projects')}>
              {t('Proje görünümünden çık', 'Exit project view')}
            </ActionButton>
          </div>
        </div>
      </Panel>

      <Panel className="min-h-[36rem] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3 sm:px-8">
          <p className="min-w-0 truncate text-xs text-foreground/70">
            <span className="font-medium text-foreground">{selectedProject.name}</span>
            {selectedSection ? <span> / {selectedSection.title}</span> : null}
          </p>
          <StatusPill tone="neutral">Markdown</StatusPill>
        </div>

        {sectionsQuery.isLoading || documentQuery.isLoading ? (
          <div className="grid min-h-[32rem] place-items-center">
            <Loader2 className="size-5 animate-spin text-primary" aria-label={t('Belge yükleniyor', 'Loading document')} />
          </div>
        ) : sectionsQuery.isError || documentQuery.isError ? (
          <EmptyState
            icon={FileText}
            title={t('Belge yüklenemedi', 'Document could not be loaded')}
            description={t('API’yi yeniden başlatıp belgeyi tekrar açın.', 'Restart the API and open the document again.')}
          />
        ) : documentQuery.data ? (
          <>
            <article className="max-w-5xl px-5 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
              <MarkdownAnswer value={documentQuery.data.content} className="project-document" />
            </article>

            {sections.length > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-4 sm:px-8">
                {selectedSectionIndex > 0 ? (
                  <ActionButton
                    icon={ArrowLeft}
                    onClick={() => navigate(`/projects/${encodeURIComponent(projectId)}/${encodeURIComponent(sections[selectedSectionIndex - 1].id)}`)}
                  >
                    {sections[selectedSectionIndex - 1].title}
                  </ActionButton>
                ) : <span />}
                {selectedSectionIndex >= 0 && selectedSectionIndex < sections.length - 1 ? (
                  <ActionButton
                    onClick={() => navigate(`/projects/${encodeURIComponent(projectId)}/${encodeURIComponent(sections[selectedSectionIndex + 1].id)}`)}
                  >
                    {sections[selectedSectionIndex + 1].title}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </ActionButton>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </Panel>
    </div>
  )
}
