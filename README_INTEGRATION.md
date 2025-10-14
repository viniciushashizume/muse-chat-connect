# Guia de Integração com API Python RAG

Este documento explica como conectar o front-end do chat com sua API Python que implementa RAG.

## 📋 Estrutura do Projeto

O front-end está organizado nos seguintes componentes:

```
src/
├── components/chat/
│   ├── ChatContainer.tsx      # Container principal do chat
│   ├── MessageBubble.tsx      # Componente de mensagem individual
│   ├── MessageInput.tsx       # Campo de entrada de mensagens
│   └── LoadingIndicator.tsx   # Indicador de carregamento
├── lib/
│   └── api.ts                 # Funções de integração com API
└── types/
    └── chat.ts                # Definições de tipos TypeScript
```

## 🔌 Pontos de Integração

### 1. Configuração da API URL

Crie um arquivo `.env` na raiz do projeto (baseado em `.env.example`):

```env
VITE_API_URL=http://localhost:8000
```

ou configure a URL da sua API em produção:

```env
VITE_API_URL=https://sua-api.com
```

### 2. Formato da API

O front-end espera que sua API Python tenha o seguinte endpoint:

**Endpoint:** `POST /api/chat`

**Request Body:**
```json
{
  "message": "mensagem do usuário aqui"
}
```

**Response Body:**
```json
{
  "response": "resposta do assistente aqui"
}
```

### 3. Exemplo de API Python (FastAPI)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Configure CORS para permitir requisições do front-end
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "https://seu-dominio.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@app.post("/api/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    # Aqui você implementa sua lógica RAG
    # Exemplo simplificado:
    user_message = request.message
    
    # Seu código RAG aqui
    # ...
    
    bot_response = process_rag_query(user_message)
    
    return ChatResponse(response=bot_response)

def process_rag_query(query: str) -> str:
    """
    Implementação da sua lógica RAG
    - Buscar documentos relevantes
    - Processar com LLM
    - Retornar resposta
    """
    # Sua implementação aqui
    pass
```

## 🚀 Ativando a Integração

### Passo 1: Remover Mock

No arquivo `src/components/chat/ChatContainer.tsx`, localize a seção marcada com `// TODO: API Integration Point` e:

1. **Descomente** o código de integração real (linhas ~47-62)
2. **Remova** o código de mock response (linhas ~64-72)

### Passo 2: Usar a função de API

Alternativamente, você pode usar a função auxiliar em `src/lib/api.ts`:

```typescript
import { sendChatMessage } from "@/lib/api";

// Dentro do handleSendMessage:
const assistantResponse = await sendChatMessage(messageContent);
const assistantMessage: Message = {
  id: (Date.now() + 1).toString(),
  content: assistantResponse,
  role: "assistant",
  timestamp: new Date(),
};
setMessages((prev) => [...prev, assistantMessage]);
```

## 🧪 Testando a Integração

### Teste Local

1. Inicie sua API Python:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

2. Inicie o front-end:
   ```bash
   npm run dev
   ```

3. Acesse `http://localhost:8080` e teste o chat

### Verificar CORS

Se encontrar erros de CORS, certifique-se de que sua API Python permite requisições do domínio do front-end.

## 📝 Suporte a Markdown

O front-end já suporta markdown nas respostas do assistente, incluindo:
- **Negrito**, *itálico*
- Listas
- Links
- Blocos de código com syntax highlighting
- Tabelas
- E mais...

Basta retornar a resposta formatada em markdown da sua API.

## 🔧 Tratamento de Erros

O front-end já inclui tratamento de erros básico. Mensagens de erro da API são exibidas ao usuário de forma amigável.

Para melhorar a experiência, sua API pode retornar erros estruturados:

```python
from fastapi import HTTPException

@app.post("/api/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        response = process_rag_query(request.message)
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## 📚 Recursos Adicionais

- **react-markdown**: Usado para renderizar markdown
- **remark-gfm**: Plugin para suportar GitHub Flavored Markdown
- **TailwindCSS**: Sistema de design totalmente configurado
- **TypeScript**: Type safety completo

## 🎨 Customização

Todos os estilos estão centralizados no design system:
- `src/index.css` - Variáveis de cores e animações
- `tailwind.config.ts` - Configuração do Tailwind

Para personalizar cores, gradientes ou animações, edite estes arquivos.

## 📞 Suporte

Se encontrar problemas na integração, verifique:
1. URL da API está correta no `.env`
2. CORS está configurado corretamente
3. API está respondendo no formato esperado
4. Console do navegador para erros detalhados
