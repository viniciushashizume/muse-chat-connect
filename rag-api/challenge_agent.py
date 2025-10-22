# Nome sugerido para este arquivo: challenge_agent.py

import os
import requests
from io import BytesIO
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Importações do LangChain (idênticas ao seu main.py)
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
# (Esta seção é idêntica ao seu main.py para manter a consistência)

# Modelo de embedding que será usado
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

# LLM do Google que será usado para gerar as respostas
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.5) # --- ALTERAÇÃO SUTIL: Aumentei um pouco a temperatura para mais criatividade nos desafios


# --- Lógica de carregamento de múltiplos documentos ---
# (Esta seção é idêntica ao seu main.py)

# --- DEFINA SEUS DOCUMENTOS AQUI ---
lista_de_documentos_pdf = [
    "Documentação Syna.pdf",
]
# -------------------------------------

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

# --- Fim da Lógica de Carregamento ---


# Dividir os documentos em chunks e criar o Vector DB
# (Esta seção é idêntica ao seu main.py)
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

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"], # Mantém o mesmo front-end
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic (Idênticos, 'message' será o tópico do desafio)
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

# --- ALTERAÇÃO: Novo Prompt Template focado em GERAR DESAFIOS ---
prompt_template_desafio = ChatPromptTemplate.from_template("""
    Você é um "Mestre de Desafios" e sua especialidade é criar desafios e perguntas complexas com base em documentações técnicas.
    Sua missão é forçar o usuário a pensar criticamente sobre o conteúdo da documentação fornecida.

    Baseado no CONTEXTO abaixo (extraído da documentação), crie um DESAFIO ou PERGUNTA sobre o TÓPICO fornecido pelo usuário.

    REGRAS:
    1.  **Base no Contexto:** O desafio DEVE ser 100% baseado nas informações do contexto.
    2.  **Foco no Tópico:** O desafio deve ser relevante ao TÓPICO que o usuário pediu (representado pela "PERGUNTA DO USUÁRIO").
    3.  **Formato do Desafio:** Seja criativo. Pode ser:
        * Uma pergunta de múltipla escolha.
        * Um cenário "O que você faria se...".
        * Uma pergunta direta que exija conhecimento profundo ("Explique o conceito X com base no texto.").
        * Uma mini-tarefa ("Liste os 3 passos para...").
    4.  **Não dê a Resposta:** Seu trabalho é criar o DESAFIO. Não forneça a resposta, a menos que seja um quiz de múltipla escolha (onde você deve incluir as opções).
    5.  **Se o Tópico Não Estiver no Contexto:** Se o contexto não tiver informações suficientes sobre o TÓPICO para criar um bom desafio, informe ao usuário que não pode criar um desafio sobre isso com a documentação atual.

    DOCUMENTAÇÃO (CONTEXTO):
    {context}

    TÓPICO PARA O DESAFIO (PERGUNTA DO USUÁRIO):
    {question}

    DESAFIO GERADO:
""")

# --- ALTERAÇÃO: Novo Endpoint da API para Desafios ---
@app.post("/api/challenge", response_model=ChatResponse)
async def generate_challenge(request: ChatRequest) -> ChatResponse:
    if not retriever:
        return ChatResponse(response="Desculpe, o sistema de busca (RAG) não foi inicializado corretamente pois nenhum documento foi carregado.")

    # Monta a chain de RAG
    rag_chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt_template_desafio  # --- ALTERAÇÃO: Usa o novo prompt
        | llm
        | StrOutputParser()
    )
    
    # A 'request.message' agora é interpretada como o TÓPICO do desafio
    bot_response = rag_chain.invoke(request.message)
    
    return ChatResponse(response=bot_response)

# Comando para rodar a API
if __name__ == "__main__":
    import uvicorn
    # --- ALTERAÇÃO: Rodando na porta 8001 para não conflitar com o main.py
    print("Iniciando a API de DESAFIOS em http://localhost:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)