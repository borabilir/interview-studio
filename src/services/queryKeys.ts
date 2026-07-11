export const queryKeys = {
  dashboard: ['dashboard'] as const,
  topics: {
    all: ['topics'] as const,
    detail: (id: string) => ['topics', id] as const,
  },
  notes: {
    all: ['notes'] as const,
    list: (search = '', topicId = '') => ['notes', 'list', { search, topicId }] as const,
    detail: (id: string) => ['notes', 'detail', id] as const,
  },
  coding: {
    all: ['coding-questions'] as const,
    list: (search = '', topicId = '') => ['coding-questions', 'list', { search, topicId }] as const,
    detail: (id: string) => ['coding-questions', 'detail', id] as const,
  },
  flashcards: {
    all: ['flashcards'] as const,
    list: (filters: { search?: string; dueOnly?: boolean; topicId?: string; tag?: string } = {}) =>
      ['flashcards', 'list', filters] as const,
    detail: (id: string) => ['flashcards', 'detail', id] as const,
  },
  systemDesign: {
    all: ['system-design-scenarios'] as const,
    list: (topicId = '') => ['system-design-scenarios', 'list', { topicId }] as const,
    detail: (id: string) => ['system-design-scenarios', 'detail', id] as const,
  },
  search: (query: string) => ['search', query] as const,
} as const
