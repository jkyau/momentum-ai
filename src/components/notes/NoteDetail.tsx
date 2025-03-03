"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pencil, Save, Trash } from "lucide-react";

interface Note {
  id: string;
  title: string;
  text: string;
  summary?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface NoteDetailProps {
  note: Note;
}

export function NoteDetail({ note }: NoteDetailProps) {
  const router = useRouter();
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [text, setText] = useState(note.text);
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !text.trim()) {
      toast.error("Title and content are required");
      return;
    }

    if (!user) {
      toast.error("You must be signed in to update a note");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/notes/${note.id}`, {
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

      toast.success("Note updated successfully");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) {
      toast.error("You must be signed in to delete a note");
      return;
    }

    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      toast.success("Note deleted successfully");
      router.push("/dashboard/notes");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full border rounded-lg shadow-sm overflow-hidden">
      <div className="flex flex-row items-center justify-between p-4 border-b">
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            className="font-semibold text-xl w-full px-2 py-1 border rounded"
            placeholder="Note Title"
          />
        ) : (
          <h2 className="text-2xl font-semibold">{note.title}</h2>
        )}
        <div className="flex space-x-2">
          {isEditing ? (
            <button 
              onClick={handleSave} 
              disabled={isLoading}
              className="flex items-center px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </>
              )}
            </button>
          ) : (
            <button 
              onClick={handleEdit} 
              className="flex items-center px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </button>
          )}
          <button 
            onClick={handleDelete} 
            className="flex items-center px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            disabled={isDeleting}
          >
            <Trash className="h-4 w-4 mr-1" />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
      <div className="p-4">
        {isEditing ? (
          <textarea
            value={text}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
            className="w-full min-h-[200px] p-2 border rounded"
            placeholder="Note content..."
          />
        ) : (
          <div className="whitespace-pre-wrap">{note.text}</div>
        )}
        
        {note.summary && !isEditing && (
          <div className="mt-6 p-4 bg-gray-100 rounded-md">
            <h3 className="text-sm font-medium mb-2">Summary</h3>
            <p className="text-sm text-gray-600">{note.summary}</p>
          </div>
        )}
      </div>
      <div className="px-4 py-3 text-xs text-gray-500 border-t">
        <div>
          Created: {format(new Date(note.createdAt), "PPP")}
          {note.updatedAt > note.createdAt && (
            <span className="ml-4">
              Updated: {format(new Date(note.updatedAt), "PPP")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 