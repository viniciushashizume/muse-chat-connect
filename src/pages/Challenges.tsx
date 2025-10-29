// src/pages/Challenges.tsx
import { useState } from "react";
import { Challenge } from "@/types/challenge";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Code2, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateChallenges } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";


export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState<"software" | "robotica">("software");
  const { toast } = useToast();

  const generateNewChallenges = async () => {
    setIsLoading(true);
    setChallenges([]); // Limpa desafios anteriores

    try {
      // --- ALTERAÇÃO: A API agora retorna { challenges: [...] } ---
      const response = await generateChallenges(selectedArea);
      const challengeList = response.challenges; // Pega o ARRAY

      // Verifica se a resposta é um array e não está vazio
      if (challengeList && Array.isArray(challengeList) && challengeList.length > 0) {
        
        // Verifica se o PRIMEIRO item é um erro (como definido no prompt)
        if (challengeList[0].type === 'error') {
           toast({
              title: challengeList[0].title || "Erro ao gerar desafio",
              description: challengeList[0].description || "Não foi possível gerar o desafio.",
              variant: "destructive",
            });
           setChallenges([]); // Garante que não haja desafios
        } else {
          // --- ALTERAÇÃO: Define o array inteiro de desafios ---
          setChallenges(challengeList as Challenge[]);
          toast({
            title: `${challengeList.length} novos desafios gerados!`,
            description: `Desafios de ${selectedArea} carregados da API.`,
          });
        }
      } else {
         // Caso a API retorne um array vazio ou formato inesperado
         console.error("Resposta inesperada da API (esperava um array):", response);
         toast({
            title: "Erro inesperado",
            description: "A API retornou um formato desconhecido ou vazio.",
            variant: "destructive",
          });
         setChallenges([]);
      }

    } catch (error) {
      console.error("Falha ao gerar desafios:", error);
      toast({
        title: "Erro ao gerar desafios",
        description: "Não foi possível conectar à API ou ocorreu um erro no servidor.",
        variant: "destructive",
      });
      setChallenges([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = (challengeId: string, answer: string) => {
      // TODO: Integrar com API RAG para validar resposta
      console.log("Submit:", challengeId, answer);
       setChallenges((prev) =>
          prev.map((c) => {
            if (c.id === challengeId) {
              const isCorrect = c.type === "multiple-choice"
                ? answer === c.correctOptionId
                : c.type === "code" ? answer.includes("return") : true; // Validação básica

              // Para 'essay', apenas marca como completo
              const feedbackCorrect = (c.type === 'essay' && c.completed) ? false : isCorrect;

              return { ...c, userAnswer: answer, isCorrect: feedbackCorrect, completed: true };
            }
            return c;
          })
        );
      toast({
        title: "Resposta submetida!",
        description: c.type === 'essay' ? "Resposta registrada." : "Validação com API RAG será implementada.",
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
                Gerados automaticamente por IA com base nos documentos
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
          {isLoading ? (
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {/* --- ALTERAÇÃO: Mostra 3 Skeletons --- */}
                <Skeleton className="h-72 w-full rounded-lg" />
                <Skeleton className="h-72 w-full rounded-lg" />
                <Skeleton className="h-72 w-full rounded-lg" />
              </div>
           ) : challenges.length > 0 ? (
              // --- ALTERAÇÃO: Layout da grade ajustado para 3 colunas em telas grandes ---
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                {challenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    onSubmit={handleSubmitAnswer}
                  />
                ))}
              </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground mb-4">
                Nenhum desafio disponível para "{selectedArea}". Clique em "Gerar Novos Desafios" para começar!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}