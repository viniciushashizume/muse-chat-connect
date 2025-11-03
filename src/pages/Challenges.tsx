// src/pages/Challenges.tsx
import { useState, useEffect } from "react";
import { Challenge } from "@/types/challenge";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { Button } from "@/components/ui/button";
// 1. IMPORTAR ÍCONES DE NAVEGAÇÃO
import { RefreshCw, Code2, Bot, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateChallenges } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState<"software" | "robotica">("software");
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    setChallenges([]);
    setCurrentChallengeIndex(0);
  }, [selectedArea]);

  const generateNewChallenges = async () => {
    setIsLoading(true);
    setChallenges([]);
    setCurrentChallengeIndex(0);

    try {
      const response = await generateChallenges(selectedArea);
      const challengeList = response.challenges;

      if (challengeList && Array.isArray(challengeList) && challengeList.length > 0) {
        if (challengeList[0].type === 'error') {
          toast({
            title: challengeList[0].title || "Erro ao gerar desafio",
            description: challengeList[0].description || "Não foi possível gerar o desafio.",
            variant: "destructive",
          });
          setChallenges([]);
        } else {
          setChallenges(challengeList as Challenge[]);
          toast({
            title: `${challengeList.length} novos desafios gerados!`,
            description: `Desafios de ${selectedArea} carregados da API.`,
          });
        }
      } else {
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
    const currentChallenge = challenges[currentChallengeIndex];
    if (!currentChallenge || currentChallenge.id !== challengeId) return;

    const isCorrect = (() => {
      if (currentChallenge.type === "multiple-choice") {
        return answer === currentChallenge.correctOptionId;
      }
      if (currentChallenge.type === "code") {
        return answer.includes(currentChallenge.expectedOutput || "return");
      }
      if (currentChallenge.type === "essay") {
        return true;
      }
      return false;
    })();

    setChallenges((prev) =>
      prev.map((c, index) => {
        if (index === currentChallengeIndex) {
          return {
            ...c,
            userAnswer: answer,
            isCorrect: isCorrect,
            completed: isCorrect // Só marca como 'completed' se a resposta for correta
          };
        }
        return c;
      })
    );

    toast({
      title: isCorrect ? "Resposta Correta!" : "Resposta Incorreta.",
      // 2. MENSAGEM DO TOAST ATUALIZADA
      description: isCorrect
        ? "Bom trabalho! Use os botões de navegação para continuar."
        : "Tente novamente. A resposta não está correta.",
      variant: isCorrect ? "default" : "destructive",
    });

    // 3. AVANÇO AUTOMÁTICO REMOVIDO
    // O setTimeout e o setCurrentChallengeIndex foram removidos daqui
  };

  // 4. NOVAS FUNÇÕES DE NAVEGAÇÃO
  const goToPreviousChallenge = () => {
    setCurrentChallengeIndex((prevIndex) => Math.max(0, prevIndex - 1));
  };

  const goToNextChallenge = () => {
    // Avança para o próximo, sem ultrapassar o tamanho do array
    setCurrentChallengeIndex((prevIndex) => Math.min(challenges.length, prevIndex + 1));
  };
  
  // Variável auxiliar para saber se estamos no último desafio
  const isLastChallenge = currentChallengeIndex === challenges.length - 1;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        {/* ... (Header sem alteração) ... */}
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
          <Tabs
            value={selectedArea}
            onValueChange={(value) => setSelectedArea(value as "software" | "robotica")}
            className="w-full"
          >
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
            <div className="flex justify-center">
              <Skeleton className="h-80 w-full max-w-2xl rounded-lg" />
            </div>
          ) : challenges.length > 0 && currentChallengeIndex < challenges.length ? (
            // 5. WRAPPER PARA CENTRALIZAR O CARD E OS BOTÕES
            <div className="max-w-2xl mx-auto">
              <ChallengeCard
                key={challenges[currentChallengeIndex].id}
                challenge={challenges[currentChallengeIndex]}
                onSubmit={handleSubmitAnswer}
              />
              
              {/* 6. BOTÕES DE NAVEGAÇÃO */}
              <div className="flex justify-between mt-6">
                <Button 
                  onClick={goToPreviousChallenge} 
                  disabled={currentChallengeIndex === 0}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Anterior
                </Button>
                
                <Button 
                  onClick={goToNextChallenge}
                  // Opcional: Se quiser FORÇAR o acerto antes de avançar, descomente a linha abaixo
                  // disabled={!challenges[currentChallengeIndex]?.completed}
                  variant="default"
                >
                  {isLastChallenge ? 'Finalizar' : 'Próximo'}
                  {isLastChallenge ? <CheckCircle2 className="h-4 w-4 ml-2" /> : <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </div>
          ) : challenges.length > 0 && currentChallengeIndex >= challenges.length ? (
            // (B) FIM DOS DESAFIOS: Mostra mensagem de conclusão
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-xl font-semibold mb-4">Parabéns!</p>
              <p className="text-muted-foreground mb-4">
                Você completou todos os desafios de "{selectedArea}".
              </p>
              <Button onClick={generateNewChallenges} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Gerar Novos Desafios
              </Button>
            </div>
          ) : (
            // (C) ESTADO INICIAL: Mensagem para gerar desafios
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