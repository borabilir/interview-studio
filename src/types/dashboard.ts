import type { EntityId, ISODateString, Trend } from "./common";
import type { StudyActivity } from "./study-plan";

export interface DashboardMetric {
  id: EntityId;
  label: string;
  value: string;
  helperText: string;
  icon: "flame" | "sparkles" | "clock" | "circle-check";
  trend?: Trend;
  accent: string;
}

export interface WeakTopicSummary {
  topicId: EntityId;
  name: string;
  confidence: number;
  progress: number;
  recommendation: string;
}

export interface RecentActivity {
  id: EntityId;
  type: "note" | "coding" | "review" | "interview" | "system-design";
  title: string;
  detail: string;
  targetId: EntityId;
  occurredAt: ISODateString;
  score?: number;
}

export interface RecentAIFeedback {
  id: EntityId;
  sourceType: "coding" | "note" | "interview" | "system-design";
  sourceId: EntityId;
  title: string;
  summary: string;
  score?: number;
  createdAt: ISODateString;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface DashboardData {
  greeting: string;
  dateLabel: string;
  focusMessage: string;
  metrics: DashboardMetric[];
  todaysPlan: StudyActivity[];
  weakTopics: WeakTopicSummary[];
  recentActivity: RecentActivity[];
  recentAIFeedback: RecentAIFeedback[];
  confidenceHistory: ChartPoint[];
  upcomingReviewIds: EntityId[];
  recentNoteIds: EntityId[];
  recentCodingQuestionIds: EntityId[];
}
