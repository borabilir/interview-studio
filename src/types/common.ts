export type EntityId = string;
export type ISODateString = string;

export type Difficulty = "easy" | "medium" | "hard";
export type Priority = "low" | "medium" | "high" | "critical";
export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;
export type TrendDirection = "up" | "down" | "stable";

export interface Tag {
  id: EntityId;
  name: string;
  color: string;
  description?: string;
}

export interface ProgressValue {
  current: number;
  target: number;
  unit?: string;
}

export interface Trend {
  direction: TrendDirection;
  value: number;
  label: string;
}

export interface EvaluationDimension {
  score: number;
  feedback: string;
}

export interface DateRange {
  start: ISODateString;
  end: ISODateString;
}

export interface AIInsight {
  id: EntityId;
  kind: "strength" | "gap" | "suggestion" | "warning";
  title: string;
  body: string;
  createdAt: ISODateString;
  confidence?: number;
}

export interface SearchableEntity {
  id: EntityId;
  title: string;
  description?: string;
  tags: Tag[];
  updatedAt: ISODateString;
}
