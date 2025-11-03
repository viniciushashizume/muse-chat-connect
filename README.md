Agente LABRIOT: RAG Chat Application

This repository contains a full-stack chat application designed to answer questions about specific documents. It features a React/Vite frontend and a Python/FastAPI backend that uses Retrieval-Augmented Generation (RAG) with Google's Gemini model.

The backend API indexes local PDF documents and uses them as a knowledge base to provide context-aware answers to user queries.

Technology Stack

Frontend

    Framework: React

    Build Tool: Vite

    Language: TypeScript

    UI: shadcn/ui

    Styling: Tailwind CSS

    Routing: React Router

Backend (RAG API)

    Framework: FastAPI

    Server: Uvicorn

    Orchestration: LangChain

    LLM: Google Gemini (via langchain-google-genai)

    Embeddings: Sentence-Transformers (all-MiniLM-L6-v2)

    Vector Store: FAISS (faiss-cpu)

    Document Loading: PyPDFLoader

Prerequisites

Before you begin, ensure you have the following installed:

    Node.js (v18 or later recommended) & npm

    Python (v3.9 or later recommended) & pip

    A Google API Key for the Gemini model. You can get one from Google AI Studio.

How to Run

This project consists of two parts: the Backend API and the Frontend Application. You will need to run them in two separate terminals.

1. Backend Setup (RAG API)

First, set up and run the Python backend.

    Navigate to the API directory:
    Bash

cd rag-api

Create a virtual environment (recommended):
Bash

python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate

Install Python dependencies:
Bash

pip install -r requirements.txt

Add your documents: The API is configured to load specific PDFs. Make sure the following files are present in the rag-api/ directory:

    Documentação Syna.pdf

    Python do ZERO à Programação Orientada a Objetos (Fernando Belomé Feltrin).pdf

Create an environment file: Create a file named .env in the rag-api/ directory. You will need to add your Google API key here.

# rag-api/.env
GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY_HERE"

Note: The application uses dotenv to load this key.

Run the API server:
Bash

    uvicorn main:app --reload --port 8000

    The API will start, load the PDF documents, create the vector store, and be available at http://localhost:8000.

2. Frontend Setup

In a new terminal, set up and run the React frontend.

    Navigate to the project's root directory (if you are in rag-api, go back):
    Bash

cd ..

Install Node.js dependencies:
Bash

npm i

Create an environment file: Create a file named .env in the root directory. This tells the frontend where to find the API.

# /.env
VITE_API_URL=http://localhost:8000

Run the development server:
Bash

npm run dev

The React application will start and be accessible in your browser (usually at http://localhost:5173).
