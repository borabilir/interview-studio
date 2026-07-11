import type { Difficulty, EntityId, ISODateString, Tag } from "./common";

export interface SystemRequirement {
  id: EntityId;
  type: "functional" | "non-functional";
  text: string;
  priority: "must" | "should" | "could";
}

export interface ArchitectureComponent {
  id: EntityId;
  name: string;
  responsibility: string;
  technology?: string;
  connections: EntityId[];
}

export interface SystemDesignSection {
  summary: string;
  decisions: string[];
  tradeoffs: string[];
}

export interface SystemDesignCritique {
  score: number;
  strengths: string[];
  risks: string[];
  missingConsiderations: string[];
  interviewerFollowUps: string[];
  generatedAt: ISODateString;
}

export interface SystemDesignScenario {
  id: EntityId;
  title: string;
  slug: string;
  problem: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  requirements: SystemRequirement[];
  constraints: string[];
  architecture: ArchitectureComponent[];
  diagram?: string;
  sections: {
    scalability: SystemDesignSection;
    security: SystemDesignSection;
    caching: SystemDesignSection;
    monitoring: SystemDesignSection;
    logging: SystemDesignSection;
    messageQueue: SystemDesignSection;
    database: SystemDesignSection;
    apiDesign: SystemDesignSection;
  };
  pros: string[];
  cons: string[];
  tags: Tag[];
  topicIds: EntityId[];
  critique?: SystemDesignCritique;
  progress: number;
  lastPracticedAt?: ISODateString;
}

