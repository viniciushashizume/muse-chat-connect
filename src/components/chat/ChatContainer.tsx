import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { LoadingIndicator } from "./LoadingIndicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot } from "lucide-react";

// TODO: Replace this with your actual API endpoint
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/chat";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export const ChatContainer = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Olá! Sou seu assistente com RAG. Como posso ajudá-lo hoje?",
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (messageContent: string) => {
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      role: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // TODO: API Integration Point
      // Uncomment this when your Python API is ready:
      /*
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageContent }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from API");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: "assistant",
        timestamp: new Date(),
      };
      */

      // MOCK RESPONSE for testing (remove this when API is ready)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Você disse: "${messageContent}"\n\nEsta é uma resposta simulada. Quando conectar à API Python, vou processar sua mensagem usando RAG e retornar respostas reais baseadas em conhecimento.\n\n**Exemplo de código:**\n\`\`\`python\ndef process_rag_query(query: str) -> str:\n    # Your RAG logic here\n    return response\n\`\`\``,
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-chat">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Assistente RAG</h1>
              <p className="text-sm text-muted-foreground">
                Powered by LLM + Retrieval-Augmented Generation
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message.content}
                isUser={message.role === "user"}
                timestamp={message.timestamp}
              />
            ))}
            {isLoading && <LoadingIndicator />}
            <div ref={bottomRef} />
          </div>
        </div>
      </ScrollArea>

      {/* Input Area */}
      <MessageInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </div>
  );
};
