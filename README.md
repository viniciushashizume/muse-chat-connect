# Agente LABRIOT: RAG Chat Application

This repository contains a complete chat application designed to answer questions about specific documents. It features a React/Vite frontend and a Python/FastAPI backend that utilizes Augmented Generation by Retrieval (RAG) with Google's Gemini model.

The backend API indexes local PDF documents and uses them as a knowledge base to provide contextual answers to user queries and generate challenges based on learning areas.

## Technology Stack

### Frontend
* **Framework:** [React](https://react.dev/)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **UI:** [shadcn/ui](https://ui.shadcn.com/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Routing:** [React Router](https://reactrouter.com/)

### Backend (RAG API)
* **Framework:** [FastAPI](https://fastapi.tiangolo.com/)
* **Server:** [Uvicorn](https://www.uvicorn.org/)
* **Orchestration:** [LangChain](https://www.langchain.com/)
* **LLM:** [Google Gemini (via `langchain-google-genai`)](https://python.langchain.com/docs/integrations/chat/google_generative_ai)
* **Embeddings:** [Sentence-Transformers (`all-MiniLM-L6-v2`)](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
* **Vector Store:** [FAISS (faiss-cpu)](https://faiss.ai/)
* **Document Loading:** [PyPDFLoader](https://python.langchain.com/docs/integrations/document_loaders/pdf)

## Prerequisites

Before you begin, ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v18 or later recommended) & npm
* [Python](https://www.python.org/) (v3.9 or later recommended) & pip
* A **Google API Key** for the Gemini model. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).

## How to Run

This project consists of two parts: the **Backend API** and the **Frontend Application**. You will need to run them in two separate terminals.

### 1. Backend Setup (RAG API)

First, set up and run the Python backend.

1.  **Navigate to the API directory:**
    ```sh
    cd rag-api
    ```

2.  **Create a virtual environment** (recommended):
    ```sh
    python -m venv venv
    source venv/bin/activate  # On Windows, use: venv\Scripts\activate
    ```

3.  **Install Python dependencies:**
    ```sh
    pip install -r requirements.txt
    ```

4.  **Add your documents:**
    The API is configured to load specific PDFs. Make sure the following files are present in the `rag-api/` directory:
    * `Documentação Syna.pdf`
    * `Python do ZERO à Programação Orientada a Objetos (Fernando Belomé Feltrin).pdf`

5.  **Create an environment file:**
    Create a file named `.env` in the `rag-api/` directory. You will need to add your Google API key here.
    ```
    # rag-api/.env
    GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY_HERE"
    ```
    *Note: The application uses `dotenv` to load this key.*

6.  **Run the API server:**
    ```sh
    uvicorn main:app --reload --port 8000
    ```
    The API will start, load the PDF documents, create the vector store, and be available at `http://localhost:8000`.

    For the challenge-creating agent run:
    ```sh
    uvicorn challenge_agent:app --reload --port 8001
    ```
    For the answer-validation agent run:
    ```sh
    uvicorn validation_agent:app --reload --port 8002
    ```

### 2. Frontend Setup

In a **new terminal**, set up and run the React frontend.

1.  **Navigate to the project's root directory** (if you are in `rag-api`, go back):
    ```sh
    cd ..
    ```

2.  **Install Node.js dependencies:**
    ```sh
    npm i
    ```

3.  **Create an environment file:**
    Create a file named `.env` in the root directory. This tells the frontend where to find the API.
    ```
    # /.env
    VITE_API_URL=http://localhost:8000
    ```

4.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The React application will start and be accessible in your browser (usually at `http://localhost:5173`).

You can now interact with the chat interface, which will send requests to your local RAG API.
