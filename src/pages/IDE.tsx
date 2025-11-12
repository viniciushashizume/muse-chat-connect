import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Plus, Trash2, FileCode, Terminal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Cell {
  index: number;
  type: "code" | "markdown";
  source: string;
  output?: string[];
  execution_count?: number;
}

interface Notebook {
  name: string;
  path: string;
  cells: Cell[];
  kernel_id?: string;
}

export default function IDE() {
  const { toast } = useToast();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [currentCell, setCurrentCell] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [mcpServerUrl, setMcpServerUrl] = useState("http://localhost:3001");
  const [notebookPath, setNotebookPath] = useState("python_workspace.ipynb");

  // Conectar ao Jupyter MCP Server
  const connectToJupyter = async () => {
    try {
      const response = await fetch(`${mcpServerUrl}/mcp/tools/use_notebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebook_name: "workspace",
          notebook_path: notebookPath,
          mode: "create"
        })
      });

      if (!response.ok) throw new Error("Falha ao conectar com o servidor Jupyter");

      const data = await response.json();
      setIsConnected(true);
      setNotebook({
        name: "workspace",
        path: notebookPath,
        cells: [],
        kernel_id: data.kernel_id
      });

      toast({
        title: "Conectado ao Jupyter",
        description: "Ambiente Python pronto para uso",
      });

      await loadNotebook();
    } catch (error) {
      toast({
        title: "Erro de conexão",
        description: error instanceof Error ? error.message : "Não foi possível conectar ao servidor Jupyter MCP",
        variant: "destructive",
      });
    }
  };

  // Carregar notebook
  const loadNotebook = async () => {
    if (!notebook) return;

    try {
      const response = await fetch(`${mcpServerUrl}/mcp/tools/read_notebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebook_name: notebook.name,
          response_format: "detailed",
          limit: 0
        })
      });

      if (!response.ok) throw new Error("Falha ao carregar notebook");

      const data = await response.json();
      
      if (data.cells) {
        setNotebook(prev => prev ? { ...prev, cells: data.cells } : null);
      }
    } catch (error) {
      console.error("Erro ao carregar notebook:", error);
    }
  };

  // Adicionar nova célula
  const addCell = async () => {
    if (!notebook || !currentCell.trim()) return;

    setIsExecuting(true);
    try {
      const response = await fetch(`${mcpServerUrl}/mcp/tools/insert_cell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cell_index: -1,
          cell_type: "code",
          cell_source: currentCell
        })
      });

      if (!response.ok) throw new Error("Falha ao adicionar célula");

      setCurrentCell("");
      await loadNotebook();

      toast({
        title: "Célula adicionada",
        description: "Código adicionado ao notebook",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível adicionar célula",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Executar célula
  const executeCell = async (cellIndex: number) => {
    if (!notebook) return;

    setIsExecuting(true);
    try {
      const response = await fetch(`${mcpServerUrl}/mcp/tools/execute_cell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cell_index: cellIndex,
          timeout: 90
        })
      });

      if (!response.ok) throw new Error("Falha ao executar célula");

      const data = await response.json();
      
      // Atualizar saída da célula
      setNotebook(prev => {
        if (!prev) return null;
        const updatedCells = [...prev.cells];
        updatedCells[cellIndex] = {
          ...updatedCells[cellIndex],
          output: data.outputs || []
        };
        return { ...prev, cells: updatedCells };
      });

      toast({
        title: "Célula executada",
        description: "Código executado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro de execução",
        description: error instanceof Error ? error.message : "Não foi possível executar a célula",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Executar código diretamente (sem salvar no notebook)
  const executeCode = async () => {
    if (!notebook || !currentCell.trim()) return;

    setIsExecuting(true);
    try {
      const response = await fetch(`${mcpServerUrl}/mcp/tools/execute_code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: currentCell,
          timeout: 30
        })
      });

      if (!response.ok) throw new Error("Falha ao executar código");

      const data = await response.json();

      toast({
        title: "Código executado",
        description: "Resultado: " + (data.outputs?.[0] || "Executado com sucesso"),
      });

      setCurrentCell("");
    } catch (error) {
      toast({
        title: "Erro de execução",
        description: error instanceof Error ? error.message : "Não foi possível executar o código",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Deletar célula
  const deleteCell = async (cellIndex: number) => {
    if (!notebook) return;

    try {
      const response = await fetch(`${mcpServerUrl}/mcp/tools/delete_cell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cell_indices: [cellIndex],
          include_source: false
        })
      });

      if (!response.ok) throw new Error("Falha ao deletar célula");

      await loadNotebook();

      toast({
        title: "Célula removida",
        description: "Código removido do notebook",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível deletar a célula",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">IDE Python</h1>
          <p className="text-muted-foreground">
            Ambiente integrado com Jupyter Notebook via MCP
          </p>
        </div>
        {!isConnected && (
          <Button onClick={connectToJupyter} size="lg">
            <Terminal className="mr-2 h-4 w-4" />
            Conectar ao Jupyter
          </Button>
        )}
      </div>

      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Servidor</CardTitle>
            <CardDescription>
              Configure a conexão com o Jupyter MCP Server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Instruções de configuração:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Instale o Jupyter MCP Server: <code className="text-sm bg-muted px-1 py-0.5 rounded">pip install jupyter-mcp-server</code></li>
                  <li>Inicie o servidor: <code className="text-sm bg-muted px-1 py-0.5 rounded">jupyter-mcp-server --port 3001</code></li>
                  <li>Clique em "Conectar ao Jupyter" acima</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">URL do Servidor MCP</label>
              <input
                type="text"
                value={mcpServerUrl}
                onChange={(e) => setMcpServerUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
                placeholder="http://localhost:3001"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Notebook</label>
              <input
                type="text"
                value={notebookPath}
                onChange={(e) => setNotebookPath(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
                placeholder="python_workspace.ipynb"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor">
                <FileCode className="mr-2 h-4 w-4" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="notebook">
                <Terminal className="mr-2 h-4 w-4" />
                Notebook
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Editor de Código</CardTitle>
                  <CardDescription>
                    Escreva e execute código Python
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={currentCell}
                    onChange={(e) => setCurrentCell(e.target.value)}
                    placeholder="# Escreva seu código Python aqui&#10;print('Hello, World!')"
                    className="font-mono min-h-[300px]"
                  />
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={executeCode} 
                      disabled={isExecuting || !currentCell.trim()}
                      className="flex-1"
                    >
                      {isExecuting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Executar Rápido
                    </Button>
                    
                    <Button 
                      onClick={addCell} 
                      disabled={isExecuting || !currentCell.trim()}
                      variant="outline"
                      className="flex-1"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar ao Notebook
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notebook" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Células do Notebook</CardTitle>
                  <CardDescription>
                    Visualize e gerencie as células do notebook
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    {notebook?.cells && notebook.cells.length > 0 ? (
                      <div className="space-y-4">
                        {notebook.cells.map((cell, index) => (
                          <Card key={index}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                  Célula {index + 1} {cell.execution_count && `[${cell.execution_count}]`}
                                </span>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => executeCell(index)}
                                    disabled={isExecuting}
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteCell(index)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <pre className="bg-muted p-3 rounded-md overflow-x-auto text-sm">
                                <code>{cell.source}</code>
                              </pre>
                              
                              {cell.output && cell.output.length > 0 && (
                                <div className="bg-background border rounded-md p-3">
                                  <p className="text-xs text-muted-foreground mb-2">Saída:</p>
                                  <pre className="text-sm overflow-x-auto">
                                    {cell.output.join('\n')}
                                  </pre>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileCode className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>Nenhuma célula no notebook</p>
                        <p className="text-sm">Use o editor para adicionar código</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
