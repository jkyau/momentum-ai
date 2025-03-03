"use client";

import { toast } from "sonner";
import { useTaskStore, useNoteStore } from "@/lib/store";

// Define action types
export type ChatAction = 
  | { type: "CREATE_TASK"; text: string; priority?: "HIGH" | "MEDIUM" | "LOW"; project?: string; dueDate?: string }
  | { type: "UPDATE_TASK"; id: string; text?: string; priority?: "HIGH" | "MEDIUM" | "LOW"; project?: string; dueDate?: string; completed?: boolean }
  | { type: "DELETE_TASK"; id: string }
  | { type: "CREATE_NOTE"; title: string; text: string }
  | { type: "UPDATE_NOTE"; id: string; title?: string; text?: string }
  | { type: "DELETE_NOTE"; id: string };

// Function to execute chat actions
export const executeChatAction = async (action: ChatAction): Promise<{ success: boolean; message: string }> => {
  try {
    switch (action.type) {
      case "CREATE_TASK": {
        const response = await fetch("/api/tasks", {
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
        
        if (!response.ok) {
          throw new Error("Failed to create task");
        }
        
        const task = await response.json();
        toast.success("Task created successfully");
        return { success: true, message: "Task created successfully" };
      }
      
      case "UPDATE_TASK": {
        const response = await fetch(`/api/tasks/${action.id}`, {
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
        
        if (!response.ok) {
          throw new Error("Failed to update task");
        }
        
        const task = await response.json();
        toast.success("Task updated successfully");
        return { success: true, message: "Task updated successfully" };
      }
      
      case "DELETE_TASK": {
        const response = await fetch(`/api/tasks/${action.id}`, {
          method: "DELETE",
        });
        
        if (!response.ok) {
          throw new Error("Failed to delete task");
        }
        
        toast.success("Task deleted successfully");
        return { success: true, message: "Task deleted successfully" };
      }
      
      case "CREATE_NOTE": {
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: action.title,
            text: action.text,
          }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to create note");
        }
        
        const note = await response.json();
        
        // Get the note store and add the new note
        const { addNote } = useNoteStore.getState();
        addNote(note);
        
        toast.success("Note created successfully");
        return { success: true, message: "Note created successfully" };
      }
      
      case "UPDATE_NOTE": {
        const response = await fetch(`/api/notes/${action.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: action.title,
            text: action.text,
          }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to update note");
        }
        
        const note = await response.json();
        
        // Get the note store and update the note
        const { updateNote } = useNoteStore.getState();
        updateNote(action.id, note);
        
        toast.success("Note updated successfully");
        return { success: true, message: "Note updated successfully" };
      }
      
      case "DELETE_NOTE": {
        const response = await fetch(`/api/notes/${action.id}`, {
          method: "DELETE",
        });
        
        if (!response.ok) {
          throw new Error("Failed to delete note");
        }
        
        // Get the note store and delete the note
        const { deleteNote } = useNoteStore.getState();
        deleteNote(action.id);
        
        toast.success("Note deleted successfully");
        return { success: true, message: "Note deleted successfully" };
      }
      
      default:
        return { success: false, message: "Unknown action type" };
    }
  } catch (error) {
    console.error("Error executing chat action:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    toast.error(errorMessage);
    return { success: false, message: errorMessage };
  }
}; 