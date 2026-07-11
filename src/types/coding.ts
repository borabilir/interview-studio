import type {
  ConfidenceLevel,
  Difficulty,
  EntityId,
  EvaluationDimension,
  ISODateString,
  Tag,
} from "./common";

export type CodeLanguage =
  | "csharp"
  | "sql"
  | "javascript"
  | "typescript"
  | "json"
  | "yaml"
  | "dockerfile"
  | "bash"
  | "xml";

export type AttemptStatus = "draft" | "submitted" | "reviewed";

export interface CodeSnippet {
  language: CodeLanguage;
  code: string;
  filename?: string;
}

export type ReviewScore = EvaluationDimension;

export interface CodingEvaluation {
  overallScore: number;
  correctness: ReviewScore;
  readability: ReviewScore;
  performance: ReviewScore;
  architecture: ReviewScore;
  bestPractices: string[];
  interviewFeedback: string;
  followUpQuestions: string[];
  alternativeSolution?: CodeSnippet;
  seniorImprovements: string[];
  reviewedAt: ISODateString;
}

export interface CodingAttempt {
  id: EntityId;
  questionId: EntityId;
  number: number;
  solution: CodeSnippet;
  notes?: string;
  status: AttemptStatus;
  durationMinutes: number;
  evaluation?: CodingEvaluation;
  createdAt: ISODateString;
  submittedAt?: ISODateString;
}

export interface CodingQuestion {
  id: EntityId;
  title: string;
  slug: string;
  description: string;
  constraints: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  difficulty: Difficulty;
  language: CodeLanguage;
  starterCode: CodeSnippet;
  expectedSolution: CodeSnippet;
  topicIds: EntityId[];
  tags: Tag[];
  confidence: ConfidenceLevel;
  estimatedMinutes: number;
  companies?: string[];
  attempts: CodingAttempt[];
  solved: boolean;
  lastAttemptedAt?: ISODateString;
  createdAt: ISODateString;
}
