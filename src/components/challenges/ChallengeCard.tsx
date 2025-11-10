// src/components/challenges/ChallengeCard.tsx
import { useState } from "react";
import { Challenge, ChallengeOption } from "@/types/challenge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
// 1. IMPORTAR ALERT E ÍCONES
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, X, Send, BrainCircuit, BookText, Code2, AlertCircle, CheckCircle2 } from "lucide-react";

interface ChallengeCardProps {
  challenge: Challenge;
  onSubmit: (challengeId: string, answer: string) => void;
  isSubmitting: boolean; // 2. ADICIONAR PROP IS_SUBMITTING
}

// ... (Componentes ChallengeIcon e DifficultyBadge não mudam) ...
const ChallengeIcon = ({ type }: { type: string }) => {
  const iconProps = { className: "h-5 w-5" };
  if (type === "essay") return <BookText {...iconProps} />;
  if (type === "code") return <Code2 {...iconProps} />;
  return <BrainCircuit {...iconProps} />;
};

const DifficultyBadge = ({ difficulty }: { difficulty: string }) => {
  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    easy: "default",
    medium: "secondary",
    hard: "destructive",
  };
  return <Badge variant={variantMap[difficulty] || "outline"}>{difficulty}</Badge>;
};


export function ChallengeCard({ challenge, onSubmit, isSubmitting }: ChallengeCardProps) { // 2. ADICIONAR PROP AQUI
  const [answer, setAnswer] = useState(challenge.userAnswer || "");
  const [selectedOption, setSelectedOption] = useState(challenge.userAnswer || "");

  const handleSubmit = () => {
    // Não permite submissão se já estiver submetendo
    if (isSubmitting) return; 
    
    const answerToSubmit = challenge.type === "multiple-choice" ? selectedOption : answer;
    onSubmit(challenge.id, answerToSubmit);
  };

  const renderInput = () => {
    // 3. DESABILITAR QUANDO ESTIVER SUBMETENDO OU COMPLETO
    const isDisabled = isSubmitting || !!challenge.completed;

    switch (challenge.type) {
      case "multiple-choice":
        return (
          <RadioGroup
            value={selectedOption}
            onValueChange={setSelectedOption}
            className="space-y-3"
            disabled={isDisabled} // 3. APLICAR DISABLED
          >
            {challenge.options?.map((option) => (
              <Label
                key={option.id}
                className={`flex items-center space-x-3 p-4 border rounded-md ${
                  isDisabled ? "opacity-70" : "has-[:checked]:border-primary"
                }`}
              >
                <RadioGroupItem value={option.id} />
                <span>{option.text}</span>
                {/* Mostra ícones de correção apenas se estiver completo */}
                {challenge.completed && challenge.correctOptionId === option.id && <Check className="h-5 w-5 text-green-500 ml-auto" />}
                {challenge.completed && challenge.userAnswer === option.id && challenge.correctOptionId !== option.id && <X className="h-5 w-5 text-red-500 ml-auto" />}
              </Label>
            ))}
          </RadioGroup>
        );
      case "code":
      case "essay":
        return (
          <Textarea
            placeholder={challenge.type === "code" ? "Escreva seu código aqui..." : "Escreva sua resposta aqui..."}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={8}
            className="font-mono"
            disabled={isDisabled} // 3. APLICAR DISABLED
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-3">
              <ChallengeIcon type={challenge.type} />
              {challenge.title}
            </CardTitle>
            <CardDescription className="mt-2">
              {challenge.description}
            </CardDescription>
          </div>
          <DifficultyBadge difficulty={challenge.difficulty} />
        </div>
      </CardHeader>
      <CardContent>
        {renderInput()}
      </CardContent>
      {/* 5. ADICIONAR GAP E EXIBIR O FEEDBACK */}
      <CardFooter className="flex-col items-stretch gap-4">
        
        {/* EXIBE O FEEDBACK DO AGENTE QUANDO ELE EXISTIR */}
        {challenge.feedback && (
          <Alert variant={challenge.isCorrect ? "default" : "destructive"}>
            {challenge.isCorrect ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {challenge.isCorrect ? "Resposta Correta" : "Resposta Incorreta"}
            </AlertTitle>
            <AlertDescription>
              {challenge.feedback}
            </AlertDescription>
          </Alert>
        )}

        {/* O botão só é renderizado se o desafio NÃO estiver completo */}
        {!challenge.completed && (
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting} // 3. APLICAR DISABLED
          >
            <Send className="h-4 w-4 mr-2" />
            {/* 4. MUDAR TEXTO DO BOTÃO */}
            {isSubmitting ? "Validando..." : "Enviar Resposta"}
          </Button>
        )}

      </CardFooter>
    </Card>
  );
}