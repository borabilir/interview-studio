import type { ChartPoint } from "./dashboard";
import type { EntityId, Trend } from "./common";

export interface ProgressMetric {
  id: EntityId;
  label: string;
  value: number;
  unit: string;
  trend: Trend;
}

export interface TopicProgressSummary {
  topicId: EntityId;
  name: string;
  progress: number;
  confidence: number;
  studiedHours: number;
}

export interface ProgressOverview {
  metrics: ProgressMetric[];
  weeklyMinutes: ChartPoint[];
  monthlyQuestions: ChartPoint[];
  confidenceHistory: ChartPoint[];
  strongestTopics: TopicProgressSummary[];
  weakestTopics: TopicProgressSummary[];
  completedTopicIds: EntityId[];
}

