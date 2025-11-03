import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Brain, Trophy, Zap } from "lucide-react";

export default function About() {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Sobre o Projeto
          </h1>
          <p className="text-sm text-muted-foreground">
            Conheça mais sobre nosso sistema de aprendizado inteligente
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="container py-8 px-4 max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                O que é este projeto?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Este é um sistema de aprendizado inteligente desenvolvido para o LabRiot, 
                que utiliza técnicas avançadas de Inteligência Artificial, especificamente 
                RAG (Retrieval-Augmented Generation), para proporcionar uma experiência 
                de aprendizado personalizada e eficiente.
              </p>
              <p className="text-muted-foreground">
                O sistema combina um assistente virtual inteligente com desafios práticos 
                gerados automaticamente, permitindo que estudantes aprendam tanto conceitos 
                de programação quanto aspectos específicos dos projetos desenvolvidos no laboratório.
              </p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Assistente RAG
                </CardTitle>
                <CardDescription>Aprendizado personalizado</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Um assistente virtual que utiliza documentação técnica e materiais 
                  de estudo para responder suas dúvidas de forma contextualizada e precisa. 
                  Pergunte sobre conceitos, sintaxe, boas práticas ou detalhes específicos 
                  dos projetos do LabRiot.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Desafios Inteligentes
                </CardTitle>
                <CardDescription>Prática com IA</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Desafios gerados automaticamente por IA, adaptados ao conteúdo que você 
                  está estudando. Escolha entre linguagens de programação (Python, JavaScript, C++) 
                  ou projetos específicos do LabRiot (Syna, Alimentador de Cachorros, etc.).
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                Como funciona?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Escolha sua área</h4>
                  <p className="text-sm text-muted-foreground">
                    Selecione se deseja aprender uma linguagem de programação ou explorar um projeto do LabRiot.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Converse com o assistente</h4>
                  <p className="text-sm text-muted-foreground">
                    Use o chat para tirar dúvidas e aprender conceitos. O assistente tem acesso a toda documentação relevante.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Pratique com desafios</h4>
                  <p className="text-sm text-muted-foreground">
                    Teste seus conhecimentos com desafios gerados automaticamente, incluindo questões de múltipla escolha e exercícios de código.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>Tecnologias Utilizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="text-sm">
                  <span className="font-semibold">Frontend:</span> React + TypeScript
                </div>
                <div className="text-sm">
                  <span className="font-semibold">IA:</span> RAG (Retrieval-Augmented Generation)
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Backend:</span> Python API
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Estilo:</span> TailwindCSS
                </div>
                <div className="text-sm">
                  <span className="font-semibold">LLM:</span> Modelos de Linguagem
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Documentos:</span> Vector Database
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
