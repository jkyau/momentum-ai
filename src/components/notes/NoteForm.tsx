"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useNoteStore } from "@/lib/store";
import { FileText, Plus } from "lucide-react";

export const NoteForm = () => {
  const router = useRouter();
  const { user } = useUser();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Note title is required");
      return;
    }
    
    if (!text.trim()) {
      toast.error("Note content is required");
      return;
    }
    
    if (!user) {
      toast.error("You must be signed in to create a note");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          text,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create note");
      }
      
      const note = await response.json();
      
      toast.success("Note created successfully");
      setTitle("");
      setText("");
      
      router.refresh();
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("Failed to create note");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Create Note</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="title" 
            className="block text-sm font-medium mb-1"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Enter note title..."
            aria-label="Note title"
          />
        </div>
        
        <div>
          <label 
            htmlFor="text" 
            className="block text-sm font-medium mb-1"
          >
            Content
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Enter your note content..."
            rows={8}
            aria-label="Note content"
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Create note"
        >
          {isLoading ? (
            "Creating..."
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>Create Note</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}; 