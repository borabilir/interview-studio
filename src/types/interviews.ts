import type {
  ConfidenceLevel,
  EntityId,
  EvaluationDimension,
  ISODateString,
  Tag,
} from "./common";

export type InterviewType = "technical" | "behavioral" | "hr" | "system-design";
export type InterviewStatus = "scheduled" | "in-progress" | "completed" | "abandoned";

export interface InterviewQuestion {
  id: EntityId;
  prompt: string;
  type: InterviewType;
  topicIds: EntityId[];
  expectedSignals: string[];
  followUpPrompts: string[];
  timeLimitMinutes?: number;
}

export interface InterviewAnswerEvaluation {
  overallScore: number;
  technicalAccuracy: EvaluationDimension;
  communication: EvaluationDimension;
  confidence: EvaluationDimension;
  structure: EvaluationDimension;
  missingDetails: string[];
  strengths: string[];
  suggestedAnswer: string;
  followUpQuestions: string[];
}

export interface InterviewAnswer {
  id: EntityId;
  questionId: EntityId;
  answer: string;
  durationSeconds: number;
  confidence: ConfidenceLevel;
  evaluation?: InterviewAnswerEvaluation;
  answeredAt: ISODateString;
}

export interface InterviewSession {
  id: EntityId;
  title: string;
  type: InterviewType;
  status: InterviewStatus;
  company?: string;
  role: string;
  difficulty: "junior" | "mid" | "senior" | "lead";
  tags: Tag[];
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  overallScore?: number;
  scheduledAt?: ISODateString;
  startedAt?: ISODateString;
  completedAt?: ISODateString;
  durationMinutes: number;
}
