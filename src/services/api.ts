const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const details = await response.json().catch(() => undefined)
    const problem = details as { detail?: string; title?: string } | undefined
    throw new ApiError(
      problem?.detail ?? problem?.title ?? `Request failed with status ${response.status}`,
      response.status,
      details,
    )
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function queryString(values: Record<string, string | number | boolean | null | undefined>) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const api = {
  dashboard: {
    get: <T>() => request<T>('/api/dashboard'),
  },
  topics: {
    list: <T>() => request<T>('/api/topics'),
    get: <T>(id: string) => request<T>(`/api/topics/${encodeURIComponent(id)}`),
    create: <T>(input: unknown) => request<T>('/api/topics', { method: 'POST', body: input }),
    update: <T>(id: string, input: unknown) =>
      request<T>(`/api/topics/${encodeURIComponent(id)}`, { method: 'PUT', body: input }),
    updateProgress: <T>(id: string, input: unknown) =>
      request<T>(`/api/topics/${encodeURIComponent(id)}/progress`, { method: 'PATCH', body: input }),
    remove: (id: string) => request<void>(`/api/topics/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  notes: {
    list: <T>(filters: { search?: string; pinnedOnly?: boolean; favoritesOnly?: boolean; topicId?: string } = {}) =>
      request<T>(`/api/notes${queryString(filters)}`),
    get: <T>(id: string) => request<T>(`/api/notes/${encodeURIComponent(id)}`),
    create: <T>(input: unknown) => request<T>('/api/notes', { method: 'POST', body: input }),
    update: <T>(id: string, input: unknown) => request<T>(`/api/notes/${encodeURIComponent(id)}`, { method: 'PUT', body: input }),
    remove: (id: string) => request<void>(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  coding: {
    list: <T>(filters: { search?: string; difficulty?: string; language?: string; topicId?: string } = {}) =>
      request<T>(`/api/coding-questions${queryString(filters)}`),
    get: <T>(questionId: string) =>
      request<T>(`/api/coding-questions/${encodeURIComponent(questionId)}`),
    updateDraft: <T>(questionId: string, input: unknown) =>
      request<T>(`/api/coding-questions/${encodeURIComponent(questionId)}/draft`, {
        method: 'PATCH',
        body: input,
      }),
    submit: <T>(questionId: string, input: unknown) => request<T>(`/api/coding-questions/${encodeURIComponent(questionId)}/attempts`, { method: 'POST', body: input }),
  },
  flashcards: {
    list: <T>(filters: { search?: string; dueOnly?: boolean; topicId?: string; tag?: string } = {}) =>
      request<T>(`/api/flashcards${queryString(filters)}`),
    get: <T>(id: string) => request<T>(`/api/flashcards/${encodeURIComponent(id)}`),
    create: <T>(input: unknown) => request<T>('/api/flashcards', { method: 'POST', body: input }),
    update: <T>(id: string, input: unknown) =>
      request<T>(`/api/flashcards/${encodeURIComponent(id)}`, { method: 'PUT', body: input }),
    remove: (id: string) => request<void>(`/api/flashcards/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    review: <T>(id: string, input: unknown) =>
      request<T>(`/api/flashcards/${encodeURIComponent(id)}/review`, { method: 'POST', body: input }),
  },
  interviews: {
    list: <T>() => request<T>('/api/interview-sessions'),
    get: <T>(id: string) => request<T>(`/api/interview-sessions/${encodeURIComponent(id)}`),
    create: <T>(input: unknown) => request<T>('/api/interview-sessions', { method: 'POST', body: input }),
    answer: <T>(sessionId: string, input: unknown) => request<T>(`/api/interview-sessions/${encodeURIComponent(sessionId)}/answers`, { method: 'POST', body: input }),
    complete: <T>(sessionId: string, input?: unknown) =>
      request<T>(`/api/interview-sessions/${encodeURIComponent(sessionId)}/complete`, {
        method: 'POST',
        body: input,
      }),
  },
  systemDesign: {
    list: <T>(filters: { search?: string; topicId?: string } = {}) =>
      request<T>(`/api/system-design-scenarios${queryString(filters)}`),
    get: <T>(id: string) => request<T>(`/api/system-design-scenarios/${encodeURIComponent(id)}`),
    create: <T>(input: unknown) => request<T>('/api/system-design-scenarios', { method: 'POST', body: input }),
    update: <T>(id: string, input: unknown) =>
      request<T>(`/api/system-design-scenarios/${encodeURIComponent(id)}`, { method: 'PUT', body: input }),
    remove: (id: string) =>
      request<void>(`/api/system-design-scenarios/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  progress: {
    list: <T>() => request<T>('/api/progress'),
    overview: <T>() => request<T>('/api/progress/overview'),
    create: <T>(input: unknown) => request<T>('/api/progress', { method: 'POST', body: input }),
  },
  studyPlans: {
    list: <T>() => request<T>('/api/study-plans'),
    today: <T>() => request<T>('/api/study-plans/today'),
    get: <T>(id: string) => request<T>(`/api/study-plans/${encodeURIComponent(id)}`),
    updateItem: <T>(planId: string, itemId: string, input: unknown) =>
      request<T>(
        `/api/study-plans/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}`,
        { method: 'PATCH', body: input },
      ),
    toggleItem: <T>(planId: string, itemId: string) =>
      request<T>(
        `/api/study-plans/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}/toggle`,
        { method: 'POST' },
      ),
  },
  search: <T>(query: string) => request<T>(`/api/search${queryString({ q: query })}`),
}
