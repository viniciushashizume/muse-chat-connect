# Nome sugerido para este arquivo: challenge_agent.py

import os
import requests
import json # Importe json
from io import BytesIO
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any # Importe Any

# Importações do LangChain
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser

# Carregue sua chave de API a partir de um arquivo .env (recomendado)
from dotenv import load_dotenv
load_dotenv()

# --- CONFIGURAÇÃO INICIAL E CARREGAMENTO DO MODELO ---
model_name = "sentence-transformers/all-MiniLM-L6-v2"
model_kwargs = {'device': 'cpu'}
encode_kwargs = {'normalize_embeddings': False}

try:
    embeddings = HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
    )
except Exception as e:
    print(f"Erro ao carregar o modelo de embedding: {e}")
    exit()

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.5)

# --- Lógica de carregamento de múltiplos documentos ---
lista_de_documentos_pdf = [
    "Documentação Syna.pdf",
    "Python do ZERO à Programação Orientada a Objetos (Fernando Belomé Feltrin).pdf"
]
documentos_totais = []
print("Iniciando o carregamento dos documentos locais (Agente de Desafios)...")
for caminho_do_pdf in lista_de_documentos_pdf:
    try:
        if not os.path.exists(caminho_do_pdf):
            print(f"Erro: Arquivo não encontrado no caminho: {caminho_do_pdf}")
            print(f"Pulando o arquivo '{caminho_do_pdf}'...")
            continue
        loader = PyPDFLoader(caminho_do_pdf)
        paginas = loader.load()
        documentos_totais.extend(paginas)
        print(f"Documento '{caminho_do_pdf}' carregado com sucesso ({len(paginas)} páginas).")
    except Exception as e:
        print(f"Erro ao processar o PDF '{caminho_do_pdf}': {e}")
        print(f"Pulando o arquivo '{caminho_do_pdf}'...")
print(f"\nCarregamento concluído. Total de páginas de todos os documentos: {len(documentos_totais)}")

# --- Dividir os documentos e criar o Vector DB ---
vector_db = None
if documentos_totais:
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks = text_splitter.split_documents(documentos_totais)
    print(f"Criando Vector DB com {len(chunks)} chunks de {len(lista_de_documentos_pdf)} documento(s)...")
    vector_db = FAISS.from_documents(chunks, embeddings)
    retriever = vector_db.as_retriever(search_kwargs={"k": 5})
    print("Vector DB criado com sucesso!")
else:
    print("Nenhum documento foi carregado. A API não pode iniciar o RAG.")
    retriever = None

# --- DEFINIÇÃO DA API COM FASTAPI ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class ChallengeResponse(BaseModel):
    challenge: Any

# --- ALTERAÇÃO: Prompt Template com chaves escapadas no JSON ---
prompt_template_desafio = ChatPromptTemplate.from_template("""
    Você é um "Mestre de Desafios" e sua especialidade é criar desafios e perguntas complexas com base em documentações técnicas, formatando a saída como JSON.
    Sua missão é forçar o usuário a pensar criticamente sobre o conteúdo da documentação fornecida e retornar o desafio em um formato JSON específico.

    Baseado no CONTEXTO abaixo (extraído da documentação), crie UM DESAFIO ou PERGUNTA sobre o TÓPICO fornecido pelo usuário.

    REGRAS:
    1.  **Base no Contexto:** O desafio DEVE ser 100% baseado nas informações do contexto.
    2.  **Foco no Tópico:** O desafio deve ser relevante ao TÓPICO que o usuário pediu (representado pela "PERGUNTA DO USUÁRIO").
    3.  **Formato do Desafio:** Seja criativo (múltipla escolha, cenário, pergunta direta, mini-tarefa).
    4.  **Não dê a Resposta:** Exceto se for múltipla escolha (inclua as opções).
    5.  **Se o Tópico Não Estiver no Contexto:** Retorne um JSON com uma mensagem de erro no campo 'description'. Ex: {{"id": "error", "title": "Erro", "description": "Não foi possível criar um desafio sobre '{question}' com a documentação atual.", "type": "error", "difficulty": "none"}}
    6.  **FORMATO JSON OBRIGATÓRIO:** Sua resposta DEVE ser um único objeto JSON válido, seguindo EXATAMENTE a estrutura abaixo. NÃO inclua ```json ``` no início ou fim.

        **Estrutura JSON Esperada:**
        {{{{
          "id": "string",
          "title": "string",
          "description": "string",
          "type": "string",
          "difficulty": "string",
          "options": [
            {{"id": "string", "text": "string"}},
            {{"id": "string", "text": "string"}}
          ],
          "correctOptionId": "string",
          "codeTemplate": "string",
          "expectedOutput": "string"
        }}}}

    DOCUMENTAÇÃO (CONTEXTO):
    {context}

    TÓPICO PARA O DESAFIO (PERGUNTA DO USUÁRIO):
    {question}

    DESAFIO GERADO (APENAS O OBJETO JSON):
""")
# --- Fim da Alteração do Prompt ---


@app.post("/api/challenge", response_model=ChallengeResponse)
async def generate_challenge(request: ChatRequest) -> ChallengeResponse:
    if not retriever:
        error_challenge = {
            "id": "error-no-rag", "title": "Erro de Configuração",
            "description": "O sistema de busca (RAG) não foi inicializado corretamente.",
            "type": "error", "difficulty": "none"
        }
        return ChallengeResponse(challenge=error_challenge)

    rag_chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt_template_desafio
        | llm
        | StrOutputParser()
    )

    try:
        bot_response_string = rag_chain.invoke(request.message)
        try:
            clean_response_string = bot_response_string.strip().removeprefix("```json").removesuffix("```").strip()
            challenge_data = json.loads(clean_response_string)
            if not isinstance(challenge_data, dict) or "id" not in challenge_data or "title" not in challenge_data:
                 raise ValueError("JSON retornado pelo LLM não tem a estrutura esperada.")
            return ChallengeResponse(challenge=challenge_data)
        except json.JSONDecodeError:
            print(f"Erro: LLM não retornou JSON válido. Resposta recebida:\n{bot_response_string}")
            error_challenge = {
                "id": "error-json-format", "title": "Erro de Formato",
                "description": "O assistente não conseguiu formatar o desafio corretamente. Tente gerar novamente.",
                 "type": "error", "difficulty": "none"
            }
            return ChallengeResponse(challenge=error_challenge)
        except ValueError as ve:
             print(f"Erro: {ve}. Resposta recebida:\n{bot_response_string}")
             error_challenge = {
                "id": "error-json-structure", "title": "Erro de Estrutura",
                "description": "O JSON retornado pelo assistente não possui a estrutura esperada. Tente gerar novamente.",
                 "type": "error", "difficulty": "none"
            }
             return ChallengeResponse(challenge=error_challenge)

    except Exception as e:
        print(f"Erro inesperado na chain RAG: {e}")
        error_challenge = {
            "id": "error-rag-chain", "title": "Erro Interno",
            "description": "Ocorreu um erro ao processar a solicitação do desafio.",
             "type": "error", "difficulty": "none"
        }
        return ChallengeResponse(challenge=error_challenge)

if __name__ == "__main__":
    import uvicorn
    print("Iniciando a API de DESAFIOS em http://localhost:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)