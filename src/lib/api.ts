// src/lib/api.ts

import { Challenge } from "@/types/challenge"; // Importe o tipo Challenge

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const CHALLENGE_API_BASE_URL = import.meta.env.VITE_CHALLENGE_API_URL || "http://localhost:8001";

// Endpoints específicos
export const CHAT_ENDPOINT = `${API_BASE_URL}/api/chat`;
export const CHALLENGE_ENDPOINT = `${CHALLENGE_API_BASE_URL}/api/challenge`;

export interface ChatApiRequest {
  message: string;
}

export interface ChatApiResponse {
  response: string;
}

// +++ Define a estrutura da resposta da API de desafios +++
export interface ChallengeApiResponse {
  challenges: Challenge[];
}

/**
 * Send a message to the RAG API and get a response
 *
 * @param message - User's message to send to the API
 * @returns Promise with the assistant's response
 */
export async function sendChatMessage(message: string): Promise<string> {
  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message } as ChatApiRequest),
    });

    if (!response.ok) {
      throw new Error(`Chat API error: ${response.status} ${response.statusText}`);
    }

    const data: ChatApiResponse = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error calling chat API:", error);
    throw error;
  }
}

/**
 * Sends a topic to the Challenge Agent API and gets a challenge object.
 *
 * @param topic - The topic for challenge generation (e.g., "software", "robotica")
 * @returns Promise with the challenge object (or an error object)
 */
 // +++ Ajusta o tipo de retorno para ChallengeApiResponse +++
export async function generateChallenges(topic: string): Promise<ChallengeApiResponse> {
  try {
    const response = await fetch(CHALLENGE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: topic } as ChatApiRequest),
    });

    if (!response.ok) {
      // Tenta pegar detalhes do erro se a API retornar JSON
      let errorDetail = `Challenge API error: ${response.status} ${response.statusText}`;
      try {
          const errorJson = await response.json();
          errorDetail = errorJson.detail || errorDetail;
      } catch (e) { /* Ignora se não for JSON */ }
      throw new Error(errorDetail);
    }

    const data: ChallengeApiResponse = await response.json();
    return data; // Retorna o objeto { challenges: [...] }
  } catch (error) {
    console.error("Error calling challenge API:", error);
    // Retorna um objeto de erro estruturado em caso de falha na comunicação
    return {
      challenges: [{
        id: "error-fetch",
        title: "Erro de Rede",
        description: error instanceof Error ? error.message : "Não foi possível conectar à API de desafios.",
        type: "error",
        difficulty: "none"
      }]
    };
  }
}