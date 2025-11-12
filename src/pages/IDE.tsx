import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Trash2, Loader2, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExecutionResult {
  code: string;
  output: string;
  error?: string;
  timestamp: Date;
}

export default function IDE() {
  const { toast } = useToast();
  const [code, setCode] = useState<string>("# Escreva seu código Python aqui\nprint('Hello, World!')");
  const [output, setOutput] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [history, setHistory] = useState<ExecutionResult[]>([]);
  const pyodideRef = useRef<any>(null);

  // Inicializar Pyodide
  useEffect(() => {
    const loadPyodide = async () => {
      try {
        // @ts-ignore
        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
        });
        
        // Redirecionar stdout para capturar prints
        await pyodide.runPythonAsync(`
          import sys
          from io import StringIO
          sys.stdout = StringIO()
        `);
        
        pyodideRef.current = pyodide;
        setIsPyodideReady(true);
        
        toast({
          title: "Python pronto!",
          description: "Ambiente Python carregado e pronto para uso",
        });
      } catch (error) {
        toast({
          title: "Erro ao carregar Python",
          description: error instanceof Error ? error.message : "Não foi possível carregar o ambiente Python",
          variant: "destructive",
        });
      }
    };

    loadPyodide();
  }, [toast]);

  // Executar código Python
  const executeCode = async () => {
    if (!isPyodideReady || !pyodideRef.current || !code.trim()) return;

    setIsExecuting(true);
    setOutput("");

    try {
      const pyodide = pyodideRef.current;
      
      // Limpar stdout anterior
      await pyodide.runPythonAsync(`
        sys.stdout = StringIO()
      `);

      // Executar código do usuário
      await pyodide.runPythonAsync(code);
      
      // Capturar output
      const stdout = await pyodide.runPythonAsync(`
        sys.stdout.getvalue()
      `);

      const result = stdout || "Código executado com sucesso (sem output)";
      setOutput(result);

      // Adicionar ao histórico
      const executionResult: ExecutionResult = {
        code,
        output: result,
        timestamp: new Date(),
      };
      setHistory(prev => [executionResult, ...prev].slice(0, 10)); // Manter últimas 10 execuções

      toast({
        title: "Executado com sucesso",
        description: "Código Python executado",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      setOutput(`Erro: ${errorMessage}`);
      
      const executionResult: ExecutionResult = {
        code,
        output: "",
        error: errorMessage,
        timestamp: new Date(),
      };
      setHistory(prev => [executionResult, ...prev].slice(0, 10));

      toast({
        title: "Erro de execução",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Limpar console
  const clearConsole = () => {
    setOutput("");
  };

  // Limpar histórico
  const clearHistory = () => {
    setHistory([]);
    toast({
      title: "Histórico limpo",
      description: "Todo o histórico de execuções foi removido",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">IDE Python</h1>
          <p className="text-muted-foreground">
            Execute código Python diretamente no navegador
          </p>
        </div>
        {isPyodideReady && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Python pronto
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Editor</CardTitle>
            <CardDescription>
              Escreva seu código Python aqui
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="# Escreva seu código Python aqui"
              className="font-mono min-h-[400px] text-sm"
              disabled={!isPyodideReady}
            />
            
            <div className="flex gap-2">
              <Button 
                onClick={executeCode} 
                disabled={isExecuting || !isPyodideReady || !code.trim()}
                className="flex-1"
              >
                {isExecuting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Executar
              </Button>
              
              <Button 
                onClick={clearConsole} 
                variant="outline"
              >
                Limpar Console
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Console */}
        <Card>
          <CardHeader>
            <CardTitle>Console</CardTitle>
            <CardDescription>
              Saída da execução do código
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[460px]">
              <pre className="bg-muted p-4 rounded-md text-sm font-mono whitespace-pre-wrap">
                {output || "Aguardando execução..."}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Histórico de Execuções</CardTitle>
                <CardDescription>
                  Últimas {history.length} execuções
                </CardDescription>
              </div>
              <Button 
                onClick={clearHistory} 
                variant="outline"
                size="sm"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {history.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Terminal className="h-3 w-3" />
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                      {result.error && (
                        <span className="text-destructive text-xs">Erro</span>
                      )}
                    </div>
                    
                    <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                      {result.code}
                    </pre>
                    
                    <div className="bg-background border rounded p-2">
                      <p className="text-xs text-muted-foreground mb-1">Saída:</p>
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {result.error ? `Erro: ${result.error}` : result.output}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
