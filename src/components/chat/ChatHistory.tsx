"use client";

import { useState, useEffect } from "react";
import { useChatStore } from "@/lib/store";
import { Clock, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ChatSession {
  id: string;
  date: Date;
  preview: string;
}

export const ChatHistory = () => {
  const [expanded, setExpanded] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { clearMessages, addMessage } = useChatStore();
  
  // Fetch chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!expanded) return;
      
      setIsLoading(true);
      
      try {
        const response = await fetch("/api/chat/history");
        
        if (!response.ok) {
          throw new Error("Failed to fetch chat history");
        }
        
        const data = await response.json();
        
        // Group chat logs by date
        const groupedSessions: ChatSession[] = [];
        const dateMap = new Map<string, { messages: { query: string; response: string }[]; date: Date }>();
        
        data.forEach((log: any) => {
          const date = new Date(log.createdAt);
          const dateKey = format(date, "yyyy-MM-dd");
          
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { messages: [], date });
          }
          
          dateMap.get(dateKey)?.messages.push({
            query: log.query,
            response: log.response,
          });
        });
        
        // Convert map to array and sort by date
        dateMap.forEach((value, key) => {
          groupedSessions.push({
            id: key,
            date: value.date,
            preview: value.messages[0].query,
          });
        });
        
        // Sort by date (newest first)
        groupedSessions.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        setSessions(groupedSessions);
      } catch (error) {
        console.error("Error fetching chat history:", error);
        toast.error("Failed to fetch chat history");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchChatHistory();
  }, [expanded]);
  
  const handleLoadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/history/${sessionId}`);
      
      if (!response.ok) {
        throw new Error("Failed to load chat session");
      }
      
      const data = await response.json();
      
      // Clear current messages
      clearMessages();
      
      // Add messages from session
      data.forEach((log: any) => {
        addMessage({ role: "user", content: log.query });
        addMessage({ role: "assistant", content: log.response });
      });
      
      toast.success("Chat session loaded");
      setExpanded(false);
    } catch (error) {
      console.error("Error loading chat session:", error);
      toast.error("Failed to load chat session");
    }
  };
  
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const response = await fetch(`/api/chat/history/${sessionId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete chat session");
      }
      
      // Remove session from list
      setSessions(sessions.filter((session) => session.id !== sessionId));
      
      toast.success("Chat session deleted");
    } catch (error) {
      console.error("Error deleting chat session:", error);
      toast.error("Failed to delete chat session");
    }
  };
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
        aria-label={expanded ? "Hide chat history" : "Show chat history"}
      >
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          <span className="font-medium">Chat History</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      
      {expanded && (
        <div className="p-3 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>Loading chat history...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>No chat history found</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {sessions.map((session) => (
                <li key={session.id}>
                  <button
                    onClick={() => handleLoadSession(session.id)}
                    className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between"
                    aria-label={`Load chat session from ${format(session.date, "MMMM d, yyyy")}`}
                  >
                    <div>
                      <p className="font-medium">{format(session.date, "MMMM d, yyyy")}</p>
                      <p className="text-sm text-muted-foreground truncate">{session.preview}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-1 rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      aria-label={`Delete chat session from ${format(session.date, "MMMM d, yyyy")}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}; 