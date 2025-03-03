"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useNoteStore } from "@/lib/store";
import { Note } from "@/lib/store";
import { 
  FileText, 
  Edit, 
  Trash2, 
  Clock, 
  Search 
} from "lucide-react";
import { format } from "date-fns";

export const NoteList = () => {
  const router = useRouter();
  const { user } = useUser();
  const { notes, setNotes } = useNoteStore();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "title">("createdAt");
  
  useEffect(() => {
    const fetchNotes = async () => {
      if (!user) return;
      
      try {
        const response = await fetch("/api/notes");
        
        if (!response.ok) {
          throw new Error("Failed to fetch notes");
        }
        
        const data = await response.json();
        setNotes(data);
      } catch (error) {
        console.error("Error fetching notes:", error);
        toast.error("Failed to load notes");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNotes();
  }, [user, setNotes]);
  
  const handleDeleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete note");
      }
      
      setNotes(notes.filter((note) => note.id !== id));
      toast.success("Note deleted successfully");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };
  
  const filteredNotes = notes.filter((note) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.text.toLowerCase().includes(query)
    );
  });
  
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    
    // Default: sort by createdAt (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  if (isLoading) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Notes</h2>
        </div>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="border rounded-lg p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-semibold">Notes</h2>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Search notes"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "createdAt" | "title")}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Sort notes"
          >
            <option value="createdAt">Sort by Date</option>
            <option value="title">Sort by Title</option>
          </select>
        </div>
      </div>
      
      {sortedNotes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No notes found. Create your first note to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedNotes.map((note) => (
            <div 
              key={note.id} 
              className="border rounded-md p-4 transition-colors hover:bg-muted/20"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-medium truncate">{note.title}</h3>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                    aria-label="Edit note"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-md hover:bg-muted"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-2 text-sm text-muted-foreground line-clamp-3">
                {note.text}
              </div>
              
              {note.summary && (
                <div className="mt-2 text-xs border-l-2 border-primary pl-2 italic">
                  <p className="text-muted-foreground line-clamp-2">
                    <span className="font-medium">AI Summary:</span> {note.summary}
                  </p>
                </div>
              )}
              
              <div className="mt-3 flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                <span>{format(new Date(note.createdAt), "MMM d, yyyy")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 