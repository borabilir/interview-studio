export type ApiPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type ApiDifficulty = 'Easy' | 'Medium' | 'Hard'
export type ApiInterviewFrequency = 'Low' | 'Medium' | 'High' | 'VeryHigh'

export interface TopicDto {
  id: string
  name: string
  category: string
  description: string
  priority: ApiPriority
  progress: number
  confidenceLevel: number
  estimatedMastery: number
  accentColor: string
  sortOrder: number
  parentTopicId?: string | null
  parentTopicName?: string | null
  tags: string[]
  updatedAtUtc: string
}

export interface CreateTopicInput {
  name: string
  category: string
  description?: string
  priority: ApiPriority
  progress: number
  confidenceLevel: number
  estimatedMastery: number
  accentColor?: string
  sortOrder?: number | null
  parentTopicId?: string | null
  tags?: string[]
}

export interface UpdateTopicInput extends CreateTopicInput {
  description: string
  accentColor: string
  parentTopicId: string | null
  tags: string[]
}

export interface UpdateTopicProgressInput {
  progress: number
  confidenceLevel: number
}

export interface ReorderTopicsInput {
  parentTopicId?: string | null
  topicIds: string[]
}

export interface NoteSummaryDto {
  id: string
  title: string
  preview: string
  isPinned: boolean
  isFavorite: boolean
  topicName?: string | null
  tags: string[]
  updatedAtUtc: string
}

export interface NoteVersionDto {
  id: string
  version: number
  title: string
  changeSummary: string
  createdAtUtc: string
}

export interface NoteDetailDto {
  id: string
  title: string
  content: string
  aiSummary?: string | null
  aiExplanation?: string | null
  aiImprovementSuggestions?: string | null
  isPinned: boolean
  isFavorite: boolean
  currentVersion: number
  topicId?: string | null
  topicName?: string | null
  tags: string[]
  versions: NoteVersionDto[]
  createdAtUtc: string
  updatedAtUtc: string
}

export interface CreateNoteInput {
  title: string
  content?: string
  topicId?: string | null
  isPinned: boolean
  isFavorite: boolean
  tags?: string[]
}

export interface UpdateNoteInput extends CreateNoteInput {
  content: string
  topicId: string | null
  tags: string[]
  aiSummary?: string | null
  aiExplanation?: string | null
  aiImprovementSuggestions?: string | null
  changeSummary?: string | null
}

export interface CodingQuestionSummaryDto {
  id: string
  title: string
  description: string
  difficulty: ApiDifficulty
  language: string
  confidence: number
  topicId?: string | null
  topicName?: string | null
  tags: string[]
  attemptCount: number
  bestCorrectnessScore?: number | null
  lastAttemptedAtUtc?: string | null
  updatedAtUtc: string
}

export interface CodingAttemptDto {
  id: string
  attemptNumber: number
  solution: string
  language: string
  correctnessScore: number
  readabilityScore: number
  performanceScore: number
  architectureScore: number
  bestPracticesFeedback: string
  interviewFeedback: string
  followUpQuestions: string
  alternativeSolution: string
  seniorLevelImprovements: string
  durationMinutes: number
  submittedAtUtc: string
}

export interface CodingQuestionDetailDto {
  id: string
  title: string
  description: string
  difficulty: ApiDifficulty
  language: string
  starterCode: string
  expectedSolution: string
  personalSolution: string
  confidence: number
  topicId?: string | null
  topicName?: string | null
  tags: string[]
  attempts: CodingAttemptDto[]
  createdAtUtc: string
  updatedAtUtc: string
}

export interface CodingAttemptEvaluationInput {
  correctnessScore: number
  readabilityScore: number
  performanceScore: number
  architectureScore: number
  bestPracticesFeedback: string
  interviewFeedback: string
  followUpQuestions: string
  alternativeSolution: string
  seniorLevelImprovements: string
}

export interface CreateCodingAttemptInput {
  solution: string
  language: string
  durationMinutes: number
  evaluation?: CodingAttemptEvaluationInput | null
}

export interface UpdateCodingDraftInput {
  personalSolution: string
}

export interface FlashcardDto {
  id: string
  question: string
  answer: string
  why?: string | null
  productionExample?: string | null
  bankingExample?: string | null
  interviewTip?: string | null
  interviewFrequency?: ApiInterviewFrequency | null
  difficulty: ApiDifficulty
  topicId?: string | null
  topicName?: string | null
  tags: string[]
  nextReviewAtUtc: string
  lastReviewedAtUtc?: string | null
  intervalDays: number
  repetitionCount: number
  easeFactor: number
  reviewCount: number
  correctReviewCount: number
  createdAtUtc: string
  updatedAtUtc: string
}

export interface UpsertFlashcardInput {
  question: string
  answer: string
  why?: string | null
  productionExample?: string | null
  bankingExample?: string | null
  interviewTip?: string | null
  interviewFrequency?: ApiInterviewFrequency | null
  difficulty: ApiDifficulty
  topicId: string | null
  tags: string[]
}

export interface SystemDesignSummaryDto {
  id: string
  title: string
  problem: string
  confidence: number
  topicId?: string | null
  topicName?: string | null
  tags: string[]
  updatedAtUtc: string
}

export type SearchEntityType =
  | 'Topic'
  | 'Note'
  | 'CodingQuestion'
  | 'Flashcard'
  | 'InterviewSession'
  | 'InterviewQuestion'
  | 'SystemDesignScenario'

export interface SearchResultDto {
  id: string
  title: string
  description?: string | null
  kind: SearchEntityType | string
  path: string
}
