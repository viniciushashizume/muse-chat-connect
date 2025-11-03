# Nome sugerido para este arquivo: validation_agent.py

import os
import requests
import json
import sys
import subprocess # Para o Code Sandbox
import traceback # Para capturar exceções

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, List, Optional

# Importações do LangChain (NECESSÁRIAS para validar dissertações)
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser

from dotenv import load_dotenv
load_dotenv()

# --- 1. CONFIGURAÇÃO DO RAG (Necessário para validar 'essay') ---
# (Esta seção é duplicada do challenge_agent para que este agente
# tenha acesso ao mesmo contexto para validar as respostas.)

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

# LLM para validação de dissertação (temperatura baixa)
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2)

# --- Lógica de carregamento de múltiplos documentos ---
lista_de_documentos_pdf = [
    "Documentação Syna.pdf",
    "Python do ZERO à Programação Orientada a Objetos (Fernando Belomé Feltrin).pdf"
    # Adicione aqui os PDFs de JavaScript, C++, Cachorros, etc.
]
documentos_totais = []
print("Iniciando o carregamento dos documentos (Agente de Validação)...")
for caminho_do_pdf in lista_de_documentos_pdf:
    try:
        if not os.path.exists(caminho_do_pdf):
            print(f"Erro: Arquivo não encontrado: {caminho_do_pdf}")
            continue
        loader = PyPDFLoader(caminho_do_pdf)
        paginas = loader.load()
        documentos_totais.extend(paginas)
        print(f"Documento '{caminho_do_pdf}' carregado ({len(paginas)} páginas).")
    except Exception as e:
        print(f"Erro ao processar o PDF '{caminho_do_pdf}': {e}")
print(f"Total de páginas carregadas: {len(documentos_totais)}")

# --- Criar o Vector DB e o Retriever ---
retriever = None
if documentos_totais:
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks = text_splitter.split_documents(documentos_totais)
    print(f"Criando Vector DB com {len(chunks)} chunks...")
    vector_db = FAISS.from_documents(chunks, embeddings)
    retriever = vector_db.as_retriever(
        search_type="mmr",
        search_kwargs={"k": 5} # Busca 5 chunks relevantes para validação
    )
    print("Vector DB (MMR) criado com sucesso!")
else:
    print("Nenhum documento foi carregado. A validação de dissertações (essay) não funcionará.")

# --- 2. IMPLEMENTAÇÃO DO CODE SANDBOX ---

def run_in_sandbox(code: str, language: str = "python") -> (Optional[str], Optional[str]):
    """
    Executa um trecho de código em um sandbox usando subprocess.

    !!! ALERTA DE SEGURANÇA !!!
    Executar código arbitrário de usuários é EXTREMAMENTE PERIGOSO.
    Esta implementação usa 'subprocess' que é vulnerável a ataques
    de "jailbreak" e abuso de recursos (ex: loops infinitos, fork bombs).
    
    Para PRODUÇÃO, use ambientes isolados como:
    1.  Contêineres Docker (ex: 'docker run --rm -m 128m --cpus 0.5 ...')
    2.  Serviços de API (ex: glot.io, Judge0)
    3.  WebAssembly (WASM)
    
    Esta implementação inclui um 'timeout' básico como mitigação mínima.
    """
    if language.lower() != "python":
        return None, "Linguagem não suportada pelo sandbox."

    try:
        # sys.executable aponta para o interpretador Python atual
        result = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True,
            text=True,
            timeout=5, # Limite de 5 segundos para execução
            check=False # Não levanta exceção se o código falhar (stderr)
        )
        
        if result.stderr:
            # Se houver erro de sintaxe ou execução
            return None, result.stderr.strip()
        else:
            # Se a execução for bem-sucedida
            return result.stdout.strip(), None

    except subprocess.TimeoutExpired:
        return None, "Erro: O código demorou muito para executar (limite de 5 segundos)."
    except Exception as e:
        return None, f"Erro inesperado no sandbox: {traceback.format_exc()}"

# --- 3. DEFINIÇÃO DA API DE VALIDAÇÃO ---

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite todas as origens (ajuste para produção)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ValidationRequest(BaseModel):
    challenge: Any # O objeto de desafio completo gerado pelo challenge_agent
    user_answer: str # A resposta do usuário (ID da opção, código, ou texto)

class ValidationResponse(BaseModel):
    is_correct: bool
    feedback: str
    output: Optional[str] = None # Para retornar o stdout/stderr do sandbox

# --- 4. PROMPT DE VALIDAÇÃO DE DISSERTAÇÃO (ESSAY) ---

prompt_template_essay_validation = ChatPromptTemplate.from_template("""
    Você é um "Professor Avaliador" rigoroso. Sua tarefa é avaliar se a 'RESPOSTA DO USUÁRIO'
    responde corretamente à 'PERGUNTA DO DESAFIO', com base estritamente no 'CONTEXTO' fornecido.

    CONTEXTO (Documentação):
    {context}

    PERGUNTA DO DESAFIO:
    {question}

    RESPOSTA DO USUÁRIO (para avaliar):
    {user_answer}

    === REGRAS DE AVALIAÇÃO ===
    1.  **Baseado no Contexto:** A 'RESPOSTA DO USUÁRIO' só é correta se for 100% suportada
        pelas informações no 'CONTEXTO'.
    2.  **Seja Cético:** Não aceite respostas vagas ou que parecem corretas mas não estão
        no contexto.
    3.  **Formato JSON OBRIGATÓRIO:** Sua resposta DEVE ser um único objeto JSON,
        contendo 'is_correct' (boolean) e 'feedback' (string).
    4.  **Feedback Construtivo:** O feedback deve explicar POR QUE a resposta está
        correta ou incorreta, citando o contexto.

    === JSON DE AVALIAÇÃO (Responda APENAS com este JSON): ===
""")

# --- 5. ENDPOINT DA API DE VALIDAÇÃO ---

@app.post("/api/validate", response_model=ValidationResponse)
async def validate_challenge(request: ValidationRequest):
    try:
        challenge = request.challenge
        user_answer = request.user_answer.strip()
        challenge_type = challenge.get("type", "unknown")

        # --- Lógica de Validação: Múltipla Escolha ---
        if challenge_type == "multiple-choice":
            correct_option_id = challenge.get("correctOptionId")
            if not correct_option_id:
                return ValidationResponse(is_correct=False, feedback="Erro: O desafio original não tem 'correctOptionId'.")

            if user_answer == correct_option_id:
                return ValidationResponse(is_correct=True, feedback="Resposta correta!")
            else:
                return ValidationResponse(is_correct=False, feedback="Resposta incorreta.")

        # --- Lógica de Validação: Código (Code Sandbox) ---
        elif challenge_type == "code":
            expected_output = challenge.get("expectedOutput", "").strip()
            
            # Chama o sandbox
            actual_output, error = run_in_sandbox(user_answer, language="python")

            if error:
                # O código falhou ou deu timeout
                return ValidationResponse(
                    is_correct=False,
                    feedback=f"Ocorreu um erro ao executar seu código:\n{error}",
                    output=error
                )
            
            # Compara o output real com o esperado
            if actual_output == expected_output:
                return ValidationResponse(
                    is_correct=True,
                    feedback="Correto! O código produziu o output esperado.",
                    output=actual_output
                )
            else:
                return ValidationResponse(
                    is_correct=False,
                    feedback=f"Incorreto.\nOutput esperado:\n{expected_output}\n\nSeu output:\n{actual_output}",
                    output=actual_output
                )

        # --- Lógica de Validação: Dissertação (LLM + RAG) ---
        elif challenge_type == "essay":
            if not retriever:
                return ValidationResponse(is_correct=False, feedback="Erro: O RAG não foi inicializado, não é possível validar a dissertação.")

            challenge_question = challenge.get("description", "") # A pergunta do desafio
            
            # Define o parser para esperar um JSON do LLM
            parser = JsonOutputParser()
            
            # Define a chain de RAG para validação
            # 1. Busca contexto baseado na pergunta do desafio
            # 2. Passa o contexto, a pergunta e a resposta do usuário para o LLM
            # 3. O LLM avalia e o Parser extrai o JSON
            validation_chain = (
                {
                    "context": (lambda x: x['question']) | retriever,
                    "question": (lambda x: x['question']),
                    "user_answer": (lambda x: x['user_answer'])
                }
                | prompt_template_essay_validation
                | llm
                | parser
            )

            # Invoca a chain
            try:
                validation_result = validation_chain.invoke({
                    "question": challenge_question,
                    "user_answer": user_answer
                })
                
                # O resultado do parser já é um dict
                return ValidationResponse(
                    is_correct=validation_result.get("is_correct", False),
                    feedback=validation_result.get("feedback", "O avaliador não forneceu feedback.")
                )
            except Exception as e:
                print(f"Erro na chain de validação de dissertação: {e}")
                traceback.print_exc()
                return ValidationResponse(is_correct=False, feedback=f"Erro ao avaliar a dissertação: {e}")

        # --- Outros Tipos ---
        else:
            return ValidationResponse(is_correct=False, feedback=f"Tipo de desafio desconhecido: '{challenge_type}'.")

    except Exception as e:
        print(f"Erro inesperado no endpoint /api/validate: {e}")
        traceback.print_exc()
        return ValidationResponse(
            is_correct=False,
            feedback=f"Erro interno no servidor de validação: {e}"
        )

# --- 6. EXECUTAR A API ---
if __name__ == "__main__":
    import uvicorn
    print("Iniciando a API de VALIDAÇÃO (v1) em http://localhost:8002")
    uvicorn.run(app, host="0.0.0.0", port=8002)