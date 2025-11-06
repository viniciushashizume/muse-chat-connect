# Agente LABRIOT: Aplicativo de Chat RAG

Este repositório contém um aplicativo de chat completo, projetado para responder a perguntas sobre documentos específicos. Ele apresenta um frontend React/Vite e um backend Python/FastAPI que utiliza a Geração Aumentada por Recuperação (RAG) com o modelo Gemini do Google.

A API do backend indexa documentos PDF locais e os utiliza como base de conhecimento para fornecer respostas contextuais às consultas dos usuários e gerar desafios com base em áreas de aprendizado.

## Pilha de Tecnologias

### Frontend
* **Framework:** [React](https://react.dev/)
* **Ferramenta de Build:** [Vite](https://vitejs.dev/)
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
* **Interface do Usuário:** [shadcn/ui](https://ui.shadcn.com/)
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
* **Roteamento:** [React Router](https://reactrouter.com/)

### Backend (RAG API)
* **Framework:** [FastAPI](https://fastapi.tiangolo.com/)
* **Servidor:** [Uvicorn](https://www.uvicorn.org/)
* **Orquestração:** [LangChain](https://www.langchain.com/)
* **LLM:** [Google Gemini (via `langchain-google-genai`)](https://python.langchain.com/docs/integrations/chat/google_generative_ai)
* **Embeddings:** [Sentence-Transformers (`all-MiniLM-L6-v2`)](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
* **Vector Store:** [FAISS (faiss-cpu)](https://faiss.ai/)
* **Document Loading:** [PyPDFLoader](https://python.langchain.com/docs/integrations/document_loaders/pdf)

## Pré-requisitos

Antes de começar, certifique-se de ter o seguinte instalado:
* [Node.js](https://nodejs.org/) (versão 18 ou posterior recomendada) e npm
* [Python](https://www.python.org/) (versão 3.9 ou posterior recomendada) e pip
* Uma **Chave da API do Google** para o modelo Gemini. Você pode obter uma no [Google AI Studio](https://aistudio.google.com/app/apikey).

## Como executar

Este projeto consiste em duas partes: a **API de backend** e o **Aplicativo de frontend**. Você precisará executá-los em dois terminais separados.

### 1. Configuração do backend (API RAG)

Primeiro, configure e execute o backend em Python.

1. **Navegue até o diretório da API:**

``sh

cd rag-api

```

2. **Crie um ambiente virtual** (recomendado):

``sh

python -m venv venv

source venv/bin/activate # No Windows, use: venv\Scripts\activate

```

3. **Instale as dependências do Python:**

``sh

pip install -r requirements.txt

```

4. **Adicione seus documentos:**

A API está configurada para carregar PDFs específicos. Certifique-se de que os seguintes arquivos estejam presentes no diretório `rag-api/`:

* `Documentação Syna.pdf`

* `Python do ZERO à Programação Orientada a Objetos (Fernando Belomé Feltrin).pdf`

5. **Crie um arquivo de ambiente:**

Crie um arquivo chamado `.env` no diretório `rag-api/`. Você precisará adicionar sua chave da API do Google aqui.

``
# rag-api/.env

GOOGLE_API_KEY="SUA_CHAVE_DA_API_DO_GOOGLE_AQUI"

``

*Observação: o aplicativo usa o `dotenv` para carregar esta chave.*

6. **Execute o servidor da API:**

``sh

uvicorn main:app --reload --port 8000

``
A API será iniciada, carregará os documentos PDF, criará o armazenamento vetorial e estará disponível em `http://localhost:8000`.

Para o agente de criação de desafios, execute:

``sh

uvicorn challenge_agent:app --reload --port 8001

``

Para o agente de validação de respostas, execute:

``sh

uvicorn validation_agent:app --reload --port 8002

``

### 2. Configuração do Frontend

Em um **novo terminal**, configure e execute o frontend React.

1. **Navegue até o diretório raiz do projeto** (se você estiver em `rag-api`, volte):

``sh

cd ..

```

2. **Instale as dependências do Node.js:**

``sh

npm i

```

3. **Crie um arquivo de ambiente:**

Crie um arquivo chamado `.env` no diretório raiz. Isso informa ao frontend onde encontrar a API.

```

# /.env

VITE_API_URL=http://localhost:8000
```

4. **Execute o servidor de desenvolvimento:**

```sh

npm run dev

```
O aplicativo React será iniciado e estará acessível no seu navegador (geralmente em `http://localhost:5173`).

Agora você pode interagir com a interface de chat, que enviará solicitações para a sua API RAG local.

Este projeto ainda está em desenvolvimento.
