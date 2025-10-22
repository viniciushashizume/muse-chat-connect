import { useState } from "react";
import { Challenge } from "@/types/challenge";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Code2, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock data - será substituído pela API RAG
const mockChallenges: Challenge[] = [
  {
    id: "1",
    title: "Conceitos básicos de React",
    description: "Qual hook do React é usado para gerenciar estado em componentes funcionais?",
    type: "multiple-choice",
    difficulty: "easy",
    options: [
      { id: "a", text: "useEffect" },
      { id: "b", text: "useState" },
      { id: "c", text: "useContext" },
      { id: "d", text: "useReducer" },
    ],
    correctOptionId: "b",
  },
  {
    id: "2",
    title: "Função de soma",
    description: "Escreva uma função que retorna a soma de dois números.",
    type: "code",
    difficulty: "easy",
    codeTemplate: "function soma(a, b) {\n  // Seu código aqui\n}",
    expectedOutput: "soma(2, 3) === 5",
  },
];

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>(mockChallenges);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState<"software" | "robotica">("software");
  const { toast } = useToast();

  // Função que será integrada com a API RAG para gerar novos desafios
  const generateNewChallenges = async () => {
    setIsLoading(true);
    
    // TODO: Integrar com API RAG
    // const response = await fetch(API_URL + '/generate-challenges', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ area: selectedArea }),
    // });
    // const newChallenges = await response.json();
    // setChallenges(newChallenges);
    
    // Simulação temporária
    setTimeout(() => {
      toast({
        title: "Novos desafios gerados!",
        description: `Desafios de ${selectedArea} serão gerados pela API RAG.`,
      });
      setIsLoading(false);
    }, 1000);
  };

  const handleSubmitAnswer = (challengeId: string, answer: string) => {
    // TODO: Integrar com API RAG para validar resposta
    // const response = await fetch(API_URL + '/validate-challenge', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ challengeId, answer }),
    // });
    // const validation = await response.json();
    
    // Validação temporária mock
    setChallenges((prev) =>
      prev.map((c) => {
        if (c.id === challengeId) {
          const isCorrect = c.type === "multiple-choice" 
            ? answer === c.correctOptionId
            : answer.includes("return a + b"); // Validação simples para código
          
          return { ...c, userAnswer: answer, isCorrect, completed: true };
        }
        return c;
      })
    );

    toast({
      title: "Resposta submetida!",
      description: "Validação com API RAG será implementada em breve.",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Desafios de Aprendizado
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerados automaticamente por IA
              </p>
            </div>
            <Button onClick={generateNewChallenges} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Gerar Novos Desafios
            </Button>
          </div>

          <Tabs value={selectedArea} onValueChange={(value) => setSelectedArea(value as "software" | "robotica")} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="software" className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Software
              </TabsTrigger>
              <TabsTrigger value="robotica" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Robótica
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="container py-8 px-4">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {challenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onSubmit={handleSubmitAnswer}
              />
            ))}
          </div>

          {challenges.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground mb-4">
                Nenhum desafio disponível. Clique em "Gerar Novos Desafios" para começar!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
