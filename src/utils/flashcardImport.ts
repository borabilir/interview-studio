import type { ApiDifficulty, ApiInterviewFrequency } from '../types/api'

export type ParsedCodeBlock = {
  language: string
  code: string
}

export type ParsedFlashcardImport = {
  topic?: string
  subtopic?: string
  question?: string
  answer?: string
  why?: string
  codeBlocks: ParsedCodeBlock[]
  productionExample?: string
  bankingExample?: string
  interviewTip?: string
  difficulty?: ApiDifficulty
  interviewFrequency?: ApiInterviewFrequency
  tags: string[]
  questionType?: string
  relatedQuestions?: string
}

type SectionKey = keyof Omit<ParsedFlashcardImport, 'codeBlocks' | 'tags'>
  | 'code'
  | 'tags'

const emptyParsed: ParsedFlashcardImport = {
  codeBlocks: [],
  tags: [],
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/[?¿:：]/g, '')
    .replace(/\s+/g, ' ')
}

function mapHeading(heading: string): SectionKey | null {
  const normalized = normalize(heading)

  if (normalized === 'ana konu' || normalized === 'konu' || normalized === 'main topic') return 'topic'
  if (normalized === 'alt konu' || normalized === 'subtopic' || normalized === 'sub topic') return 'subtopic'
  if (normalized === 'soru' || normalized === 'question') return 'question'
  if (normalized === 'cevap' || normalized === 'answer') return 'answer'
  if (normalized === 'why') return 'why'
  if (normalized === 'kod' || normalized === 'code') return 'code'
  if (normalized === 'production example' || normalized === 'prod example') return 'productionExample'
  if (normalized === 'banking example') return 'bankingExample'
  if (normalized === 'interview tip' || normalized === 'mulakat ipucu') return 'interviewTip'
  if (normalized === 'zorluk' || normalized === 'difficulty') return 'difficulty'
  if (normalized === 'mulakatta sorulma olasiligi' || normalized === 'interview frequency') return 'interviewFrequency'
  if (normalized === 'etiketler' || normalized === 'tags') return 'tags'
  if (normalized === 'soru tipi' || normalized === 'question type') return 'questionType'
  if (normalized === 'ilgili sorular' || normalized === 'related questions') return 'relatedQuestions'

  return null
}

function cleanSection(value: string) {
  return value
    .replace(/^\s*---+\s*$/gm, '')
    .trim()
}

function unwrapSingleFence(value: string) {
  const cleaned = cleanSection(value)
  const match = /^```[^\n`]*\n([\s\S]*?)\n?```\s*$/.exec(cleaned)
  return (match?.[1] ?? cleaned).trim()
}

function parseDifficulty(value: string): ApiDifficulty | undefined {
  const normalized = normalize(value)
  if (normalized === 'kolay' || normalized === 'easy') return 'Easy'
  if (normalized === 'orta' || normalized === 'medium') return 'Medium'
  if (normalized === 'zor' || normalized === 'hard') return 'Hard'
  return undefined
}

function parseInterviewFrequency(value: string): ApiInterviewFrequency | undefined {
  const normalized = normalize(value)
  if (normalized === 'dusuk' || normalized === 'low') return 'Low'
  if (normalized === 'orta' || normalized === 'medium') return 'Medium'
  if (normalized === 'yuksek' || normalized === 'high') return 'High'
  if (normalized === 'cok yuksek' || normalized === 'very high' || normalized === 'veryhigh') return 'VeryHigh'
  return undefined
}

function splitTags(value: string) {
  return unwrapSingleFence(value)
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function extractCodeBlocks(value: string): ParsedCodeBlock[] {
  const cleaned = cleanSection(value)
  const blocks: ParsedCodeBlock[] = []
  const pattern = /```([^\n`]*)\n([\s\S]*?)```/g

  for (const match of cleaned.matchAll(pattern)) {
    const info = match[1].trim()
    const language = info.split(/\s+/)[0] || 'text'
    const code = match[2].replace(/\n$/, '').trim()
    if (code) blocks.push({ language, code })
  }

  if (blocks.length === 0 && cleaned) {
    blocks.push({ language: 'text', code: cleaned })
  }

  return blocks
}

export function formatCodeBlocks(codeBlocks: ParsedCodeBlock[]) {
  return codeBlocks
    .map(({ language, code }) => `\`\`\`${language}\n${code.trim()}\n\`\`\``)
    .join('\n\n')
}

export function appendCodeBlocksToAnswer(answer: string, codeBlocks: ParsedCodeBlock[]) {
  const formattedCode = formatCodeBlocks(codeBlocks)
  if (!formattedCode) return answer.trim()
  const trimmedAnswer = answer.trim()
  return `${trimmedAnswer}${trimmedAnswer ? '\n\n' : ''}## Kod\n\n${formattedCode}`.trim()
}

export function parseFlashcardImport(markdown: string): ParsedFlashcardImport {
  const parsed: ParsedFlashcardImport = { ...emptyParsed, codeBlocks: [], tags: [] }
  const headingPattern = /^#{1,3}\s+(.+?)\s*$/gm
  const headings = [...markdown.matchAll(headingPattern)]

  headings.forEach((heading, index) => {
    const key = mapHeading(heading[1])
    if (!key) return

    const start = heading.index + heading[0].length
    const end = headings[index + 1]?.index ?? markdown.length
    const content = markdown.slice(start, end)

    if (key === 'code') {
      parsed.codeBlocks.push(...extractCodeBlocks(content))
      return
    }

    if (key === 'tags') {
      parsed.tags = splitTags(content)
      return
    }

    if (key === 'difficulty') {
      parsed.difficulty = parseDifficulty(unwrapSingleFence(content))
      return
    }

    if (key === 'interviewFrequency') {
      parsed.interviewFrequency = parseInterviewFrequency(unwrapSingleFence(content))
      return
    }

    parsed[key] = unwrapSingleFence(content)
  })

  return parsed
}

export function hasParsedFlashcardFields(parsed: ParsedFlashcardImport) {
  return Boolean(
    parsed.topic
      || parsed.subtopic
      || parsed.question
      || parsed.answer
      || parsed.why
      || parsed.codeBlocks.length
      || parsed.productionExample
      || parsed.bankingExample
      || parsed.interviewTip
      || parsed.difficulty
      || parsed.interviewFrequency
      || parsed.tags.length
      || parsed.questionType
      || parsed.relatedQuestions,
  )
}

export function sameLooseName(a: string, b: string) {
  return normalize(a) === normalize(b)
}
