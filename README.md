Agente LABRIOT: Aplicação de Chat RAG

Este repositório contém uma aplicação de chat completa projetada para responder a perguntas sobre documentos específicos. Ele apresenta um frontend React/Vite e um backend Python/FastAPI que utiliza Geração Aumentada por Recuperação (RAG) com o modelo Gemini do Google.

A API de backend indexa documentos PDF locais e os usa como base de conhecimento para fornecer respostas contextuais às consultas dos usuários e gerar desafios com base em áreas de aprendizado.

🛠️ Pilha Tecnológica

Frontend

    Estrutura (Framework): React

    Ferramenta de Compilação (Build Tool): Vite

    Linguagem: TypeScript

    Interface do Usuário (UI): shadcn/ui

    Estilização (Styling): Tailwind CSS

    Roteamento (Routing): React Router

Backend (API RAG)

    Estrutura (Framework): FastAPI

    Servidor: Uvicorn

    Orquestração: LangChain

    LLM (Modelo de Linguagem Grande): Google Gemini (via langchain-google-genai)

    Embeddings: Sentence-Transformers (all-MiniLM-L6-v2)

    Armazenamento Vetorial (Vector Store): FAISS (faiss-cpu)

    Carregamento de Documentos (Document Loading): PyPDFLoader

Pré-requisitos

Antes de começar, certifique-se de ter o seguinte instalado:

    Node.js (v18 ou posterior recomendado) e npm

    Python (v3.9 ou posterior recomendado) e pip

    Uma Chave de API do Google para o modelo Gemini. Você pode obter uma no Google AI Studio.

Como Executar

Este projeto é composto por duas partes: a API de Backend e a Aplicação Frontend. Você precisará executá-las em dois terminais separados.

1. Configuração do Backend (API RAG)

Primeiro, configure e execute o backend Python.

    Navegue até o diretório da API:
    Bash

cd rag-api

Crie um ambiente virtual (recomendado):
Bash

python -m venv venv
source venv/bin/activate  # No Windows, use: venv\Scripts\activate

Instale as dependências Python:
Bash

pip install -r requirements.txt

Adicione seus documentos: A API está configurada para carregar PDFs específicos. Certifique-se de que os seguintes arquivos estejam presentes no diretório rag-api/:

    Documentação Syna.pdf

    Python do ZERO à Programação Orientada a Objetos (Fernando Belomé Feltrin).pdf

Crie um arquivo de ambiente: Crie um arquivo chamado .env no diretório rag-api/. Você precisará adicionar sua chave de API do Google aqui.

# rag-api/.env
GOOGLE_API_KEY="SUA_CHAVE_API_GOOGLE_AQUI"

Nota: A aplicação usa dotenv para carregar esta chave.

Execute o servidor da API:
Bash

uvicorn main:app --reload --port 8000

A API será iniciada, carregará os documentos PDF, criará o armazenamento vetorial e estará disponível em http://localhost:8000.

Para o agente de criação de desafios, execute:
Bash

uvicorn challenge_agent:app --reload --port 8001

Para o agente de validação de respostas, execute:
Bash

    uvicorn validation_agent:app --reload --port 8002

2. Configuração do Frontend

Em um novo terminal, configure e execute o frontend React.

    Navegue para o diretório raiz do projeto (se você estiver em rag-api, volte):
    Bash

cd ..

Instale as dependências do Node.js:
Bash

npm i

Crie um arquivo de ambiente: Crie um arquivo chamado .env no diretório raiz. Isso informa ao frontend onde encontrar a API.

# /.env
VITE_API_URL=http://localhost:8000

Execute o servidor de desenvolvimento:
Bash

    npm run dev

    A aplicação React será iniciada e estará acessível no seu navegador (geralmente em http://localhost:5173).

Agora você pode interagir com a interface de chat, que enviará solicitações para sua API RAG local.

Este projeto ainda está em desenvolvimento.
