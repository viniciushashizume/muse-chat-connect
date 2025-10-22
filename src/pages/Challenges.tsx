// src/pages/Challenges.tsx
import { useState } from "react";
import { Challenge } from "@/types/challenge"; // Mantenha a definição do tipo
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Code2, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // useToast de hooks
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateChallenges } from "@/lib/api"; // Importe a função ajustada
import { Skeleton } from "@/components/ui/skeleton"; // Importe Skeleton para loading state


export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]); // Começa vazio
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState<"software" | "robotica">("software");
  const { toast } = useToast();

  const generateNewChallenges = async () => {
    setIsLoading(true);
    setChallenges([]); // Limpa desafios anteriores ao gerar novos

    try {
      // generateChallenges agora retorna a estrutura { challenge: Challenge } ou { challenge: ErrorChallenge }
      const response = await generateChallenges(selectedArea);
      const challengeResponse = response.challenge; // Pega o objeto dentro da resposta

      // Verifica se a resposta NÃO é um erro antes de tentar usá-la como desafio
      if (challengeResponse && typeof challengeResponse === 'object' && challengeResponse.type !== 'error') {
          // Como a API agora retorna um único objeto challenge, colocamos ele em um array
          setChallenges([challengeResponse as Challenge]); // Faz um type assertion aqui
           toast({
              title: "Novo desafio gerado!",
              description: `Desafio de ${selectedArea} carregado da API.`,
            });
      } else if (challengeResponse && challengeResponse.type === 'error') {
          // Se a API retornou um JSON de erro estruturado
           toast({
              title: challengeResponse.title || "Erro ao gerar desafio",
              description: challengeResponse.description || "Não foi possível gerar o desafio.",
              variant: "destructive",
            });
           setChallenges([]); // Garante que não haja desafios
      }
       else {
         // Caso inesperado (não deveria acontecer se o backend estiver correto)
         console.error("Resposta inesperada da API:", challengeResponse);
         toast({
            title: "Erro inesperado",
            description: "A API retornou um formato desconhecido.",
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
      setChallenges([]); // Garante que não haja desafios antigos em caso de erro
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = (challengeId: string, answer: string) => {
      // TODO: Integrar com API RAG para validar resposta
      // Por enquanto, apenas marca como completo e exibe mensagem
      console.log("Submit:", challengeId, answer); // Apenas para debug
       setChallenges((prev) =>
          prev.map((c) => {
            if (c.id === challengeId) {
              // Simula uma validação simples para UI - REMOVER QUANDO TIVER API DE VALIDAÇÃO
              const isCorrect = c.type === "multiple-choice"
                ? answer === c.correctOptionId
                : answer.includes("return"); // Validação muito básica para código

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
                {/* Mostra um ou dois skeletons dependendo do layout */}
                <Skeleton className="h-72 w-full rounded-lg" />
                <Skeleton className="h-72 w-full rounded-lg hidden lg:block" />
              </div>
           ) : challenges.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
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