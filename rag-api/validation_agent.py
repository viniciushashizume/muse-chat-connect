# Nome sugerido para este arquivo: validation_agent.py
# VERSÃO COM CORREÇÃO DEFINITIVA

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

from collections import Counter
import re

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
llm = ChatGoogleGenerativeAI(model="gemini-2.5-pro", temperature=0.1) 

lista_de_documentos_pdf = [
    "Documentação Syna.pdf",
    "Python do ZERO à Programação Orientada a Objetos (Fernando Belomé Feltrin).pdf"
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
    challenge: Any   # O objeto JSON completo do desafio gerado
    user_answer: str # A resposta que o usuário forneceu

class ValidationResponse(BaseModel):
    is_correct: bool
    feedback: str

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


AGENT_CARD = {
  "a2a_version": "0.1.0",
  "id": "agent-challenge-validator-v1",
  "name": "Avaliador Implacável",
  "description": "Um agente especialista em validar se uma resposta de usuário é correta, baseado em documentação.",
  "capabilities": [
    {
      "id": "validate-answer",
      "description": "Valida a resposta de um usuário para um desafio específico.",
      "type": "http",
      "endpoint": "/api/validate", # Endpoint existente
      "method": "POST",
      "request_schema": {
        "type": "object",
        "properties": {
          "challenge": { "type": "object", "description": "O objeto de desafio original" },
          "user_answer": { "type": "string", "description": "A resposta fornecida pelo usuário" }
        },
        "required": ["challenge", "user_answer"]
      },
      "response_schema": {
        "type": "object",
        "properties": {
          "is_correct": { "type": "boolean" },
          "feedback": { "type": "string" }
        }
      }
    }
  ]
}

@app.get("/.well-known/agent.json", response_model=None)
async def get_agent_card():
    """
    Endpoint de Descoberta do A2A Protocol.
    Retorna o Agent Card que descreve as capacidades deste agente.
    """
    return AGENT_CARD

@app.post("/api/validate", response_model=ValidationResponse)
async def validate_answer(request: ValidationRequest) -> ValidationResponse:
    """
    Validação determinística com heurísticas locais:
    - multiple-choice: compara IDs
    - essay: verifica sobreposição de tokens relevantes entre description/context e user_answer
    - code: tenta comparar expectedOutput (se houver) ou recomenda revisão manual
    """

    # Prints de debug (mantenha para inspeção)
    print("\n--- DEBUG validate_answer: Entrada recebida ---")
    print(f"challenge (preview): {json.dumps(request.challenge)[:1000]}")  # limita comprimento no log
    print(f"user_answer: {request.user_answer}")

    # Segurança: campos obrigatórios
    if not isinstance(request.challenge, dict):
        return ValidationResponse(
            is_correct=False,
            feedback="Desafio inválido: 'challenge' deve ser um objeto JSON."
        )

    # Extraia campos com fallback
    challenge_type = request.challenge.get("type", "").lower()
    title = request.challenge.get("title", "")
    description = request.challenge.get("description", "")
    correct_id = request.challenge.get("correctOptionId", None)
    expected_output = request.challenge.get("expectedOutput", None)

    # função utilitária simples de limpeza / tokenização
    def tokens_of(text):
        if not text:
            return []
        text = text.lower()
        text = re.sub(r"[^a-z0-9áéíóúãõâêîôûç\s]", " ", text)
        toks = [t for t in text.split() if len(t) > 2]
        return toks

    # ===== MULTIPLE-CHOICE (determinístico) =====
    if challenge_type == "multiple-choice" or correct_id is not None:
        # O usuário pode fornecer 'A'/'1' etc — padronize comparando strings
        ua = str(request.user_answer).strip()
        correct = str(correct_id).strip() if correct_id is not None else None

        if correct is None:
            return ValidationResponse(
                is_correct=False,
                feedback="Desafio sem 'correctOptionId' — impossível validar automaticamente."
            )

        if ua == correct:
            fb = f"Correto! A opção escolhida ('{ua}') é a mesma que o gabarito ('{correct}')."
            return ValidationResponse(is_correct=True, feedback=fb)
        else:
            # opcional: tente mapear letras para índices (A->1) se o challenge usar '1','2' etc.
            letter_map = {"a":"1","b":"2","c":"3","d":"4","1":"1","2":"2","3":"3","4":"4"}
            mapped = letter_map.get(ua.lower(), ua)
            if mapped == correct:
                fb = f"Correto (após mapeamento). Você enviou '{ua}', mapeado para '{mapped}', que é o gabarito."
                return ValidationResponse(is_correct=True, feedback=fb)
            else:
                fb = f"Incorreto. Você enviou '{ua}'; o gabarito é '{correct}'."
                # opcional: citar trecho da descrição/gabarito se houver
                return ValidationResponse(is_correct=False, feedback=fb)

    # ===== ESSAY (heurística de sobreposição) =====
    if challenge_type == "essay" or challenge_type == "open-answer":
        desc_tokens = tokens_of(description)
        ans_tokens = tokens_of(request.user_answer)
        if not desc_tokens:
            return ValidationResponse(
                is_correct=False,
                feedback="Não há contexto suficiente no desafio para avaliar automaticamente."
            )

        # Calcule overlap simples
        desc_counter = Counter(desc_tokens)
        common = set(desc_counter.keys()).intersection(set(ans_tokens))
        overlap_ratio = len(common) / max(1, len(set(desc_counter.keys())))

        print(f"DEBUG: tokens no gabarito: {len(set(desc_counter.keys()))}, tokens em comum: {len(common)}, overlap_ratio: {overlap_ratio:.2f}")

        # thresholds (ajustáveis)
        if overlap_ratio >= 0.45 and len(common) >= 3:
            fb = ("Resposta plausivelmente correta. Termos-chave encontrados no texto: "
                  + ", ".join(list(common)[:8]))
            return ValidationResponse(is_correct=True, feedback=fb)
        else:
            fb = ("Resposta possivelmente incorreta ou incompleta. Foram encontrados poucos termos-chave em comum. "
                  "Sugestão: inclua conceitos/termos presentes no enunciado, por exemplo: "
                  + ", ".join(list(desc_counter.keys())[:6]))
            return ValidationResponse(is_correct=False, feedback=fb)

    # ===== CODE (heurística básica) =====
    if challenge_type == "code" or expected_output is not None:
        ua = str(request.user_answer)
        if expected_output is not None:
            if str(expected_output).strip() in ua:
                fb = "Correto: o output esperado aparece na resposta (comparação por substring)."
                return ValidationResponse(is_correct=True, feedback=fb)
            else:
                fb = ("Incorreto ou inconclusivo: o 'expectedOutput' não foi encontrado na resposta. "
                      "Recomenda-se executar o código em ambiente de testes para validação completa.")
                return ValidationResponse(is_correct=False, feedback=fb)
        else:
            return ValidationResponse(
                is_correct=False,
                feedback="Avaliação automática de 'code' sem 'expectedOutput' não é possível. Execute testes automatizados ou revise manualmente."
            )

    # ===== FALLBACK: tipo desconhecido =====
    return ValidationResponse(
        is_correct=False,
        feedback="Tipo de desafio não reconhecido. Suporte apenas para 'multiple-choice', 'essay' e 'code' no momento."
    )

if __name__ == "__main__":
    import uvicorn
    print("Iniciando a API de VALIDAÇÃO (v4 - Correção Definitiva) em http://localhost:8002")
    uvicorn.run(app, host="0.0.0.0", port=8002)