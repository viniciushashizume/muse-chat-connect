// API Configuration and Integration Point
// This file centralizes API calls for easier maintenance

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Endpoints específicos
export const CHAT_ENDPOINT = `${API_BASE_URL}/api/chat`;
export const GENERATE_CHALLENGES_ENDPOINT = `${API_BASE_URL}/api/generate-challenges`;
export const VALIDATE_CHALLENGE_ENDPOINT = `${API_BASE_URL}/api/validate-challenge`;

export interface ChatApiRequest {
  message: string;
}

export interface ChatApiResponse {
  response: string;
}

/**
 * Send a message to the RAG API and get a response
 * 
 * @param message - User's message to send to the API
 * @returns Promise with the assistant's response
 * 
 * TODO: Uncomment and configure when your Python API is ready
 */
export async function sendChatMessage(message: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message } as ChatApiRequest),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: ChatApiResponse = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error calling chat API:", error);
    throw error;
  }
}

/**
 * Mock function for testing without API
 * Remove this when the real API is ready
 */
export async function mockChatResponse(message: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return `Você disse: "${message}"\n\nEsta é uma resposta simulada. Quando conectar à API Python, vou processar sua mensagem usando RAG e retornar respostas reais baseadas em conhecimento.\n\n**Exemplo de código:**\n\`\`\`python\ndef process_rag_query(query: str) -> str:\n    # Your RAG logic here\n    return response\n\`\`\``;
}
