import type { EntityId, ISODateString, Priority } from "./common";

export type StudyActivityType =
  | "learn"
  | "review"
  | "coding"
  | "flashcards"
  | "mock-interview"
  | "system-design";

export interface StudyActivity {
  id: EntityId;
  title: string;
  description: string;
  type: StudyActivityType;
  targetId?: EntityId;
  durationMinutes: number;
  completed: boolean;
  priority: Priority;
  scheduledAt?: ISODateString;
}

export interface StudyPlanDay {
  date: ISODateString;
  focus: string;
  goalMinutes: number;
  activities: StudyActivity[];
}

export interface StudyPlan {
  id: EntityId;
  title: string;
  description: string;
  startDate: ISODateString;
  endDate: ISODateString;
  targetRole: string;
  targetCompany?: string;
  days: StudyPlanDay[];
}

