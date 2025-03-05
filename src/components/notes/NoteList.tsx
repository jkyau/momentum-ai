"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Edit, Trash2, Loader2, FileText, Plus } from "lucide-react";
import { useNoteStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export const NoteList = () => {
  const { notes, setNotes, deleteNote } = useNoteStore();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "title">("createdAt");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch("/api/notes");
        
        if (!response.ok) {
          throw new Error("Failed to fetch notes");
        }
        
        const data = await response.json();
        setNotes(data);
      } catch (error) {
        console.error("Error fetching notes:", error);
        toast.error("Failed to load notes. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNotes();
  }, [setNotes]);
  
  const handleDeleteNote = async (id: string) => {
    setIsDeleting(id);
    
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete note");
      }
      
      deleteNote(id);
      toast.success("Note deleted successfully!");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleNoteClick = (id: string) => {
    router.push(`/dashboard/notes/${id}`);
  };
  
  const filteredNotes = notes
    .filter((note) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        note.title.toLowerCase().includes(searchLower) ||
        note.text.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortBy === "createdAt") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return a.title.localeCompare(b.title);
      }
    });
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Search notes"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "createdAt" | "title")}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Sort notes"
          >
            <option value="createdAt">Sort by Date</option>
            <option value="title">Sort by Title</option>
          </select>
          
          <Link
            href="/dashboard/notes/new"
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            <span className="sr-only sm:not-sr-only">New Note</span>
          </Link>
        </div>
      </div>
      
      {filteredNotes.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No notes found</h3>
          <p className="text-muted-foreground mb-6">Create your first note to get started.</p>
          <Link
            href="/dashboard/notes/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            <span>Create Note</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <div 
              key={note.id} 
              className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => handleNoteClick(note.id)}
            >
              <div className="p-4">
                <h3 className="font-medium text-lg mb-2 line-clamp-1">{note.title}</h3>
                <p className="text-muted-foreground text-sm line-clamp-3">{note.text}</p>
              </div>
              <div className="bg-muted/50 px-4 py-2 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/notes/${note.id}`);
                    }}
                    className="p-1 rounded-md hover:bg-background transition-colors"
                    aria-label={`Edit note: ${note.title}`}
                  >
                    <Edit size={14} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Are you sure you want to delete this note?")) {
                        handleDeleteNote(note.id);
                      }
                    }}
                    className="p-1 rounded-md hover:bg-background transition-colors"
                    aria-label={`Delete note: ${note.title}`}
                    disabled={isDeleting === note.id}
                  >
                    {isDeleting === note.id ? (
                      <Loader2 size={14} className="animate-spin text-muted-foreground" />
                    ) : (
                      <Trash2 size={14} className="text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 