# Nome sugerido para este arquivo: validation_agent.py

import os
import requests
import json
from io import BytesIO
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, List
from operator import itemgetter # Importe itemgetter

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

# LLM para validação (temperatura baixa para ser um "juiz" rigoroso)
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.1) 

# --- Lógica de carregamento de múltiplos documentos ---
# (Esta seção é IDÊNTICA aos outros agentes para garantir que ele "leia" os mesmos documentos)
lista_de_documentos_pdf = [
    "Documentação Syna.pdf",
    "Python do ZERO à Programação Orientada a Objetos (Fernando Belomé Feltrin).pdf"
    # Adicione aqui os PDFs de JavaScript, C++, Cachorros, etc.
]
documentos_totais = []
print("Iniciando o carregamento dos documentos locais (Agente de Validação)...")
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
    
    # Retriever padrão focado em relevância (k=5)
    retriever = vector_db.as_retriever(search_kwargs={"k": 5})
    print("Vector DB (Validação) criado com sucesso!")
else:
    print("Nenhum documento foi carregado. A API não pode iniciar o RAG.")
    retriever = None

# --- DEFINIÇÃO DA API COM FASTAPI ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite todas as origens (ajuste para produção)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos Pydantic para Validação ---

class ValidationRequest(BaseModel):
    challenge: Any  # O objeto JSON completo do desafio gerado
    user_answer: str # A resposta que o usuário forneceu

class ValidationResponse(BaseModel):
    is_correct: bool
    feedback: str

# --- PROMPT TEMPLATE DE VALIDAÇÃO (MAIS RIGOROSO) ---
prompt_template_validation = ChatPromptTemplate.from_template("""
    Você é um Agente Avaliador robótico e implacável. Sua única missão é
    determinar se a "RESPOSTA DO USUÁRIO" é factualmente correta,
    baseando-se EXCLUSIVAMENTE no "CONTEXTO DA DOCUMENTAÇÃO (GABARITO)".

    CONTEXTO DA DOCUMENTAÇÃO (GABARITO):
    {context}

    DESAFIO ORIGINAL (em JSON):
    {challenge_json}

    RESPOSTA DO USUÁRIO:
    {user_answer}

    === REGRAS DE AVALIAÇÃO IMPLACÁVEIS ===
    1.  **VERDADE ABSOLUTA:** O "CONTEXTO" é a única fonte da verdade.
    2.  **SEM CONTEXTO, SEM PONTOS:** Se a "RESPOSTA DO USUÁRIO"
        (ex: "batata", "não sei", "asdfg") não tiver absolutamente NENHUMA semelhança
        semântica ou factual com o "CONTEXTO", ela está 100% INCORRETA.
    3.  **AVALIAÇÃO DE 'ESSAY' (MUITO IMPORTANTE):**
        * Para 'essay', a "RESPOSTA DO USUÁRIO" DEVE refletir os fatos,
            conceitos e informações presentes no "CONTEXTO".
        * Avalie se a resposta é completa e precisa.
        * Respostas genéricas, vagas ou factualmente incorretas (como "batata") DEVEM ser
            marcadas como `is_correct: false`.
    4.  **AVALIAÇÃO DE 'MULTIPLE-CHOICE':**
        * Verifique se a 'user_answer' (que deve ser um 'id' de opção)
            corresponde ao 'correctOptionId' no JSON do desafio.
    5.  **AVALIAÇÃO DE 'CODE':**
        * Avalie se o código na 'user_answer' resolve a 'description'
            corretamente, com base nos conceitos do "CONTEXTO". Verifique se
            cumpre o 'expectedOutput', se houver.

    === FEEDBACK ===
    * Se CORRETO: Parabenize e reforce o porquê está correto ("Correto! A
        resposta está alinhada com a documentação que diz: ...").
    * Se INCORRETO: Explique educadamente o porquê está incorreto e qual
        seria a resposta correta, CITANDO o "CONTEXTO".
        (ex: "Incorreto. A resposta 'batata' não tem relação com o
        assunto. A documentação indica que a resposta correta é...")

    === OBJETO JSON DE SAÍDA (Sua resposta DEVE ser apenas este JSON) ===
    {{
      "is_correct": boolean,
      "feedback": "string (Explique o porquê está correto ou incorreto,
                          com base no CONTEXTO.)"
    }}

    OBJETO JSON DE AVALIAÇÃO:
""")
# --- Fim do Prompt ---


@app.post("/api/validate", response_model=ValidationResponse)
async def validate_answer(request: ValidationRequest) -> ValidationResponse:
    default_error_response = ValidationResponse(
        is_correct=False,
        feedback="Ocorreu um erro interno ao processar a validação."
    )

    if not retriever:
        return ValidationResponse(
            is_correct=False,
            feedback="O sistema de busca (RAG) não foi inicializado."
        )

    try:
        # --- LÓGICA DE CHAIN CORRIGIDA ---

        # 1. Chain do Retriever: Busca o "gabarito" (contexto) usando APENAS o desafio.
        #    O 'itemgetter' pega os dados do input da chain principal.
        retriever_chain = (
            {
                # Extrai os dados do objeto 'challenge' que vem no input
                "title": lambda x: x['challenge'].get('title', ''),
                "description": lambda x: x['challenge'].get('description', '')
            }
            # Formata a query para o retriever buscar a RESPOSTA/GABARITO
            | ChatPromptTemplate.from_template(
                "Qual é a resposta ou o contexto relevante para este desafio: '{title}' - '{description}'?"
              )
            | retriever
        )
        
        # 2. Chain RAG Principal: Combina o gabarito (context) com o resto dos dados.
        rag_chain = (
            {
                # O 'context' é buscado dinamicamente pela 'retriever_chain'
                "context": retriever_chain,
                # Os outros campos são passados diretamente do input
                "challenge_json": lambda x: json.dumps(x['challenge']),
                "user_answer": itemgetter("user_answer") # Pega a string 'user_answer' do input
            }
            | prompt_template_validation # O novo prompt, mais rígido
            | llm
            | StrOutputParser()
        )

        # Monta o input para a chain principal
        # O input agora é um dicionário contendo o objeto challenge e a string user_answer
        chain_input = {
            "challenge": request.challenge, # O objeto JSON completo do desafio
            "user_answer": request.user_answer  # A string da resposta do usuário
        }
        
        # Invoca a chain de validação
        bot_response_string = rag_chain.invoke(chain_input)
        
        # --- Fim da Lógica de Chain Corrigida ---
        
        try:
            # Limpeza
            clean_response_string = bot_response_string.strip().lstrip("```json").rstrip("```").strip()
            
            json_start = clean_response_string.find('{')
            json_end = clean_response_string.rfind('}')
            
            if json_start == -1 or json_end == -1 or json_end < json_start:
                 raise json.JSONDecodeError("Nenhum objeto JSON válido encontrado.", clean_response_string, 0)
                 
            json_string = clean_response_string[json_start:json_end+1]
            
            validation_data = json.loads(json_string)
            
            # Verifica se os campos esperados estão presentes
            if "is_correct" not in validation_data or "feedback" not in validation_data:
                raise ValueError("JSON retornado pelo LLM não contém 'is_correct' ou 'feedback'.")

            return ValidationResponse(
                is_correct=validation_data["is_correct"],
                feedback=validation_data["feedback"]
            )
        
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Erro: LLM não retornou JSON de validação válido. Erro: {e}. Resposta:\n{bot_response_string}")
            return ValidationResponse(
                is_correct=False,
                feedback="O assistente não conseguiu formatar a avaliação (JSON). Tente novamente."
            )

    except Exception as e:
        print(f"Erro inesperado na chain RAG de validação: {e}")
        return default_error_response

if __name__ == "__main__":
    import uvicorn
    print("Iniciando a API de VALIDAÇÃO (v2 - Corrigida) em http://localhost:8002")
    uvicorn.run(app, host="0.0.0.0", port=8002)