import os
import requests
from io import BytesIO
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Importações do LangChain
from langchain_community.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser

# Carregue sua chave de API a partir de um arquivo .env (recomendado)
# Crie um arquivo .env na mesma pasta com: GOOGLE_API_KEY="SUA_CHAVE_AQUI"
from dotenv import load_dotenv
load_dotenv()

# --- CONFIGURAÇÃO INICIAL E CARREGAMENTO DO MODELO ---

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
    # Encerre a aplicação se o embedding não puder ser carregado
    exit()


# LLM do Google que será usado para gerar as respostas
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3)

# --- CARREGAMENTO E PROCESSAMENTO DOS DOCUMENTOS (ETAPA ÚNICA NA INICIALIZAÇÃO) ---

materiais_de_estudo = {
    "Python": ["https://donsheehy.github.io/datastructures/fullbook.pdf"]
}
documentos_totais = []

print("Iniciando o download e carregamento dos materiais de estudo...")

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

for materia, links in materiais_de_estudo.items():
    for i, link in enumerate(links, 1):
        caminho_arquivo_temporario = f"./{materia.replace(' ', '_').lower()}_{i}.pdf"
        try:
            with requests.get(link, headers=headers, stream=True, timeout=30) as r:
                r.raise_for_status()
                with open(caminho_arquivo_temporario, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
            
            loader = PyPDFLoader(caminho_arquivo_temporario)
            paginas = loader.load()
            documentos_totais.extend(paginas)
            print(f"Material '{materia}' carregado com sucesso.")

        except Exception as e:
            print(f"Erro ao processar o PDF da matéria '{materia}': {e}")
        finally:
            if os.path.exists(caminho_arquivo_temporario):
                os.remove(caminho_arquivo_temporario)

# Dividir os documentos em chunks e criar o Vector DB
vector_db = None
if documentos_totais:
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks = text_splitter.split_documents(documentos_totais)
    
    print(f"Criando Vector DB com {len(chunks)} chunks...")
    vector_db = FAISS.from_documents(chunks, embeddings)
    retriever = vector_db.as_retriever(search_kwargs={"k": 4})
    print("Vector DB criado com sucesso!")
else:
    print("Nenhum documento foi carregado. A API funcionará sem RAG.")
    retriever = None

# --- DEFINIÇÃO DA API COM FASTAPI ---

app = FastAPI()

# Configuração do CORS para permitir que o front-end acesse a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"], # Adicione a URL do seu front-end
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic para o request e response da API
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

# Prompt Template (conforme seu notebook)
prompt_template = ChatPromptTemplate.from_template("""
    Você é um Tutor de Python experiente e amigável. Sua missão é ensinar Python
    para um aluno, usando a documentação oficial como sua principal fonte de verdade.

    Com base no CONTEXTO abaixo, extraído da documentação, responda à PERGUNTA do aluno
    de forma clara, didática e precisa.

    REGRAS:
    1.  **Priorize o Contexto:** Sua resposta DEVE ser baseada primariamente nas informações
        contidas no contexto fornecido.
    2.  **Seja um Professor:** Não se limite a copiar o texto. Explique os conceitos
        de forma simples, como se estivesse dando uma aula.
    3.  **Use Exemplos de Código:** Sempre que for apropriado, inclua blocos de código
        curtos e práticos para ilustrar sua explicação.
    4.  **Se a Resposta Não Estiver no Contexto:** Se a informação não estiver no
        documento, informe ao aluno que a documentação fornecida não cobre aquele
        tópico específico, mas que você pode tentar responder com seu conhecimento geral.
    5.  **Mantenha o Foco:** Responda apenas à pergunta feita, sem divagar para outros
        assuntos.

    CONTEÚDO DA DOCUMENTAÇÃO (CONTEXTO):
    {context}

    PERGUNTA DO ALUNO:
    {question}

    RESPOSTA DO TUTOR:
""")

# Endpoint da API
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    if not retriever:
        return ChatResponse(response="Desculpe, o sistema de busca (RAG) não foi inicializado corretamente.")

    # Monta a chain de RAG
    rag_chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt_template
        | llm
        | StrOutputParser()
    )
    
    # Invoca a chain e obtém a resposta
    bot_response = rag_chain.invoke(request.message)
    
    return ChatResponse(response=bot_response)

# Comando para rodar a API (opcional, para facilitar)
if __name__ == "__main__":
    import uvicorn
    print("Iniciando a API em http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)