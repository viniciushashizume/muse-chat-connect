import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Trash2, Terminal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ExecutionResult {
  code: string;
  output: string;
  error?: string;
  timestamp: Date;
}

export default function IDE() {
  const { toast } = useToast();
  const [code, setCode] = useState<string>("# Escreva seu código Python aqui\nprint('Hello, World!')\n\n# Experimente usar input:\n# nome = input('Digite seu nome: ')\n# print(f'Olá, {nome}!')");
  const [output, setOutput] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [history, setHistory] = useState<ExecutionResult[]>([]);
  const pyodideRef = useRef<any>(null);
  
  // Estados para input
  /*const [showInputDialog, setShowInputDialog] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const [inputValue, setInputValue] = useState("");
  const inputResolveRef = useRef<((value: string) => void) | null>(null);*/
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [currentInputValue, setCurrentInputValue] = useState("");
  const inputResolveRef = useRef<((value: string) => void) | null>(null);
  // Inicializar Pyodide
  useEffect(() => {
    const loadPyodide = async () => {
      try {
        // @ts-ignore
        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
        });
        
        // Configurar stdout e stdin
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

  // Função para simular input() do Python
  const handleInput = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      // Adiciona o prompt (ex: "Digite seu nome: ") ao console
      setOutput(prev => prev + prompt);
      
      // Ativa o modo "esperando por input"
      setIsWaitingForInput(true);
      setCurrentInputValue(""); // Limpa o input anterior
      inputResolveRef.current = resolve;
    });
  };

const handleConsoleSubmit = (value: string) => {
  if (inputResolveRef.current) {
    // 1. Adiciona o valor que o usuário digitou ao console
    setOutput(prev => prev + value + "\n");
    
    // 2. Resolve a Promise do Python com o valor
    inputResolveRef.current(value);
    inputResolveRef.current = null;
    
    // 3. Desativa o modo "esperando por input"
    setIsWaitingForInput(false);
    setCurrentInputValue("");
  }
};

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

      // Interceptar chamadas de input()
      pyodide.globals.set("js_input", handleInput);
      
      // Configurar input customizado
    await pyodide.runPythonAsync(`
      import builtins
      import js
      
      async def custom_input(prompt=''):
          # O 'js_input' (nosso handleInput) já mostra o prompt
          result = await js_input(prompt)
          # O 'handleConsoleSubmit' já mostra o 'result' (eco)
          # Então não fazemos NENHUM print aqui.
          return result
      
      builtins.input = custom_input
    `);

      // Adicionar await automaticamente antes de input()
      const processedCode = code.replace(/(\s*)(\w+\s*=\s*)?input\(/g, '$1$2await input(');
      
      // Envolver o código do usuário em uma função assíncrona
      const wrappedCode = [
        'async def __user_code__():',
        ...processedCode.split('\n').map(line => '    ' + line),
        '',
        'await __user_code__()'
      ].join('\n');
      
      // Executar código do usuário
      await pyodide.runPythonAsync(wrappedCode);
      
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
      setHistory(prev => [executionResult, ...prev].slice(0, 10));

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

  const clearConsole = () => {
    setOutput("");
  };

  const clearHistory = () => {
    setHistory([]);
    toast({
      title: "Histórico limpo",
      description: "Todas as execuções anteriores foram removidas",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Python IDE</h1>
          <p className="text-muted-foreground mt-2">
            Execute código Python diretamente no navegador
          </p>
        </div>
        {isPyodideReady ? (
          <div className="flex items-center gap-2 text-green-600">
            <Terminal className="h-5 w-5" />
            <span className="font-medium">Python Pronto</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando Python...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Editor de Código</CardTitle>
            <CardDescription>Escreva seu código Python aqui</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <CodeMirror
                value={code}
                height="400px"
                theme={oneDark}
                extensions={[python()]}
                onChange={(value) => setCode(value)}
                className="text-base"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={executeCode}
                disabled={!isPyodideReady || isExecuting}
                className="flex-1"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Executar Código
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={clearConsole}>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Console
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Console */}
<Card>
  <CardHeader>
    <CardTitle>Console</CardTitle>
    <CardDescription>Saída da execução</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Altura foi diminuída para (ex) 360px para caber o input abaixo */}
    <ScrollArea className="h-[360px] w-full rounded-md border bg-black/90 p-4">
      <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
        {output || "Aguardando execução..."}
        {isWaitingForInput && (
          // Simula um cursor de terminal piscando
          <span className="animate-pulse">_</span>
        )}
      </pre>
    </ScrollArea>
    
    {/* Este é o novo "Input" que aparece no console
      quando o isWaitingForInput é true.
    */}
    <div className="mt-2">
      {isWaitingForInput ? (
        <Input
          value={currentInputValue}
          onChange={(e) => setCurrentInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleConsoleSubmit(e.currentTarget.value);
            }
          }}
          placeholder="Digite sua entrada e pressione Enter..."
          autoFocus
          className="bg-black/90 text-green-400 border-green-700 font-mono placeholder:text-gray-600"
        />
      ) : (
        // Um espaçador para manter o layout consistente
        <div className="h-[40px]" />
      )}
    </div>
  </CardContent>
</Card>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Histórico de Execuções</CardTitle>
            <CardDescription>Últimas 10 execuções de código</CardDescription>
          </div>
          {history.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearHistory}>
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Histórico
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma execução ainda. Execute um código para ver o histórico.
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {history.map((item, index) => (
                  <Card key={index} className={item.error ? "border-destructive" : ""}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          Execução #{history.length - index}
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Código:</p>
                        <div className="border rounded-md overflow-hidden">
                          <CodeMirror
                            value={item.code}
                            height="auto"
                            maxHeight="150px"
                            theme={oneDark}
                            extensions={[python()]}
                            editable={false}
                            basicSetup={{
                              lineNumbers: false,
                              foldGutter: false,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {item.error ? "Erro:" : "Saída:"}
                        </p>
                        <pre
                          className={`text-xs p-2 rounded-md border font-mono whitespace-pre-wrap ${
                            item.error
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted"
                          }`}
                        >
                          {item.error || item.output}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      
    </div>
  );
}
