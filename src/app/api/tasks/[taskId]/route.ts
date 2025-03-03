import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema for task update validation
const taskUpdateSchema = z.object({
  text: z.string().min(1, "Task text is required").optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  project: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  completed: z.boolean().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const task = await db.task.findUnique({
      where: {
        id: params.taskId,
        userId,
      },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASK_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validationResult = taskUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return new NextResponse(JSON.stringify(validationResult.error), {
        status: 400,
      });
    }

    const { text, priority, project, dueDate, completed } = validationResult.data;

    // Check if task exists and belongs to user
    const existingTask = await db.task.findUnique({
      where: {
        id: params.taskId,
        userId,
      },
    });

    if (!existingTask) {
      return new NextResponse("Task not found", { status: 404 });
    }

    // Optional: Add AI processing for task text enhancement if text is updated
    let cleanedText = undefined;
    if (text && text !== existingTask.text) {
      try {
        // This could be an AI service call to enhance the task text
        // For now, we'll just use the original text
        cleanedText = text;
      } catch (aiError) {
        console.error("[AI_PROCESSING_ERROR]", aiError);
        // Continue without AI enhancement if it fails
      }
    }

    const updatedTask = await db.task.update({
      where: {
        id: params.taskId,
      },
      data: {
        text,
        cleanedText: text ? cleanedText : undefined,
        priority,
        project,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        completed,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("[TASK_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if task exists and belongs to user
    const existingTask = await db.task.findUnique({
      where: {
        id: params.taskId,
        userId,
      },
    });

    if (!existingTask) {
      return new NextResponse("Task not found", { status: 404 });
    }

    // Delete the task
    await db.task.delete({
      where: {
        id: params.taskId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[TASK_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 