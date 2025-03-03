"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useTaskStore } from "@/lib/store";
import { Calendar, CheckSquare, Plus, Loader2 } from "lucide-react";

export const TaskForm = () => {
  const router = useRouter();
  const { user } = useUser();
  const { addTask } = useTaskStore();
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [project, setProject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      toast.error("Task text is required");
      return;
    }
    
    if (!user) {
      toast.error("You must be signed in to create a task");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          priority,
          project: project || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `Failed to create task (Status: ${response.status})`;
        throw new Error(errorMessage);
      }
      
      const task = await response.json();
      
      // Update local state with the new task
      addTask(task);
      
      toast.success("Task created successfully");
      setText("");
      setPriority("MEDIUM");
      setProject("");
      setDueDate("");
      
      router.refresh();
    } catch (error) {
      console.error("Error creating task:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create task";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Create Task</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="text" 
            className="block text-sm font-medium mb-1"
          >
            Task
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Enter your task..."
            rows={3}
            aria-label="Task description"
          />
        </div>
        
        <div>
          <label 
            htmlFor="priority" 
            className="block text-sm font-medium mb-1"
          >
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Task priority"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        
        <div>
          <label 
            htmlFor="project" 
            className="block text-sm font-medium mb-1"
          >
            Project (Optional)
          </label>
          <input
            id="project"
            type="text"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Enter project name..."
            aria-label="Project name"
          />
        </div>
        
        <div>
          <label 
            htmlFor="dueDate" 
            className="block text-sm font-medium mb-1"
          >
            Due Date (Optional)
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Due date"
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Create task"
        >
          {isLoading ? (
            "Creating..."
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}; 