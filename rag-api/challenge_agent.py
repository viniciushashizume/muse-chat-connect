# Nome sugerido para este arquivo: challenge_agent.py

import os
import requests
import json
from io import BytesIO
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, List # Importe List

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

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.8) # Temperatura um pouco mais alta

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
    
    # --- ALTERAÇÃO: Mudar para MMR (Maximal Marginal Relevance) para diversidade ---
    # fetch_k=30: Busca os 30 chunks mais relevantes
    # k=10:      Seleciona os 10 melhores que também são mais diferentes entre si
    retriever = vector_db.as_retriever(
        search_type="mmr",
        search_kwargs={"k": 10, "fetch_k": 30}
    )
    print("Vector DB (MMR) criado com sucesso!")
else:
    print("Nenhum documento foi carregado. A API não pode iniciar o RAG.")
    retriever = None

# --- DEFINIÇÃO DA API COM FASTAPI ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

# --- ALTERAÇÃO: O modelo de resposta agora espera uma LISTA de desafios ---
class ChallengeResponse(BaseModel):
    challenges: List[Any] # Alterado de 'challenge: Any' para 'challenges: List[Any]'

# --- ALTERAÇÃO: Prompt totalmente reescrito para gerar MÚLTIPLOS desafios e FORÇAR variedade ---
prompt_template_desafio = ChatPromptTemplate.from_template("""
    Você é um "Mestre de Desafios" e sua especialidade é criar desafios complexos e VARIADOS com base em documentações técnicas, formatando a saída como um array JSON.

    Baseado no CONTEXTO abaixo, crie 3 DESAFIOS VARIADOS sobre o TÓPICO fornecido.

    TÓPICO PARA OS DESAFIOS (PERGUNTA DO USUÁRIO):
    {question}

    DOCUMENTAÇÃO (CONTEXTO):
    {context}

    === REGRAS OBRIGATÓRIAS ===
    1.  **Base no Contexto:** Os desafios DEVEM ser 100% baseados no contexto.
    2.  **Formato JSON OBRIGATÓRIO:** Sua resposta DEVE ser um único ARRAY JSON válido, contendo 3 objetos de desafio. NÃO inclua ```json ```.
    3.  **SEMPRE CRIE 3 DESAFIOS.**
    4.  **VARIAÇÃO DE TIPO:** Tente variar os tipos ("multiple-choice", "code", "essay").
    5.  **NÃO REPITA PERGUNTAS:** Garanta que os 3 desafios sejam diferentes entre si.
    6.  **SEJA ESPECÍFICO:** Evite perguntas genéricas (ex: "O que é software?"). Faça perguntas sobre detalhes, código ou cenários dos projetos.

    === REGRAS DE TÓPICO ===
    * **Se o TópICO for "software":**
        * Gere pelo menos UMA pergunta (type: "code") sobre Python (ex: sintaxe, classes, funções) com base no PDF de Python.
        * Gere pelo menos UMA pergunta (type: "multiple-choice" ou "essay") sobre conceitos de Python ou software da documentação.
    * **Se o TÓPICO for "robotica":**
        * Gere pelo menos UMA pergunta sobre a documentação específica da Syna (ex: projetos, componentes do robô, arquitetura).
        * Gere pelo menos UMA pergunta sobre conceitos gerais de robótica ou software embarcado do contexto.

    === ESTRUTURA JSON ESPERADA (ARRAY DE 3 OBJETOS) ===
    [
      {{
        "id": "string",
        "title": "string",
        "description": "string",
        "type": "string (multiple-choice, code, ou essay)",
        "difficulty": "string (easy, medium, ou hard)",
        "options": [],
        "correctOptionId": "",
        "codeTemplate": "",
        "expectedOutput": ""
      }},
      {{ ... segundo desafio ... }},
      {{ ... terceiro desafio ... }}
    ]
    
    Se não for possível gerar desafios com o contexto, retorne um array com um objeto de erro:
    [
      {{"id": "error", "title": "Erro de Contexto", "description": "Não foi possível criar desafios sobre '{question}' com a documentação atual.", "type": "error", "difficulty": "none"}}
    ]

    ARRAY JSON DE 3 DESAFIOS GERADOS:
""")
# --- Fim da Alteração do Prompt ---


# --- ALTERAÇÃO: Endpoint atualizado para 'response_model=ChallengeResponse' e lógica de array ---
@app.post("/api/challenge", response_model=ChallengeResponse)
async def generate_challenge(request: ChatRequest) -> ChallengeResponse:
    error_challenge = {
        "id": "error-default", "title": "Erro Interno",
        "description": "Ocorreu um erro ao processar a solicitação.",
        "type": "error", "difficulty": "none"
    }

    if not retriever:
        error_challenge["description"] = "O sistema de busca (RAG) não foi inicializado."
        return ChallengeResponse(challenges=[error_challenge]) # Retorna array com erro

    rag_chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt_template_desafio
        | llm
        | StrOutputParser()
    )

    try:
        bot_response_string = rag_chain.invoke(request.message)
        try:
            # Limpeza
            clean_response_string = bot_response_string.strip().lstrip("```json").rstrip("```").strip()
            
            # --- ALTERAÇÃO: Espera um array (começa com '[') ---
            json_start = clean_response_string.find('[')
            json_end = clean_response_string.rfind(']')
            
            if json_start == -1 or json_end == -1 or json_end < json_start:
                 raise json.JSONDecodeError("Nenhum array JSON válido encontrado.", clean_response_string, 0)
                 
            json_string = clean_response_string[json_start:json_end+1]
            
            challenge_data = json.loads(json_string)
            
            # --- ALTERAÇÃO: Verifica se é uma lista ---
            if not isinstance(challenge_data, list):
                 raise ValueError("JSON retornado pelo LLM não é um array (lista).")

            # Se a lista estiver vazia ou contiver dados inválidos (opcional)
            if not challenge_data:
                raise ValueError("LLM retornou um array vazio.")

            return ChallengeResponse(challenges=challenge_data) # Retorna o array de desafios
        
        except json.JSONDecodeError as e:
            print(f"Erro: LLM não retornou ARRAY JSON válido. Erro: {e}. Resposta:\n{bot_response_string}")
            error_challenge["description"] = "O assistente não conseguiu formatar os desafios (JSON). Tente gerar novamente."
            return ChallengeResponse(challenges=[error_challenge])
        except ValueError as ve:
             print(f"Erro: {ve}. Resposta:\n{bot_response_string}")
             error_challenge["description"] = "O assistente não retornou a estrutura de array esperada. Tente gerar novamente."
             return ChallengeResponse(challenges=[error_challenge])

    except Exception as e:
        print(f"Erro inesperado na chain RAG: {e}")
        error_challenge["description"] = f"Erro interno no servidor: {e}"
        return ChallengeResponse(challenges=[error_challenge])

if __name__ == "__main__":
    import uvicorn
    print("Iniciando a API de DESAFIOS (v2 - Múltiplos Desafios) em http://localhost:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)