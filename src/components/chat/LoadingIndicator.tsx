export const LoadingIndicator = () => {
  return (
    <div className="message-fade-in flex w-full justify-start">
      <div className="max-w-[80%] rounded-2xl bg-chat-bot-bg px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="typing-indicator flex gap-1">
            <span className="block h-2 w-2 rounded-full bg-muted-foreground"></span>
            <span className="block h-2 w-2 rounded-full bg-muted-foreground animation-delay-200"></span>
            <span className="block h-2 w-2 rounded-full bg-muted-foreground animation-delay-400"></span>
          </div>
          <span className="text-sm text-muted-foreground">O assistente está pensando...</span>
        </div>
      </div>
    </div>
  );
};
