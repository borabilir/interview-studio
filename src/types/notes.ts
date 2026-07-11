import type { AIInsight, EntityId, ISODateString, Tag } from "./common";

export type NoteStatus = "draft" | "review" | "evergreen";

export interface NoteVersion {
  id: EntityId;
  version: number;
  createdAt: ISODateString;
  summary: string;
  wordCount: number;
}

export interface NoteAIAnalysis {
  summary: string;
  explanation: string;
  improvements: string[];
  keyTakeaways: string[];
  generatedAt: ISODateString;
}

export interface Note {
  id: EntityId;
  title: string;
  excerpt: string;
  content: string;
  topicId?: EntityId;
  status: NoteStatus;
  tags: Tag[];
  pinned: boolean;
  favorite: boolean;
  cover?: string;
  readingMinutes: number;
  wordCount: number;
  internalLinks: EntityId[];
  versions: NoteVersion[];
  aiAnalysis?: NoteAIAnalysis;
  insights: AIInsight[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

