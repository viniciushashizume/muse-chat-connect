// src/types/challenge.ts

export type ChallengeType = "multiple-choice" | "essay" | "code" | "error";
export type ChallengeDifficulty = "easy" | "medium" | "hard" | "none";

export interface ChallengeOption {
  id: string;
  text: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  options?: ChallengeOption[];
  correctOptionId?: string;
  expectedOutput?: string;
  userAnswer?: string;
  isCorrect?: boolean;
  completed?: boolean;
  feedback?: string; // <<< ADICIONADO
}