import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { Task } from "@/lib/store";

interface TaskDetailPageProps {
  params: Promise<{
    taskId: string;
  }>;
}

async function getTask(taskId: string, userId: string) {
  try {
    const task = await db.task.findUnique({
      where: {
        id: taskId,
        userId,
      },
    });
    
    return task;
  } catch (error) {
    console.error("Error fetching task:", error);
    return null;
  }
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  const { taskId } = await params;
  const task = await getTask(taskId, userId);
  
  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Task Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The task you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <a 
          href="/dashboard/tasks" 
          className="text-primary hover:underline"
        >
          Return to Tasks
        </a>
      </div>
    );
  }
  
  // Ensure the task priority is one of the expected values
  const typedTask = {
    ...task,
    priority: task.priority as "HIGH" | "MEDIUM" | "LOW",
    dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  } as Task;
  
  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Task Details</h1>
        <a 
          href="/dashboard/tasks" 
          className="text-primary hover:underline"
        >
          Back to Tasks
        </a>
      </div>
      
      <TaskDetail task={typedTask} />
    </div>
  );
} 