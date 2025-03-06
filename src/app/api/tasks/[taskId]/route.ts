import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from "@/lib/services/googleCalendar";

// Schema for task update validation
const taskUpdateSchema = z.object({
  text: z.string().min(1, "Task text is required").optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  project: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  completed: z.boolean().optional(),
  // Calendar integration fields
  addToCalendar: z.boolean().optional(),
  eventDuration: z.number().optional().nullable(),
  eventTime: z.string().optional().nullable(),
  reminderMinutes: z.number().optional().nullable()
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    
    const { taskId } = await params;
    
    const task = await db.task.findUnique({
      where: {
        id: taskId,
        userId
      },
      include: {
        calendarEvents: true
      }
    });
    
    if (!task) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASK_GET]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    
    const { taskId } = await params;
    
    // Check if task exists and belongs to user
    const existingTask = await db.task.findUnique({
      where: {
        id: taskId,
        userId
      },
      include: {
        calendarEvents: true
      }
    });
    
    if (!existingTask) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }
    
    const body = await req.json();
    const validationResult = taskUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid task data", errors: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const { 
      text, 
      priority, 
      project, 
      dueDate, 
      completed
    } = validationResult.data;
    
    // Update task in database
    const updatedTask = await db.task.update({
      where: {
        id: taskId
      },
      data: {
        text,
        priority,
        project,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        completed
      }
    });
    
    // Handle calendar integration
    try {
      // Check if user has Google Calendar integration
      const integration = await db.userIntegration.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: 'google_calendar'
          }
        }
      });
      
      if (integration && integration.isActive) {
        const hasCalendarEvent = existingTask.calendarEvents.length > 0;
        const shouldHaveCalendarEvent = existingTask.addToCalendar && updatedTask.dueDate;
        
        if (shouldHaveCalendarEvent) {
          if (hasCalendarEvent) {
            // Update existing calendar event
            await updateCalendarEvent(userId, updatedTask);
          } else {
            // Create new calendar event
            await createCalendarEvent(
              userId, 
              updatedTask.id, 
              updatedTask.text, 
              updatedTask.dueDate ? updatedTask.dueDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0], 
              updatedTask.eventTime || '09:00', 
              updatedTask.eventDuration || 60, 
              updatedTask.reminderMinutes || 30
            );
          }
        } else if (hasCalendarEvent && existingTask.addToCalendar === false) {
          // Delete calendar event if addToCalendar was turned off
          await deleteCalendarEvent(userId, taskId);
        }
      }
    } catch (calendarError) {
      console.error("Error updating calendar event:", calendarError);
      // Continue with task update even if calendar event update fails
    }
    
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { message: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    
    const { taskId } = await params;
    
    // Check if task exists and belongs to user
    const task = await db.task.findUnique({
      where: {
        id: taskId,
        userId
      }
    });
    
    if (!task) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }
    
    // Try to delete any associated calendar event
    try {
      await deleteCalendarEvent(userId, taskId);
    } catch (calendarError) {
      // Continue with task deletion even if calendar event deletion fails
      console.error("[CALENDAR_DELETE_ERROR]", calendarError);
    }
    
    // Delete the task
    await db.task.delete({
      where: {
        id: taskId
      }
    });
    
    return NextResponse.json(
      { message: "Task deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[TASK_DELETE]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
} 