import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
  timestamp?: Date;
}

export const MessageBubble = ({ message, isUser, timestamp }: MessageBubbleProps) => {
  return (
    <div
      className={cn(
        "message-fade-in flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
          isUser
            ? "bg-chat-user-bg text-chat-user-fg"
            : "bg-chat-bot-bg text-chat-bot-fg"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ node, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match;
                  
                  return isInline ? (
                    <code
                      className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <code
                      className={cn("block rounded-lg bg-muted p-4 font-mono text-sm", className)}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <div className="my-2">{children}</div>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              }}
            >
              {message}
            </ReactMarkdown>
          </div>
        )}
        {timestamp && (
          <p className="mt-1 text-xs opacity-60">
            {timestamp.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
};
