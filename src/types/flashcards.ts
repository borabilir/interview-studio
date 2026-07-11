import type { Difficulty, EntityId, ISODateString, Tag } from "./common";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface FlashcardReview {
  id: EntityId;
  rating: ReviewRating;
  reviewedAt: ISODateString;
  previousIntervalDays: number;
  nextIntervalDays: number;
  responseTimeSeconds: number;
}

export interface Flashcard {
  id: EntityId;
  question: string;
  answer: string;
  hint?: string;
  difficulty: Difficulty;
  topicId: EntityId;
  tags: Tag[];
  dueAt: ISODateString;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
  suspended: boolean;
  reviews: FlashcardReview[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface FlashcardStats {
  due: number;
  learned: number;
  reviewedToday: number;
  retentionRate: number;
  currentStreak: number;
}

