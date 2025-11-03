// --- ALTERAÇÃO: Adicionado "essay" ---
export type ChallengeType = "multiple-choice" | "code" | "essay" | "error";

export interface MultipleChoiceOption {
  id: string;
  text: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  difficulty: "easy" | "medium" | "hard" | "none"; // Adicionado "none" para erros
  
  // Para múltipla escolha
  options?: MultipleChoiceOption[];
  correctOptionId?: string;
  
  // Para código
  codeTemplate?: string;
  expectedOutput?: string;

  // Para 'essay', nenhum campo extra é necessário
  
  // Resposta do usuário
  userAnswer?: string;
  isCorrect?: boolean;
  completed?: boolean;
}