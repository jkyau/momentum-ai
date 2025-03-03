"use client";

import { ChatInterface } from "@/components/chat/ChatInterface";

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">AI Assistant</h1>
        <p className="text-muted-foreground">
          Chat with your AI assistant to manage tasks, search notes, and get help with your workflow.
        </p>
      </div>
      
      <div className="flex-1 min-h-0">
        <ChatInterface />
      </div>
    </div>
  );
} 