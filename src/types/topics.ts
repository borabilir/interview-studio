import type {
  ConfidenceLevel,
  EntityId,
  ISODateString,
  Priority,
  Tag,
} from "./common";

export type TopicCategory =
  | "Language"
  | "Framework"
  | "Frontend"
  | "Data"
  | "Architecture"
  | "Infrastructure"
  | "Messaging"
  | "Domain"
  | "Process";

export type TopicStatus = "not-started" | "learning" | "reviewing" | "mastered";

export interface TopicExample {
  id: EntityId;
  title: string;
  prompt: string;
  answer?: string;
}

export interface TopicResource {
  id: EntityId;
  label: string;
  type: "note" | "question" | "system-design" | "external";
  href: string;
}

export interface Topic {
  id: EntityId;
  name: string;
  slug: string;
  description: string;
  category: TopicCategory;
  priority: Priority;
  status: TopicStatus;
  progress: number;
  confidence: ConfidenceLevel;
  estimatedMasteryHours: number;
  studiedHours: number;
  tags: Tag[];
  examples: TopicExample[];
  resources: TopicResource[];
  nextReviewAt?: ISODateString;
  lastStudiedAt?: ISODateString;
  accent: string;
}

