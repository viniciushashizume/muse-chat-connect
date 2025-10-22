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
}

export function ChallengeCard({ challenge, onSubmit }: ChallengeCardProps) {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [codeAnswer, setCodeAnswer] = useState(challenge.codeTemplate || "");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const answer = challenge.type === "multiple-choice" ? selectedOption : codeAnswer;
    onSubmit(challenge.id, answer);
    setSubmitted(true);
  };

  const getDifficultyColor = () => {
    switch (challenge.difficulty) {
      case "easy": return "bg-green-500";
      case "medium": return "bg-yellow-500";
      case "hard": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

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
                <RadioGroupItem value={option.id} id={option.id} disabled={submitted} />
                <Label htmlFor={option.id} className="cursor-pointer">
                  {option.text}
                </Label>
                {submitted && option.id === challenge.correctOptionId && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {submitted && option.id === selectedOption && option.id !== challenge.correctOptionId && (
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
              value={codeAnswer}
              onChange={(e) => setCodeAnswer(e.target.value)}
              className="font-mono min-h-[200px]"
              placeholder="Digite seu código aqui..."
              disabled={submitted}
            />
            {challenge.expectedOutput && (
              <p className="text-sm text-muted-foreground">
                Output esperado: <code className="bg-muted px-1 py-0.5 rounded">{challenge.expectedOutput}</code>
              </p>
            )}
          </div>
        )}

        {submitted && challenge.isCorrect !== undefined && (
          <div className={`p-4 rounded-lg ${challenge.isCorrect ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700"}`}>
            {challenge.isCorrect ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>Correto! Parabéns!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                <span>Incorreto. Tente novamente!</span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={
            submitted ||
            (challenge.type === "multiple-choice" && !selectedOption) ||
            (challenge.type === "code" && !codeAnswer.trim())
          }
          className="w-full"
        >
          Submeter Resposta
        </Button>
      </CardFooter>
    </Card>
  );
}
