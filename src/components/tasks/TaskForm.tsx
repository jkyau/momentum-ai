"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Loader2, 
  Save, 
  X,
  RepeatIcon
} from "lucide-react";
import { format, addDays } from "date-fns";
import { useTaskStore } from "@/lib/store";

interface TaskFormProps {
  existingTask?: any;
  onClose?: () => void;
}

export const TaskForm = ({ existingTask, onClose }: TaskFormProps) => {
  const router = useRouter();
  const { addTask, updateTask } = useTaskStore();
  const [text, setText] = useState(existingTask?.text || "");
  const [priority, setPriority] = useState(existingTask?.priority || "MEDIUM");
  const [dueDate, setDueDate] = useState<string | null>(
    existingTask?.dueDate ? format(new Date(existingTask.dueDate), "yyyy-MM-dd") : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Calendar integration fields
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [addToCalendar, setAddToCalendar] = useState(existingTask?.addToCalendar || false);
  const [eventDuration, setEventDuration] = useState(existingTask?.eventDuration || 60);
  const [eventTime, setEventTime] = useState(existingTask?.eventTime || "09:00");
  const [reminderMinutes, setReminderMinutes] = useState(existingTask?.reminderMinutes || 30);
  
  // Add state for recurrence
  const [isRecurring, setIsRecurring] = useState(existingTask?.recurrence || false);
  const [recurrencePattern, setRecurrencePattern] = useState(existingTask?.recurrencePattern || 'DAILY');
  const [recurrenceCount, setRecurrenceCount] = useState(existingTask?.recurrenceCount || 5);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | null>(
    existingTask?.recurrenceEndDate ? format(new Date(existingTask.recurrenceEndDate), "yyyy-MM-dd") : null
  );
  
  // Check if calendar is connected
  useEffect(() => {
    const checkCalendarConnection = async () => {
      try {
        const response = await fetch('/api/integrations/google-calendar');
        
        if (response.ok) {
          const data = await response.json();
          setIsCalendarConnected(data.connected);
          
          // If calendar is not connected, disable addToCalendar
          if (!data.connected) {
            setAddToCalendar(false);
          }
        }
      } catch (error) {
        console.error('Error checking calendar connection:', error);
      }
    };
    
    checkCalendarConnection();
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      toast.error("Task text is required");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const taskData = {
        text,
        priority,
        dueDate,
        // Calendar integration fields
        addToCalendar: isCalendarConnected ? addToCalendar : false,
        eventDuration: addToCalendar ? eventDuration : null,
        eventTime: addToCalendar ? eventTime : null,
        reminderMinutes: addToCalendar ? reminderMinutes : null,
        // Recurrence fields
        isRecurring,
        recurrencePattern,
        recurrenceCount,
        recurrenceEndDate
      };
      
      if (existingTask) {
        // Update existing task
        const response = await fetch(`/api/tasks/${existingTask.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(taskData),
        });
        
        if (!response.ok) {
          throw new Error("Failed to update task");
        }
        
        const updatedTask = await response.json();
        updateTask(existingTask.id, updatedTask);
        toast.success("Task updated successfully!");
      } else {
        // Create new task
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(taskData),
        });
        
        if (!response.ok) {
          throw new Error("Failed to create task");
        }
        
        const task = await response.json();
        addTask(task);
        toast.success("Task created successfully!");
      }
      
      // Close form or redirect
      if (onClose) {
        onClose();
      } else {
        router.push("/dashboard/tasks");
      }
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="text" className="block text-sm font-medium mb-1">
          Task <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="text"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
          required
          aria-required="true"
        />
      </div>
      
      <div>
        <label htmlFor="priority" className="block text-sm font-medium mb-1">
          Priority
        </label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          aria-label="Task priority"
        >
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>
      
      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium mb-1">
          Due Date
        </label>
        <div className="relative">
          <input
            id="dueDate"
            type="date"
            value={dueDate || ""}
            onChange={(e) => setDueDate(e.target.value || null)}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            aria-label="Task due date"
          />
          <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
        </div>
      </div>
      
      {/* Calendar Integration Section with accessibility improvements */}
      {isCalendarConnected && dueDate && (
        <div className="border-t pt-4 mt-4" role="region" aria-labelledby="calendar-integration-heading">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-primary" aria-hidden="true" />
              <span id="calendar-integration-heading" className="font-medium">Google Calendar</span>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="addToCalendar"
                checked={addToCalendar}
                onChange={(e) => setAddToCalendar(e.target.checked)}
                className="sr-only"
                aria-labelledby="addToCalendarLabel"
              />
              <label 
                htmlFor="addToCalendar" 
                className="relative inline-flex items-center cursor-pointer"
                id="addToCalendarLabel"
              >
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-2 text-sm font-medium">
                  Add to Calendar
                </span>
              </label>
            </div>
          </div>
          
          {addToCalendar && (
            <div className="space-y-3">
              <div>
                <label htmlFor="eventTime" className="block text-sm font-medium mb-1">
                  Time
                </label>
                <div className="relative">
                  <input
                    id="eventTime"
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                  <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              
              <div>
                <label htmlFor="eventDuration" className="block text-sm font-medium mb-1">
                  Duration
                </label>
                <select
                  id="eventDuration"
                  value={eventDuration}
                  onChange={(e) => setEventDuration(Number(e.target.value))}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="240">4 hours</option>
                  <option value="480">All day (8 hours)</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="reminderMinutes" className="block text-sm font-medium mb-1">
                  Reminder
                </label>
                <select
                  id="reminderMinutes"
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                >
                  <option value="0">No reminder</option>
                  <option value="5">5 minutes before</option>
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                  <option value="60">1 hour before</option>
                  <option value="1440">1 day before</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Recurrence Section with accessibility improvements */}
      {addToCalendar && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <RepeatIcon className="h-5 w-5 mr-2 text-primary" aria-hidden="true" />
              <span className="font-medium">Recurring Event</span>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="sr-only peer"
                aria-labelledby="isRecurringLabel"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-2 text-sm font-medium" id="isRecurringLabel">
                Make Recurring
              </span>
            </label>
          </div>
          
          {isRecurring && (
            <div className="space-y-3">
              <div>
                <label htmlFor="recurrencePattern" className="block text-sm font-medium mb-1">
                  Repeat
                </label>
                <select
                  id="recurrencePattern"
                  value={recurrencePattern}
                  onChange={(e) => setRecurrencePattern(e.target.value)}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="recurrenceEndType" className="block text-sm font-medium mb-1">
                    End
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="endAfterCount"
                      name="recurrenceEndType"
                      checked={!recurrenceEndDate}
                      onChange={() => setRecurrenceEndDate(null)}
                      className="h-4 w-4 text-primary"
                    />
                    <label htmlFor="endAfterCount" className="text-sm">After</label>
                    <input
                      type="number"
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 1)}
                      min="1"
                      max="30"
                      disabled={!!recurrenceEndDate}
                      className="w-16 p-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm">occurrences</span>
                  </div>
                </div>
                
                <div>
                  <div className="h-6"></div> {/* Spacer to align with label in first column */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="endByDate"
                      name="recurrenceEndType"
                      checked={!!recurrenceEndDate}
                      onChange={() => setRecurrenceEndDate(format(addDays(new Date(), 30), "yyyy-MM-dd"))}
                      className="h-4 w-4 text-primary"
                    />
                    <label htmlFor="endByDate" className="text-sm">On</label>
                    <input
                      type="date"
                      value={recurrenceEndDate || ""}
                      onChange={(e) => setRecurrenceEndDate(e.target.value || null)}
                      disabled={!recurrenceEndDate}
                      min={dueDate || undefined}
                      className="flex-1 p-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Form buttons with accessibility improvements */}
      <div className="flex justify-end space-x-2 pt-4">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
            aria-label="Cancel task creation"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="ml-1">Cancel</span>
          </button>
        )}
        
        <button
          type="submit"
          disabled={isSubmitting || !text.trim()}
          className="flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          aria-label={existingTask ? "Update task" : "Create task"}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4 mr-1" aria-hidden="true" />
          )}
          {existingTask ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}; 