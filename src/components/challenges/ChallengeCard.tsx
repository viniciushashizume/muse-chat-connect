// src/components/challenges/ChallengeCard.tsx
import { useState } from "react";
import { Challenge } from "@/types/challenge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface ChallengeCardProps {
  challenge: Challenge;
  onSubmit: (challengeId: string, answer: string) => void;
  isSubmitting?: boolean;
}

export function ChallengeCard({ challenge, onSubmit, isSubmitting}: ChallengeCardProps) {
  // --- 1. ESTADO INTERNO 'submitted' REMOVIDO ---

  // Estados para controlar os inputs (isso está correto)
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [textAnswer, setTextAnswer] = useState(challenge.codeTemplate || "");
  
  // Variável para verificar se uma tentativa foi feita (baseado na prop)
  const hasAttempted = challenge.userAnswer !== undefined;

  const handleSubmit = () => {
    const answer = (challenge.type === "multiple-choice") ? selectedOption : textAnswer;
    onSubmit(challenge.id, answer);
    // --- 2. 'setSubmitted(true)' REMOVIDO DAQUI ---
  };

  const getDifficultyColor = () => {
    switch (challenge.difficulty) {
      case "easy": return "bg-green-500";
      case "medium": return "bg-yellow-500";
      case "hard": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  if (challenge.type === "error") {
    // (Lógica de erro permanece igual)
    return (
      <Card className="w-full border-red-500/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-red-700">{challenge.title}</CardTitle>
              <CardDescription>{challenge.description}</CardDescription>
            </div>
            <Badge variant="destructive">
              Erro
            </Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>{challenge.title}</CardTitle>
            <CardDescription>{challenge.description}</CardDescription>
          </div>
          <Badge className={getDifficultyColor()}>
            {challenge.difficulty}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {challenge.type === "multiple-choice" && challenge.options && (
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
            {challenge.options.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                {/* --- 3. 'disabled' agora usa 'challenge.completed' --- */}
                {/* challenge.completed só será true se a resposta for correta */}
                <RadioGroupItem value={option.id} id={option.id} disabled={challenge.completed} />
                <Label htmlFor={option.id} className="cursor-pointer">
                  {option.text}
                </Label>
                {/* --- 4. Feedback visual usa 'hasAttempted' --- */}
                {hasAttempted && option.id === challenge.correctOptionId && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {hasAttempted && option.id === selectedOption && option.id !== challenge.correctOptionId && (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            ))}
          </RadioGroup>
        )}

        {challenge.type === "code" && (
          <div className="space-y-2">
            <Label htmlFor={`code-${challenge.id}`}>Seu código:</Label>
            <Textarea
              id={`code-${challenge.id}`}
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              className="font-mono min-h-[200px]"
              placeholder="Digite seu código aqui..."
              // --- 3. 'disabled' agora usa 'challenge.completed' ---
              disabled={challenge.completed}
            />
            {challenge.expectedOutput && (
              <p className="text-sm text-muted-foreground">
                Output esperado: <code className="bg-muted px-1 py-0.5 rounded">{challenge.expectedOutput}</code>
              </p>
            )}
          </div>
        )}

        {challenge.type === "essay" && (
          <div className="space-y-2">
            <Label htmlFor={`essay-${challenge.id}`}>Sua resposta:</Label>
            <Textarea
              id={`essay-${challenge.id}`}
              value={textAnswer} 
              onChange={(e) => setTextAnswer(e.target.value)}
              className="min-h-[150px]"
              placeholder="Digite sua resposta dissertativa aqui..."
              // --- 3. 'disabled' agora usa 'challenge.completed' ---
              disabled={challenge.completed}
            />
          </div>
        )}

        {/* --- 4. Bloco de feedback principal usa 'hasAttempted' --- */}
        {hasAttempted && challenge.isCorrect !== undefined && (
          <div className={`p-4 rounded-lg ${challenge.isCorrect ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700"}`}>
            {challenge.isCorrect ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>Correto! Parabéns!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                <span>{challenge.type === 'essay' ? 'Resposta submetida.' : 'Incorreto. Tente novamente!'}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={
            // --- 5. Lógica de 'disabled' do botão usa 'challenge.completed' ---
            challenge.completed ||
            (challenge.type === "multiple-choice" && !selectedOption) ||
            ((challenge.type === "code" || challenge.type === "essay") && !textAnswer.trim())
          }
          className="w-full"
        >
          {/* --- 6. Texto do botão usa 'challenge.completed' --- */}
          {challenge.completed ? 'Enviado' : 'Submeter Resposta'}
        </Button>
      </CardFooter>
    </Card>
  );
}