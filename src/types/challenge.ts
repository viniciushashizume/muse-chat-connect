export type ChallengeType = "multiple-choice" | "code";

export interface MultipleChoiceOption {
  id: string;
  text: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  difficulty: "easy" | "medium" | "hard";
  
  // Para múltipla escolha
  options?: MultipleChoiceOption[];
  correctOptionId?: string;
  
  // Para código
  codeTemplate?: string;
  expectedOutput?: string;
  
  // Resposta do usuário
  userAnswer?: string;
  isCorrect?: boolean;
  completed?: boolean;
}
