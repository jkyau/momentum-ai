"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useNoteStore } from "@/lib/store";
import { Note } from "@/lib/store";

interface FullPageEditorProps {
  existingNote?: Note;
}

export function FullPageEditor({ existingNote }: FullPageEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(existingNote?.title || "");
  const [text, setText] = useState(existingNote?.text || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addNote, updateNote } = useNoteStore();

  // Auto-focus the title input when the component mounts
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  // Track changes to mark as unsaved
  useEffect(() => {
    if (title !== (existingNote?.title || "") || text !== (existingNote?.text || "")) {
      setIsSaved(false);
    }
  }, [title, text, existingNote]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save with Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (title.trim() && text.trim() && !isSaved) {
          handleSave();
        }
      }
      
      // Exit with Escape
      if (e.key === "Escape") {
        handleBack();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener("keydown", handleKeyDown as any);
      return () => window.removeEventListener("keydown", handleKeyDown as any);
    }
  }, [title, text, isSaved, isSubmitting]);

  // Handle tab key in textarea
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      
      // Insert tab at cursor position
      const newText = text.substring(0, start) + "  " + text.substring(end);
      setText(newText);
      
      // Move cursor after the inserted tab
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Auto-format markdown while typing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    
    // Auto-formatting could be added here in future iterations
  };

  const handleSave = async () => {
    if (!title.trim() || !text.trim()) {
      toast.error("Please provide both a title and content for your note.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (existingNote) {
        // Update existing note
        const response = await fetch(`/api/notes/${existingNote.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            text,
          }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to update note");
        }
        
        const updatedNote = await response.json();
        updateNote(existingNote.id, updatedNote);
        toast.success("Note updated successfully!");
      } else {
        // Create new note
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
        addNote(note);
        toast.success("Note created successfully!");
      }
      
      setIsSaved(true);
      setLastSavedAt(new Date());
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (!isSaved && typeof window !== 'undefined') {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?");
      if (!confirmed) return;
    }
    router.push("/dashboard/notes");
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      {/* Minimal header */}
      <div className="border-b p-4 flex items-center justify-between bg-background">
        <button
          onClick={handleBack}
          className="p-2 rounded-md hover:bg-muted transition-colors flex items-center gap-2"
          aria-label="Back to notes"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        
        <div className="flex items-center gap-4">
          {lastSavedAt && (
            <span className="text-sm text-muted-foreground">
              Last saved: {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
          <span className={`text-sm ${isSaved ? 'text-green-500' : 'text-yellow-500'}`}>
            {isSaved ? 'Saved' : 'Unsaved'}
          </span>
          <button
            onClick={handleSave}
            className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            disabled={isSubmitting || !title.trim() || !text.trim()}
            aria-label="Save note"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <>
                <Save size={18} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Full-page editor */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto w-full p-4 md:p-8 h-full flex flex-col">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-3xl font-bold w-full px-0 py-2 border-0 border-b border-border/50 focus:outline-none focus:ring-0 focus:border-primary bg-transparent mb-4"
            placeholder="Untitled Note"
            disabled={isSubmitting}
          />
          
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className="flex-1 w-full px-0 py-2 border-0 focus:outline-none focus:ring-0 bg-transparent resize-none font-medium text-lg min-h-[calc(100vh-200px)]"
            placeholder="Start typing your note here..."
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
} 