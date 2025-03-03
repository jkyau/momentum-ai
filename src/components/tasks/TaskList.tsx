"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useTaskStore } from "@/lib/store";
import { Task } from "@/lib/store";
import { 
  Calendar, 
  CheckSquare, 
  Edit, 
  Trash2, 
  Square, 
  AlertCircle, 
  Tag,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

export const TaskList = () => {
  const router = useRouter();
  const { user } = useUser();
  const { tasks, setTasks } = useTaskStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "COMPLETED" | "ACTIVE">("ALL");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "createdAt">("dueDate");
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/tasks");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `Failed to fetch tasks (Status: ${response.status})`;
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setTasks(data);
      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch tasks";
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Implement retry logic
      if (retryCount < MAX_RETRIES) {
        const nextRetry = retryCount + 1;
        setRetryCount(nextRetry);
        toast.info(`Retrying in 3 seconds (Attempt ${nextRetry}/${MAX_RETRIES})...`);
        
        setTimeout(() => {
          fetchTasks();
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);
  
  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: !completed }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update task");
      }
      
      const updatedTask = await response.json();
      
      setTasks(
        tasks.map((task) => (task.id === id ? { ...task, completed: !completed } : task))
      );
      
      toast.success(`Task marked as ${!completed ? "completed" : "active"}`);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };
  
  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete task");
      }
      
      setTasks(tasks.filter((task) => task.id !== id));
      toast.success("Task deleted successfully");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };
  
  const filteredTasks = tasks.filter((task) => {
    if (filter === "ALL") return true;
    if (filter === "COMPLETED") return task.completed;
    if (filter === "ACTIVE") return !task.completed;
    return true;
  });
  
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "dueDate") {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    
    if (sortBy === "priority") {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    
    // Default: sort by createdAt
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "text-red-500";
      case "MEDIUM":
        return "text-yellow-500";
      case "LOW":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };
  
  if (loading) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Tasks</h2>
        </div>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Tasks</h2>
        </div>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="border rounded-lg p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-semibold">Tasks</h2>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "ALL" | "COMPLETED" | "ACTIVE")}
            className="rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Filter tasks"
          >
            <option value="ALL">All Tasks</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "dueDate" | "priority" | "createdAt")}
            className="rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Sort tasks"
          >
            <option value="dueDate">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="createdAt">Sort by Created Date</option>
          </select>
        </div>
      </div>
      
      {sortedTasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No tasks found. Create your first task to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedTasks.map((task) => (
            <div 
              key={task.id} 
              className={`border rounded-md p-4 transition-colors ${
                task.completed ? "bg-muted/50" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleToggleComplete(task.id, task.completed)}
                  className="mt-1 text-primary hover:text-primary/80 transition-colors"
                  aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                >
                  {task.completed ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
                
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 
                      className={`font-medium ${
                        task.completed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {task.text}
                    </h3>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)} bg-opacity-10`}>
                        {task.priority}
                      </span>
                      
                      <button
                        onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Edit task"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                        aria-label="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {task.project && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        <span>{task.project}</span>
                      </div>
                    )}
                    
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(task.dueDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {task.cleanedText && task.cleanedText !== task.text && (
                    <div className="mt-2 text-sm border-l-2 border-primary pl-2 italic">
                      <p className="text-muted-foreground">AI Enhanced: {task.cleanedText}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 