import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema for task creation/update validation
const taskSchema = z.object({
  text: z.string().min(1, "Task text is required"),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  project: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  completed: z.boolean().default(false),
});

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const tasks = await db.task.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[TASKS_GET]", error);
    return NextResponse.json(
      { message: "Failed to fetch tasks", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user exists in the database
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    // If user doesn't exist, create the user with minimal information
    if (!user) {
      try {
        await db.user.create({
          data: {
            id: userId,
            name: "User",
            email: `${userId}@example.com`, // Placeholder email
          },
        });
      } catch (userError) {
        console.error("[USER_CREATE_ERROR]", userError);
        return NextResponse.json(
          { message: "Failed to create user record", error: userError instanceof Error ? userError.message : String(userError) },
          { status: 500 }
        );
      }
    }

    const body = await req.json();
    const validatedFields = taskSchema.safeParse(body);

    if (!validatedFields.success) {
      return NextResponse.json(
        { message: "Invalid request data", errors: validatedFields.error.flatten() },
        { status: 400 }
      );
    }

    const task = await db.task.create({
      data: {
        userId,
        text: validatedFields.data.text,
        priority: validatedFields.data.priority,
        project: validatedFields.data.project,
        dueDate: validatedFields.data.dueDate,
        completed: validatedFields.data.completed,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASKS_POST]", error);
    return NextResponse.json(
      { message: "Failed to create task", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 