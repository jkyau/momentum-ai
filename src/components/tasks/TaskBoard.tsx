"use client";

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { toast } from "sonner";
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Edit, 
  Trash2, 
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  X,
  Calendar,
  MoreHorizontal
} from "lucide-react";
import { useTaskStore, Task } from "@/lib/store";
import { format, isToday, isTomorrow, isAfter, isBefore, startOfDay } from "date-fns";
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Memoized Task Item component to prevent unnecessary re-renders
interface TaskItemProps {
  task: any;
  onToggleComplete: (id: string, completed: boolean) => void;
  onStartEdit: (task: any) => void;
  onDelete: (id: string) => void;
  isDeleting: string | null;
  showTaskActions: string | null;
  setShowTaskActions: (id: string | null) => void;
  taskActionsRef: React.RefObject<HTMLDivElement | null>;
  renderDueDate: (dueDate: string | null) => React.ReactNode;
}

const TaskItem = memo(({
  task,
  onToggleComplete,
  onStartEdit,
  onDelete,
  isDeleting,
  showTaskActions,
  setShowTaskActions,
  taskActionsRef,
  renderDueDate
}: TaskItemProps) => {
  return (
    <div 
      className={`group rounded-md border ${
        task.completed ? "bg-muted/30" : "bg-card"
      } hover:shadow-sm transition-shadow`}
    >
      <div className="p-3 flex items-start gap-3">
        <button
          onClick={() => onToggleComplete(task.id, task.completed)}
          className={`flex-shrink-0 mt-0.5 text-primary hover:text-primary/80 transition-colors ${
            task.completed ? "opacity-70" : ""
          }`}
          aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
        >
          {task.completed ? (
            <CheckCircle2 size={18} />
          ) : (
            <Circle size={18} />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${
            task.completed ? "line-through text-muted-foreground" : ""
          }`}>
            {task.text}
          </p>
          
          {renderDueDate(task.dueDate)}
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowTaskActions(showTaskActions === task.id ? null : task.id)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Task actions"
            aria-expanded={showTaskActions === task.id}
          >
            <MoreHorizontal size={16} className="text-muted-foreground" />
          </button>
          
          {showTaskActions === task.id && (
            <div 
              ref={taskActionsRef}
              className="absolute right-0 top-8 z-10 w-36 rounded-md border bg-popover shadow-md animate-in fade-in-0 zoom-in-95 duration-100"
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    onStartEdit(task);
                    setShowTaskActions(null);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <Edit size={14} />
                  <span>Edit</span>
                </button>
                
                <button
                  onClick={() => {
                    onDelete(task.id);
                    setShowTaskActions(null);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                  disabled={isDeleting === task.id}
                >
                  {isDeleting === task.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.text === nextProps.task.text &&
    prevProps.task.completed === nextProps.task.completed &&
    prevProps.task.dueDate === nextProps.task.dueDate &&
    prevProps.isDeleting === nextProps.isDeleting &&
    prevProps.showTaskActions === nextProps.showTaskActions &&
    (prevProps.showTaskActions !== prevProps.task.id || nextProps.showTaskActions !== nextProps.task.id)
  );
});

// Memoized Task Edit component
interface TaskEditProps {
  task: any;
  editText: string;
  setEditText: (text: string) => void;
  editDueDate: string | undefined;
  setEditDueDate: (date: string | undefined) => void;
  onSave: (id: string) => void;
  onCancel: () => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  handleKeyDown: (e: React.KeyboardEvent, id: string) => void;
}

const TaskEdit = memo(({
  task,
  editText,
  setEditText,
  editDueDate,
  setEditDueDate,
  onSave,
  onCancel,
  editInputRef,
  handleKeyDown
}: TaskEditProps) => {
  return (
    <div className="p-3 space-y-3">
      <input
        ref={editInputRef}
        type="text"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, task.id)}
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Edit task text"
      />
      
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={editDueDate || ""}
          onChange={(e) => setEditDueDate(e.target.value || undefined)}
          className="px-3 py-1.5 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Edit due date"
        />
        
        <div className="flex-1"></div>
        
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md border border-input bg-background hover:bg-muted transition-colors text-sm"
          aria-label="Cancel edit"
        >
          Cancel
        </button>
        
        <button
          onClick={() => onSave(task.id)}
          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
          disabled={!editText.trim()}
          aria-label="Save edit"
        >
          Save
        </button>
      </div>
    </div>
  );
});

// Memoized Task Group component for virtualized rendering
interface TaskGroupProps {
  group: string;
  tasks: Task[];
  isOverdue: boolean;
  isToday: boolean;
  editingTaskId: string | null;
  editText: string;
  setEditText: (text: string) => void;
  editDueDate: string | undefined;
  setEditDueDate: (date: string | undefined) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  handleKeyDown: (e: React.KeyboardEvent, id: string) => void;
  handleToggleComplete: (id: string, completed: boolean) => void;
  handleStartEdit: (task: any) => void;
  handleSaveEdit: (id: string) => void;
  handleCancelEdit: () => void;
  handleDeleteTask: (id: string) => void;
  isDeleting: string | null;
  showTaskActions: string | null;
  setShowTaskActions: (id: string | null) => void;
  taskActionsRef: React.RefObject<HTMLDivElement | null>;
  renderDueDate: (dueDate: string | null) => React.ReactNode;
  virtualizeItems: boolean;
}

const TaskGroup = memo(({
  group,
  tasks,
  isOverdue,
  isToday,
  editingTaskId,
  editText,
  setEditText,
  editDueDate,
  setEditDueDate,
  editInputRef,
  handleKeyDown,
  handleToggleComplete,
  handleStartEdit,
  handleSaveEdit,
  handleCancelEdit,
  handleDeleteTask,
  isDeleting,
  showTaskActions,
  setShowTaskActions,
  taskActionsRef,
  renderDueDate,
  virtualizeItems
}: TaskGroupProps) => {
  // Row renderer for virtualized list
  const rowRenderer = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {
    const task = tasks[index];
    
    if (editingTaskId === task.id) {
      return (
        <div style={style} key={task.id}>
          <div className="rounded-md border bg-card hover:shadow-sm transition-shadow">
            <TaskEdit
              task={task}
              editText={editText}
              setEditText={setEditText}
              editDueDate={editDueDate}
              setEditDueDate={setEditDueDate}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              editInputRef={editInputRef}
              handleKeyDown={handleKeyDown}
            />
          </div>
        </div>
      );
    }
    
    return (
      <div style={style} key={task.id}>
        <TaskItem
          task={task}
          onToggleComplete={handleToggleComplete}
          onStartEdit={handleStartEdit}
          onDelete={handleDeleteTask}
          isDeleting={isDeleting}
          showTaskActions={showTaskActions}
          setShowTaskActions={setShowTaskActions}
          taskActionsRef={taskActionsRef}
          renderDueDate={renderDueDate}
        />
      </div>
    );
  }, [
    tasks, 
    editingTaskId, 
    editText, 
    setEditText, 
    editDueDate, 
    setEditDueDate, 
    handleKeyDown, 
    handleToggleComplete, 
    handleStartEdit, 
    handleSaveEdit, 
    handleCancelEdit, 
    handleDeleteTask, 
    isDeleting, 
    showTaskActions, 
    setShowTaskActions, 
    taskActionsRef, 
    renderDueDate, 
    editInputRef
  ]);
  
  return (
    <div className="space-y-2">
      <h3 className={`text-sm font-medium px-2 ${
        isOverdue ? "text-red-500" : 
        isToday ? "text-blue-500" : 
        "text-muted-foreground"
      }`}>
        {group} {group !== "No Due Date" && `(${tasks.length})`}
      </h3>
      
      {virtualizeItems && tasks.length > 10 ? (
        <List
          height={Math.min(400, tasks.length * 60)} // Limit height
          itemCount={tasks.length}
          itemSize={60} // Approximate height of each task item
          width="100%"
          className="scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300"
        >
          {rowRenderer}
        </List>
      ) : (
        <div className="space-y-1">
          {tasks.map((task) => (
            editingTaskId === task.id ? (
              <div key={task.id} className="rounded-md border bg-card hover:shadow-sm transition-shadow">
                <TaskEdit
                  task={task}
                  editText={editText}
                  setEditText={setEditText}
                  editDueDate={editDueDate}
                  setEditDueDate={setEditDueDate}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  editInputRef={editInputRef}
                  handleKeyDown={handleKeyDown}
                />
              </div>
            ) : (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onStartEdit={handleStartEdit}
                onDelete={handleDeleteTask}
                isDeleting={isDeleting}
                showTaskActions={showTaskActions}
                setShowTaskActions={setShowTaskActions}
                taskActionsRef={taskActionsRef}
                renderDueDate={renderDueDate}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
});

export const TaskBoard = () => {
  // Core state
  const { tasks, setTasks, addTask, updateTask, deleteTask } = useTaskStore();
  const [isLoading, setIsLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editDueDate, setEditDueDate] = useState<string | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Filtering and sorting state
  const [searchInputValue, setSearchInputValue] = useState("");
  const searchQuery = useDebounce(searchInputValue, 300); // Debounce search for better performance
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, completed
  const [filterDue, setFilterDue] = useState("all"); // all, today, upcoming, overdue
  const [sortBy, setSortBy] = useState("dueDate"); // dueDate, createdAt
  const [sortDirection, setSortDirection] = useState("asc"); // asc, desc
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showTaskActions, setShowTaskActions] = useState<string | null>(null);
  const [isAddingDueDate, setIsAddingDueDate] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState<string | undefined>(undefined);
  
  // Performance optimization
  const [virtualizeGroups, setVirtualizeGroups] = useState(false);
  
  // Refs for focus management
  const newTaskInputRef = useRef<HTMLInputElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const taskActionsRef = useRef<HTMLDivElement | null>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  // Close task actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        taskActionsRef.current && 
        !taskActionsRef.current.contains(event.target as Node) &&
        showTaskActions
      ) {
        setShowTaskActions(null);
      }
      
      if (
        filtersRef.current && 
        !filtersRef.current.contains(event.target as Node) &&
        showFilters
      ) {
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTaskActions, showFilters]);

  // Handle escape key to close menus
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowTaskActions(null);
        setShowFilters(false);
        
        if (isAddingDueDate) {
          setIsAddingDueDate(false);
        }
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isAddingDueDate]);

  // Fetch tasks on component mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/tasks");
        
        if (!response.ok) {
          throw new Error("Failed to fetch tasks");
        }
        
        const data = await response.json();
        setTasks(data);
        
        // Enable virtualization for large task lists
        if (data.length > 50) {
          setVirtualizeGroups(true);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load tasks. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTasks();
  }, [setTasks]);

  // Create a new task - memoized to prevent unnecessary re-renders
  const handleCreateTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTaskText.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Create a temporary ID for optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const newTask: Task = {
      id: tempId,
      text: newTaskText,
      completed: false,
      dueDate: newTaskDueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority: "MEDIUM",
      userId: "temp-user" // This will be replaced by the server response
    };
    
    // Optimistic update
    addTask(newTask);
    setNewTaskText("");
    setNewTaskDueDate(undefined);
    setIsAddingDueDate(false);
    
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: newTask.text,
          dueDate: newTask.dueDate,
        }),
      });
      
      if (!response.ok) {
        // Revert optimistic update on error
        deleteTask(tempId);
        throw new Error("Failed to create task");
      }
      
      const savedTask = await response.json();
      
      // Replace temporary task with the one from the server
      deleteTask(tempId);
      addTask(savedTask);
      
      toast.success("Task created successfully!");
      
      // Focus back on input for rapid task entry
      if (newTaskInputRef.current) {
        newTaskInputRef.current.focus();
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [newTaskText, newTaskDueDate, addTask, deleteTask]);

  // Toggle task completion status - memoized
  const handleToggleComplete = useCallback(async (id: string, completed: boolean) => {
    try {
      // Optimistic update
      updateTask(id, { ...tasks.find(t => t.id === id)!, completed: !completed });
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed: !completed,
        }),
      });
      
      if (!response.ok) {
        // Revert optimistic update on error
        updateTask(id, { ...tasks.find(t => t.id === id)!, completed });
        throw new Error("Failed to update task");
      }
      
      const updatedTask = await response.json();
      // Ensure state matches server response
      updateTask(id, updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task status. Please try again.");
    }
  }, [tasks, updateTask]);

  // Start editing a task - memoized
  const handleStartEdit = useCallback((task: any) => {
    setEditingTaskId(task.id);
    setEditText(task.text);
    setEditDueDate(task.dueDate || undefined);
    
    // Focus on edit input after state update
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
      }
    }, 0);
  }, []);

  // Cancel task editing - memoized
  const handleCancelEdit = useCallback(() => {
    setEditingTaskId(null);
    setEditText("");
    setEditDueDate(undefined);
  }, []);

  // Save edited task - memoized
  const handleSaveEdit = useCallback(async (id: string) => {
    if (!editText.trim()) {
      return;
    }
    
    try {
      // Optimistic update
      const originalTask = tasks.find(t => t.id === id)!;
      updateTask(id, { ...originalTask, text: editText, dueDate: editDueDate });
      setEditingTaskId(null);
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: editText,
          dueDate: editDueDate,
        }),
      });
      
      if (!response.ok) {
        // Revert optimistic update on error
        updateTask(id, originalTask);
        setEditingTaskId(id);
        throw new Error("Failed to update task");
      }
      
      const updatedTask = await response.json();
      // Ensure state matches server response
      updateTask(id, updatedTask);
      toast.success("Task updated successfully!");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task. Please try again.");
    }
  }, [tasks, updateTask, editText, editDueDate]);

  // Delete a task - memoized
  const handleDeleteTask = useCallback(async (id: string) => {
    setIsDeleting(id);
    
    try {
      // Store task for potential recovery
      const taskToDelete = tasks.find(t => t.id === id)!;
      
      // Optimistic update
      deleteTask(id);
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        // Revert optimistic delete on error
        addTask(taskToDelete);
        throw new Error("Failed to delete task");
      }
      
      toast.success("Task deleted successfully!");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  }, [tasks, deleteTask, addTask]);

  // Handle keyboard events for accessibility - memoized
  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      handleSaveEdit(id);
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        // Search filter
        const matchesSearch = task.text.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Status filter
        const matchesStatus = 
          filterStatus === "all" || 
          (filterStatus === "active" && !task.completed) || 
          (filterStatus === "completed" && task.completed);
        
        // Due date filter
        let matchesDue = true;
        if (filterDue !== "all") {
          const today = startOfDay(new Date());
          
          if (task.dueDate) {
            const dueDate = startOfDay(new Date(task.dueDate));
            
            if (filterDue === "today") {
              matchesDue = isToday(dueDate);
            } else if (filterDue === "upcoming") {
              matchesDue = isAfter(dueDate, today);
            } else if (filterDue === "overdue") {
              matchesDue = isBefore(dueDate, today) && !task.completed;
            }
          } else {
            // Tasks without due dates
            matchesDue = filterDue === "upcoming";
          }
        }
        
        return matchesSearch && matchesStatus && matchesDue;
      })
      .sort((a, b) => {
        // Sort by selected criteria
        if (sortBy === "dueDate") {
          // Handle null due dates
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return sortDirection === "asc" ? 1 : -1;
          if (!b.dueDate) return sortDirection === "asc" ? -1 : 1;
          
          return sortDirection === "asc" 
            ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            : new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        } else if (sortBy === "createdAt") {
          return sortDirection === "asc"
            ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        
        return 0;
      });
  }, [tasks, searchQuery, filterStatus, filterDue, sortBy, sortDirection]);

  // Group tasks by date for better visual organization
  const groupedTasks = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    filteredAndSortedTasks.forEach(task => {
      let group = "No Due Date";
      
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const today = startOfDay(new Date());
        
        if (isToday(dueDate)) {
          group = "Today";
        } else if (isTomorrow(dueDate)) {
          group = "Tomorrow";
        } else if (isBefore(dueDate, today)) {
          group = "Overdue";
        } else {
          group = format(dueDate, "EEEE, MMMM d");
        }
      }
      
      if (!groups[group]) {
        groups[group] = [];
      }
      
      groups[group].push(task);
    });
    
    return groups;
  }, [filteredAndSortedTasks]);

  // Determine group order
  const sortedGroups = useMemo(() => {
    const groupOrder = ["Overdue", "Today", "Tomorrow"];
    
    return Object.keys(groupedTasks).sort((a, b) => {
      const aIndex = groupOrder.indexOf(a);
      const bIndex = groupOrder.indexOf(b);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      } else if (aIndex !== -1) {
        return -1;
      } else if (bIndex !== -1) {
        return 1;
      } else if (a === "No Due Date") {
        return 1;
      } else if (b === "No Due Date") {
        return -1;
      } else {
        // Compare dates for other groups
        try {
          const aDate = new Date(a.replace("EEEE, ", ""));
          const bDate = new Date(b.replace("EEEE, ", ""));
          return aDate.getTime() - bDate.getTime();
        } catch (e) {
          return 0;
        }
      }
    });
  }, [groupedTasks]);

  // Function to render due date with appropriate styling
  const renderDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    
    const date = new Date(dueDate);
    const today = startOfDay(new Date());
    
    const isOverdue = isBefore(date, today);
    
    return (
      <div className={`flex items-center text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
        <Clock className="h-3 w-3 mr-1" />
        <span>
          {isToday(date) ? 'Today' : 
           isTomorrow(date) ? 'Tomorrow' : 
           format(date, 'MMM d')}
        </span>
      </div>
    );
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchInputValue("");
    setFilterStatus("all");
    setFilterDue("all");
    setSortBy("dueDate");
    setSortDirection("asc");
    setShowFilters(false);
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || filterStatus !== "all" || filterDue !== "all";

  // Count active filters
  const activeFilterCount = [
    searchQuery ? 1 : 0,
    filterStatus !== "all" ? 1 : 0,
    filterDue !== "all" ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Add Task Form */}
      <form onSubmit={handleCreateTask} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={newTaskInputRef}
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a new task..."
              className="w-full pl-4 pr-10 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={isSubmitting}
              aria-label="New task text"
            />
            {newTaskText && (
              <button
                type="button"
                onClick={() => setNewTaskText("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear input"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <button
            type="button"
            onClick={() => setIsAddingDueDate(!isAddingDueDate)}
            className={`p-2 rounded-md border ${isAddingDueDate ? 'border-primary bg-primary/10' : 'border-input'} hover:bg-muted transition-colors`}
            aria-label="Add due date"
          >
            <Calendar size={16} className={isAddingDueDate ? 'text-primary' : 'text-muted-foreground'} />
          </button>
          
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            disabled={isSubmitting || !newTaskText.trim()}
            aria-label="Add task"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <Plus size={16} />
            )}
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
        
        {isAddingDueDate && (
          <div className="flex items-center gap-2 pl-4 animate-in slide-in-from-top duration-200">
            <input
              type="date"
              value={newTaskDueDate || ""}
              onChange={(e) => setNewTaskDueDate(e.target.value || undefined)}
              className="px-3 py-1.5 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Task due date"
            />
            <button
              type="button"
              onClick={() => {
                setIsAddingDueDate(false);
                setNewTaskDueDate(undefined);
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear due date"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </form>

      {/* Filters Toggle and Search */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              placeholder="Search tasks..."
              className="pl-10 pr-4 py-2 w-full rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Search tasks"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-md border ${activeFilterCount > 0 ? 'border-primary bg-primary/10' : 'border-input'} hover:bg-muted transition-colors relative`}
            aria-label="Show filters"
            aria-expanded={showFilters}
          >
            <Filter size={16} className={activeFilterCount > 0 ? 'text-primary' : 'text-muted-foreground'} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
        
        {/* Expandable Filters */}
        {showFilters && (
          <div 
            ref={filtersRef}
            className="p-4 border rounded-md bg-card shadow-sm space-y-4 animate-in slide-in-from-top duration-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Filters</h3>
              <button
                onClick={resetFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
                aria-label="Reset all filters"
              >
                Reset all
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Filter by status"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium">Due Date</label>
                <select
                  value={filterDue}
                  onChange={(e) => setFilterDue(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Filter by due date"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "dueDate" | "createdAt")}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Sort by"
                >
                  <option value="dueDate">Due Date</option>
                  <option value="createdAt">Created Date</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium">Sort Direction</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSortDirection("asc")}
                    className={`flex-1 px-3 py-2 rounded-md border ${
                      sortDirection === "asc" ? "border-primary bg-primary/10" : "border-input"
                    } hover:bg-muted transition-colors flex items-center justify-center gap-1`}
                    aria-label="Sort ascending"
                    aria-pressed={sortDirection === "asc"}
                  >
                    <ChevronUp size={16} />
                    <span>Asc</span>
                  </button>
                  
                  <button
                    onClick={() => setSortDirection("desc")}
                    className={`flex-1 px-3 py-2 rounded-md border ${
                      sortDirection === "desc" ? "border-primary bg-primary/10" : "border-input"
                    } hover:bg-muted transition-colors flex items-center justify-center gap-1`}
                    aria-label="Sort descending"
                    aria-pressed={sortDirection === "desc"}
                  >
                    <ChevronDown size={16} />
                    <span>Desc</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task List */}
      {filteredAndSortedTasks.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No tasks found</h3>
          <p className="text-muted-foreground mb-6">
            {hasActiveFilters
              ? "Try adjusting your filters to see more tasks." 
              : "Add your first task to get started."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(group => (
            <TaskGroup
              key={group}
              group={group}
              tasks={groupedTasks[group]}
              isOverdue={group === "Overdue"}
              isToday={group === "Today"}
              editingTaskId={editingTaskId}
              editText={editText}
              setEditText={setEditText}
              editDueDate={editDueDate}
              setEditDueDate={setEditDueDate}
              editInputRef={editInputRef}
              handleKeyDown={handleKeyDown}
              handleToggleComplete={handleToggleComplete}
              handleStartEdit={handleStartEdit}
              handleSaveEdit={handleSaveEdit}
              handleCancelEdit={handleCancelEdit}
              handleDeleteTask={handleDeleteTask}
              isDeleting={isDeleting}
              showTaskActions={showTaskActions}
              setShowTaskActions={setShowTaskActions}
              taskActionsRef={taskActionsRef}
              renderDueDate={renderDueDate}
              virtualizeItems={virtualizeGroups && groupedTasks[group].length > 10}
            />
          ))}
        </div>
      )}
    </div>
  );
}; 