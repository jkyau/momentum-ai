"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore, useTaskStore, useNoteStore } from "@/lib/store";
import { Send, Loader2, Trash2, Bot, CheckCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { ChatHistory } from "./ChatHistory";

// Define available AI model providers
const AI_PROVIDERS = {
  OPENAI: "OPENAI",
  OLLAMA: "OLLAMA",
};

export const ChatInterface = () => {
  const { messages, addMessage, clearMessages } = useChatStore();
  const { tasks, setTasks, addTask, updateTask, deleteTask } = useTaskStore();
  const { notes, setNotes, addNote, updateNote, deleteNote } = useNoteStore();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actionPerformed, setActionPerformed] = useState<string | null>(null);
  const [modelProvider, setModelProvider] = useState<string>(
    localStorage.getItem("preferredModelProvider") || AI_PROVIDERS.OPENAI
  );
  const [showModelSelector, setShowModelSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Save preferred model provider to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("preferredModelProvider", modelProvider);
  }, [modelProvider]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Clear action performed message after 3 seconds
  useEffect(() => {
    if (actionPerformed) {
      const timer = setTimeout(() => {
        setActionPerformed(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [actionPerformed]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setInput("");
    
    // Add user message to chat
    addMessage({ role: "user", content: userMessage });
    
    setIsLoading(true);
    
    try {
      // Send message to API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: userMessage,
          modelProvider: modelProvider
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Check for specific error types
        if (data.code === "insufficient_quota" || (data.message && data.message.includes("quota"))) {
          // If OpenAI quota is exceeded, suggest switching to open source model
          if (data.suggestOllama && modelProvider === AI_PROVIDERS.OPENAI) {
            const switchToOllama = window.confirm(
              "OpenAI API quota exceeded. Would you like to switch to the open source model instead?"
            );
            
            if (switchToOllama) {
              setModelProvider(AI_PROVIDERS.OLLAMA);
              throw new Error("Switching to open source model. Please try your request again.");
            } else {
              throw new Error("OpenAI API quota exceeded. Please check your billing details or try again later.");
            }
          } else {
            throw new Error("OpenAI API quota exceeded. Please check your billing details or try again later.");
          }
        } else {
          throw new Error(data.message || "Failed to send message");
        }
      }
      
      // Add assistant message to chat
      addMessage({ role: "assistant", content: data.message });
      
      // Handle action if present
      if (data.action) {
        await handleAction(data.action);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      
      // Add error message to chat
      addMessage({
        role: "assistant",
        content: error instanceof Error && error.message.includes("quota") 
          ? "I'm sorry, the AI service is currently unavailable due to quota limitations. Please try again later or contact support."
          : error instanceof Error && error.message.includes("switching") 
            ? "I've switched to using the open source model. Please try your request again."
            : "I'm sorry, I encountered an error processing your request. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAction = async (action: any) => {
    try {
      switch (action.type) {
        case "CREATE_TASK":
          // Make API request to create task
          const taskResponse = await fetch("/api/tasks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: action.text,
              priority: action.priority || "MEDIUM",
              project: action.project,
              dueDate: action.dueDate ? new Date(action.dueDate).toISOString() : null,
            }),
          });
          
          if (!taskResponse.ok) {
            throw new Error("Failed to create task");
          }
          
          // Update local state
          const newTask = await taskResponse.json();
          addTask(newTask);
          
          setActionPerformed("Task created successfully");
          break;
          
        case "UPDATE_TASK":
          // Make API request to update task
          const updateTaskResponse = await fetch(`/api/tasks/${action.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: action.text,
              priority: action.priority,
              project: action.project,
              dueDate: action.dueDate ? new Date(action.dueDate).toISOString() : undefined,
              completed: action.completed,
            }),
          });
          
          if (!updateTaskResponse.ok) {
            throw new Error("Failed to update task");
          }
          
          // Update local state
          updateTask(action.id, {
            text: action.text,
            priority: action.priority,
            project: action.project,
            dueDate: action.dueDate,
            completed: action.completed,
          });
          
          setActionPerformed("Task updated successfully");
          break;
          
        case "DELETE_TASK":
          // Make API request to delete task
          const deleteTaskResponse = await fetch(`/api/tasks/${action.id}`, {
            method: "DELETE",
          });
          
          if (!deleteTaskResponse.ok) {
            throw new Error("Failed to delete task");
          }
          
          // Update local state
          deleteTask(action.id);
          
          setActionPerformed("Task deleted successfully");
          break;
          
        case "CREATE_NOTE":
          // Make API request to create note
          const noteResponse = await fetch("/api/notes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: action.title,
              text: action.text,
            }),
          });
          
          if (!noteResponse.ok) {
            throw new Error("Failed to create note");
          }
          
          // Update local state with the complete note object from the response
          const newNote = await noteResponse.json();
          addNote(newNote);
          
          setActionPerformed("Note created successfully");
          break;
          
        case "UPDATE_NOTE":
          // Make API request to update note
          const updateNoteResponse = await fetch(`/api/notes/${action.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: action.title,
              text: action.text,
            }),
          });
          
          if (!updateNoteResponse.ok) {
            throw new Error("Failed to update note");
          }
          
          // Update local state
          updateNote(action.id, {
            title: action.title,
            text: action.text,
          });
          
          setActionPerformed("Note updated successfully");
          break;
          
        case "DELETE_NOTE":
          // Make API request to delete note
          const deleteNoteResponse = await fetch(`/api/notes/${action.id}`, {
            method: "DELETE",
          });
          
          if (!deleteNoteResponse.ok) {
            throw new Error("Failed to delete note");
          }
          
          // Update local state
          deleteNote(action.id);
          
          setActionPerformed("Note deleted successfully");
          break;
      }
    } catch (error) {
      console.error("Error handling action:", error);
    }
  };
  
  const handleClearChat = () => {
    clearMessages();
    toast.success("Chat history cleared");
  };
  
  const handleSelectPrompt = (prompt: string) => {
    setInput(prompt);
  };
  
  const toggleModelSelector = () => {
    setShowModelSelector(!showModelSelector);
  };
  
  const handleModelChange = (provider: string) => {
    setModelProvider(provider);
    setShowModelSelector(false);
    toast.success(`Switched to ${provider === AI_PROVIDERS.OPENAI ? "OpenAI" : "open source"} model`);
  };
  
  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <Bot size={48} className="text-primary mb-4" />
            <h3 className="text-xl font-medium mb-2">How can I help you today?</h3>
            <p className="text-muted-foreground max-w-md mb-8">
              Ask me to create tasks, search your notes, or answer questions about your data.
              I can also help you organize your workflow and provide insights.
            </p>
            
            <div className="w-full max-w-md space-y-4">
              <SuggestedPrompts onSelectPrompt={handleSelectPrompt} />
              <ChatHistory />
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-muted">
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <p>Thinking...</p>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Action performed notification */}
      {actionPerformed && (
        <div className="bg-green-100 dark:bg-green-900 p-2 flex items-center justify-center">
          <CheckCircle className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-800 dark:text-green-300">{actionPerformed}</p>
        </div>
      )}
      
      {/* Input form */}
      <div className="border-t p-4">
        {messages.length > 0 && (
          <div className="mb-4 space-y-4">
            <SuggestedPrompts onSelectPrompt={handleSelectPrompt} />
            <ChatHistory />
          </div>
        )}
        
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handleClearChat}
            className="text-sm flex items-center text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Clear chat history"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </button>
          
          <div className="relative">
            <button
              onClick={toggleModelSelector}
              className="text-sm flex items-center text-muted-foreground hover:text-primary transition-colors"
              aria-label="AI model settings"
            >
              <Settings className="h-4 w-4 mr-1" />
              {modelProvider === AI_PROVIDERS.OPENAI ? "OpenAI" : "Open Source"}
            </button>
            
            {showModelSelector && (
              <div className="absolute right-0 bottom-8 bg-background border rounded-md shadow-md p-2 z-10 w-40">
                <button
                  onClick={() => handleModelChange(AI_PROVIDERS.OPENAI)}
                  className={`w-full text-left px-2 py-1 rounded-sm text-sm ${
                    modelProvider === AI_PROVIDERS.OPENAI
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  OpenAI (Paid)
                </button>
                <button
                  onClick={() => handleModelChange(AI_PROVIDERS.OLLAMA)}
                  className={`w-full text-left px-2 py-1 rounded-sm text-sm ${
                    modelProvider === AI_PROVIDERS.OLLAMA
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  Open Source (Free)
                </button>
              </div>
            )}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={isLoading}
            aria-label="Message input"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}; 