import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { createCalendarEvent } from "@/lib/services/googleCalendar";
import { mockAuth } from "@/lib/mock-auth";

// Schema for task validation
const taskSchema = z.object({
  text: z.string().min(1, "Task text is required"),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  project: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  completed: z.boolean().default(false),
  // Calendar integration fields
  addToCalendar: z.boolean().default(false),
  eventDuration: z.number().optional().nullable(),
  eventTime: z.string().optional().nullable(),
  reminderMinutes: z.number().optional().nullable()
});

export async function GET(req: Request) {
  try {
    // Try to get the user ID from Clerk auth
    const clerkAuth = await auth();
    
    // If Clerk auth fails, use mock auth
    const { userId } = clerkAuth.userId ? clerkAuth : await mockAuth();
    
    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    
    const url = new URL(req.url);
    const completed = url.searchParams.get("completed");
    
    const tasks = await db.task.findMany({
      where: {
        userId,
        ...(completed !== null
          ? { completed: completed === "true" }
          : {})
      },
      orderBy: [
        { completed: "asc" },
        { priority: "asc" },
        { createdAt: "desc" }
      ]
    });
    
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { message: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Try to get the user ID from Clerk auth
    const clerkAuth = await auth();
    
    // If Clerk auth fails, use mock auth
    const { userId } = clerkAuth.userId ? clerkAuth : await mockAuth();
    
    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { text, priority, dueDate, addToCalendar, eventTime, eventDuration, reminderMinutes } = body;
    
    if (!text) {
      return NextResponse.json(
        { message: "Task text is required" },
        { status: 400 }
      );
    }
    
    // Create task in database
    const task = await db.task.create({
      data: {
        userId,
        text,
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });
    
    // If calendar integration is enabled, create calendar event
    if (addToCalendar && dueDate && eventTime) {
      try {
        await createCalendarEvent(
          userId,
          task.id,
          text,
          dueDate,
          eventTime,
          eventDuration || 60,
          reminderMinutes || 30
        );
        
        // Fetch the task with calendar event
        const taskWithCalendarEvent = await db.task.findUnique({
          where: { id: task.id }
        });
        
        return NextResponse.json(taskWithCalendarEvent);
      } catch (error) {
        console.error("Error creating calendar event:", error);
        // Continue without calendar event
      }
    }
    
    return NextResponse.json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { message: "Failed to create task" },
      { status: 500 }
    );
  }
} 