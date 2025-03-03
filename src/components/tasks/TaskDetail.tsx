"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, CheckSquare, Square, Tag, Clock } from "lucide-react";
import { Task } from "@/lib/store";

interface TaskDetailProps {
  task: Task;
}

export const TaskDetail = ({ task }: TaskDetailProps) => {
  const router = useRouter();
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    text: task.text,
    priority: task.priority,
    project: task.project || "",
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
    completed: task.completed,
  });

  const handleToggleComplete = async () => {
    if (!user) {
      toast.error("You must be signed in to update tasks");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: !task.completed }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      toast.success(`Task marked as ${!task.completed ? "completed" : "active"}`);
      router.refresh();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!user) {
      toast.error("You must be signed in to delete tasks");
      return;
    }

    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      toast.success("Task deleted successfully");
      router.push("/dashboard/tasks");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: target.checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be signed in to update tasks");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: formData.text,
          priority: formData.priority,
          project: formData.project || null,
          dueDate: formData.dueDate || null,
          completed: formData.completed,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      toast.success("Task updated successfully");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "text-red-500 bg-red-50";
      case "MEDIUM":
        return "text-yellow-500 bg-yellow-50";
      case "LOW":
        return "text-green-500 bg-green-50";
      default:
        return "text-gray-500 bg-gray-50";
    }
  };

  if (isEditing) {
    return (
      <div className="border rounded-lg p-6 bg-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="text" className="text-sm font-medium">
              Task Description
            </label>
            <textarea
              id="text"
              name="text"
              value={formData.text}
              onChange={handleInputChange}
              className="w-full min-h-[100px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter task description"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="priority" className="text-sm font-medium">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="project" className="text-sm font-medium">
                Project (Optional)
              </label>
              <input
                type="text"
                id="project"
                name="project"
                value={formData.project}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter project name"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="dueDate" className="text-sm font-medium">
                Due Date (Optional)
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center space-x-2 h-full pt-6">
              <input
                type="checkbox"
                id="completed"
                name="completed"
                checked={formData.completed}
                onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                disabled={isLoading}
              />
              <label htmlFor="completed" className="text-sm font-medium">
                Mark as completed
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border rounded-md hover:bg-gray-100 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-card">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <button
            onClick={handleToggleComplete}
            className="mt-1 text-primary hover:text-primary/80 transition-colors"
            disabled={isLoading}
            aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
          >
            {task.completed ? (
              <CheckSquare className="h-6 w-6" />
            ) : (
              <Square className="h-6 w-6" />
            )}
          </button>
          
          <div>
            <h2 
              className={`text-xl font-semibold ${
                task.completed ? "line-through text-muted-foreground" : ""
              }`}
            >
              {task.text}
            </h2>
            
            {task.cleanedText && task.cleanedText !== task.text && (
              <div className="mt-2 text-sm border-l-2 border-primary pl-2 italic">
                <p className="text-muted-foreground">AI Enhanced: {task.cleanedText}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 transition-colors"
            disabled={isLoading}
          >
            Edit
          </button>
          <button
            onClick={handleDeleteTask}
            className="px-3 py-1 text-sm border border-destructive text-destructive rounded-md hover:bg-destructive/10 transition-colors"
            disabled={isLoading}
          >
            Delete
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Status</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              task.completed ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
            }`}>
              {task.completed ? "Completed" : "Active"}
            </span>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Priority</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          </div>
          
          {task.project && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Project</h3>
              <div className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                <span>{task.project}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {task.dueDate && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Due Date</h3>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(task.dueDate), "MMMM d, yyyy")}</span>
              </div>
            </div>
          )}
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Created</h3>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(task.createdAt), "MMMM d, yyyy")}</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Last Updated</h3>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(task.updatedAt), "MMMM d, yyyy")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 